// src/ingestNamaste.js
const fs = require('fs');
const csv = require('csv-parser');
const { db, init } = require('./db');
const { v4: uuidv4 } = require('uuid');

init();

function ingest(csvPath, namasteVersion = '2025-01') {
  return new Promise((resolve, reject) => {
    const concepts = [];
    let rowCount = 0;

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        console.log(`📥 Processing row ${rowCount}:`, row);

        // Map your CSV columns
        const code = (row.NAMASTE_Code || '').trim();
        const term = (row.Treatment || '').trim();
        const description = (row.Name || '').trim();
        const icd_tm2 = (row.ICD11_Code || '').trim();
        const icd_bio = ''; // not in CSV

        if (!code) {
          console.warn(`⚠️ Skipping row ${rowCount}, no NAMASTE_Code`);
          return;
        }

        // Push into FHIR concept
        concepts.push({ code, display: term, definition: description });
        const created_at = new Date().toISOString();

        // Insert into codes table
        db.run(
          `INSERT INTO codes (system, code, display, description, namaste_version, metadata_json, created_at) VALUES (?,?,?,?,?,?,?)`,
          [
            'http://namaste.ayush.gov.in/CodeSystem/NAMASTE',
            code,
            term,
            description,
            namasteVersion,
            JSON.stringify(row),
            created_at,
          ],
          (err) => {
            if (err) {
              console.error(`❌ Error inserting code ${code}:`, err.message);
            } else {
              console.log(`✅ Inserted code: ${code} (${term})`);
            }
          }
        );

        // Insert mapping if ICD11 present
        if (icd_tm2) {
          db.run(
            `INSERT INTO concept_maps (source_system, target_system, source_code, target_code, equivalence, comment, provenance, created_at) VALUES (?,?,?,?,?,?,?,?)`,
            [
              'http://namaste.ayush.gov.in/CodeSystem/NAMASTE',
              'http://id.who.int/icd/entity',
              code,
              icd_tm2,
              'equivalent',
              'ingested from CSV',
              JSON.stringify({ source: 'ingest' }),
              created_at,
            ],
            (err) => {
              if (err) {
                console.error(`❌ Error inserting map for ${code}:`, err.message);
              } else {
                console.log(`🔗 Mapped ${code} → ICD11 ${icd_tm2}`);
              }
            }
          );
        }
      })
      .on('end', () => {
        console.log(`📊 Finished parsing CSV. Total rows: ${rowCount}`);

        // Create FHIR CodeSystem entry
        const cs = {
          resourceType: 'CodeSystem',
          id: 'NAMASTE',
          url: 'http://namaste.ayush.gov.in/CodeSystem/NAMASTE',
          version: namasteVersion,
          name: 'NAMASTE',
          status: 'active',
          content: 'complete',
          concept: concepts,
        };
        const created_at = new Date().toISOString();
        const id = uuidv4();

        db.run(
          `INSERT INTO code_systems (id,uri,name,version,fhir_json,created_at) VALUES (?,?,?,?,?,?)`,
          [id, cs.url, cs.name, cs.version, JSON.stringify(cs), created_at],
          (err) => {
            if (err) return reject(err);
            console.log(`📥 Inserted CodeSystem NAMASTE (id=${id}) with ${concepts.length} concepts`);
            resolve({ codeSystem: cs, id });
          }
        );
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

// Run as standalone script
if (require.main === module) {
  const csvPath = process.argv[2] || './namaste-sample.csv';
  ingest(csvPath)
    .then((res) => {
      console.log('🎉 Ingest complete. CodeSystem id:', res.id);
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Error during ingest:', err);
      process.exit(1);
    });
}

module.exports = { ingest };
