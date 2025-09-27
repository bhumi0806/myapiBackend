// // src/index.js
// import cors from "cors";
// require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const { db, init } = require('./db');
// const { v4: uuidv4 } = require('uuid');
// // const { authMiddleware } = require('./auth'); // We'll replace this temporarily
// const { searchICD, getEntity } = require('./icdClient');

// init();

// const app = express();
// app.use(bodyParser.json({ limit: '5mb' }));

// /**
//  * Temporary token verification middleware for prototype/demo
//  * Accepts any Bearer token and sets a mock user
//  */
// function verifyToken(req, res, next) {
//   const authHeader = req.headers['authorization'];
//   if (!authHeader) return res.status(401).json({ error: 'No token provided' });
//   const token = authHeader.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'Invalid token' });

//   // TEMPORARY: set mock user info
//   req.abha = { id: 'demo-user' };
//   next();
// }

// // Apply middleware to /fhir routes
// app.use('/fhir', verifyToken);

// /** 
//  * GET NAMASTE CodeSystem
//  */
// app.get('/fhir/CodeSystem/NAMASTE', async (req, res) => {
//   db.get(
//     `SELECT fhir_json FROM code_systems WHERE uri = ? ORDER BY created_at DESC LIMIT 1`,
//     ['http://namaste.ayush.gov.in/CodeSystem/NAMASTE'],
//     (err, row) => {
//       if (err) return res.status(500).json({ error: err.message });
//       if (!row) return res.status(404).json({ error: 'CodeSystem not found, run ingest' });
//       return res.json(JSON.parse(row.fhir_json));
//     }
//   );
// });

// /** 
//  * GET ConceptMap NAMASTE -> ICD11
//  */
// app.get('/fhir/ConceptMap/NAMASTE-to-ICD11', (req, res) => {
//   db.all(
//     `SELECT * FROM concept_maps WHERE source_system = ?`,
//     ['http://namaste.ayush.gov.in/CodeSystem/NAMASTE'],
//     (err, rows) => {
//       if (err) return res.status(500).json({ error: err.message });
//       const map = {
//         resourceType: 'ConceptMap',
//         id: 'NAMASTE-to-ICD11',
//         url: 'http://namaste.ayush.gov.in/ConceptMap/NAMASTE-to-ICD11',
//         sourceUri: 'http://namaste.ayush.gov.in/CodeSystem/NAMASTE',
//         targetUri: 'http://id.who.int/icd/entity',
//         group: [
//           {
//             source: 'http://namaste.ayush.gov.in/CodeSystem/NAMASTE',
//             target: 'http://id.who.int/icd/entity',
//             element: rows.map((r) => ({
//               code: r.source_code,
//               target: [{ code: r.target_code, equivalence: r.equivalence, comment: r.comment }],
//             })),
//           },
//         ],
//       };
//       res.json(map);
//     }
//   );
// });

// /** 
//  * Autocomplete search endpoint
//  */
// app.get('/autocomplete', async (req, res) => {
//   const q = (req.query.q || '').trim();
//   if (!q) return res.json([]);
//   db.all(
//     `SELECT code, display, description FROM codes WHERE display LIKE ? LIMIT 20`,
//     [`%${q}%`],
//     async (err, rows) => {
//       if (err) return res.status(500).json({ error: err.message });
//       const results = rows.map((r) => ({
//         system: 'http://namaste.ayush.gov.in/CodeSystem/NAMASTE',
//         code: r.code,
//         display: r.display,
//         description: r.description,
//       }));

//       try {
//         const icdResp = await searchICD(q);
//         if (icdResp && icdResp.destinationEntities) {
//           icdResp.destinationEntities.slice(0, 10).forEach((e) => {
//             results.push({
//               system: 'http://id.who.int/icd/entity',
//               code: e.code || e['@id'] || e.someId,
//               display: e.title && (e.title['@value'] || e.title),
//             });
//           });
//         }
//       } catch (e) {
//         console.warn('WHO ICD search failed (maybe no key configured)', e.message || e);
//       }

//       res.json(results.slice(0, 40));
//     }
//   );
// });

// /** 
//  * Translate NAMASTE <-> ICD11
//  * Supports POST for API calls, optional GET for browser testing
//  */
// app.post('/translate', (req, res) => {
//   const { sourceSystem, code, targetSystem } = req.body;
//   if (!sourceSystem || !code || !targetSystem)
//     return res.status(400).json({ error: 'Missing sourceSystem/code/targetSystem' });

//   db.all(
//     `SELECT target_code, equivalence, comment FROM concept_maps WHERE source_system = ? AND source_code = ? AND target_system = ?`,
//     [sourceSystem, code, targetSystem],
//     (err, rows) => {
//       if (err) return res.status(500).json({ error: err.message });
//       if (!rows || rows.length === 0) return res.json({ result: [] });
//       return res.json({
//         result: rows.map((r) => ({ code: r.target_code, equivalence: r.equivalence, comment: r.comment })),
//       });
//     }
//   );
// });

// // Optional GET for testing in browser: /translate?sourceSystem=...&code=...&targetSystem=...
// app.get('/translate', (req, res) => {
//   const { sourceSystem, code, targetSystem } = req.query;
//   if (!sourceSystem || !code || !targetSystem)
//     return res.status(400).json({ error: 'Missing query parameters: sourceSystem/code/targetSystem' });

//   db.all(
//     `SELECT target_code, equivalence, comment FROM concept_maps WHERE source_system = ? AND source_code = ? AND target_system = ?`,
//     [sourceSystem, code, targetSystem],
//     (err, rows) => {
//       if (err) return res.status(500).json({ error: err.message });
//       if (!rows || rows.length === 0) return res.json({ result: [] });
//       return res.json({
//         result: rows.map((r) => ({ code: r.target_code, equivalence: r.equivalence, comment: r.comment })),
//       });
//     }
//   );
// });

// /** 
//  * FHIR Bundle upload endpoint
//  * Accepts any Bearer token for prototype
//  */
// app.post('/fhir/Bundle', (req, res) => {
//   const bundle = req.body;
//   if (!bundle || bundle.resourceType !== 'Bundle') return res.status(400).json({ error: 'Expected FHIR Bundle' });

//   const id = uuidv4();
//   const created_at = new Date().toISOString();

//   db.run(
//     `INSERT INTO bundles (id, abha_id, bundle_json, created_at) VALUES (?,?,?,?)`,
//     [id, req.abha.id, JSON.stringify(bundle), created_at],
//     (err) => {
//       if (err) return res.status(500).json({ error: err.message });

//       // Create simple Provenance
//       const provId = uuidv4();
//       const prov = {
//         resourceType: 'Provenance',
//         id: provId,
//         target: [{ reference: `Bundle/${id}` }],
//         recorded: created_at,
//         agent: [{ who: { identifier: { system: 'https://abdm.gov.in/abha', value: req.abha.id } } }],
//         reason: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-PurposeOfUse', code: 'AUDIT' }] }],
//       };

//       db.run(
//         `INSERT INTO provenance (id, target_id, agent, recorded, data) VALUES (?,?,?,?,?)`,
//         [provId, id, req.abha.id, created_at, JSON.stringify(prov)],
//         (err2) => {
//           if (err2) return res.status(500).json({ error: err2.message });
//           return res.status(201).json({ bundleId: id, provenanceId: provId });
//         }
//       );
//     }
//   );
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Terminology microservice listening on ${PORT}`);
//   console.log(`Try: GET http://localhost:${PORT}/autocomplete?q=fever`);
//   console.log(`Try: POST http://localhost:${PORT}/translate with body { sourceSystem, code, targetSystem }`);
// });
// src/index.js
import express from "express";
import cors from "cors";

const app = express();
const PORT = 3000;

// Enable CORS for all requests
app.use(cors());

// Enable JSON parsing
app.use(express.json());

// --- Dummy data for testing ---
const codeSystem = {
  resourceType: "CodeSystem",
  id: "NAMASTE",
  url: "http://namaste.ayush.gov.in/CodeSystem/NAMASTE",
  version: "2025-01",
  name: "NAMASTE",
  status: "active",
  content: "complete",
  concept: [
    { code: "NAM-0001", display: "Herbal Decoction", definition: "Amit Sharma" },
    { code: "NAM-0011", display: "Herbal Powder", definition: "Deepak Kumar" },
    { code: "NAM-0016", display: "Herbal Tea", definition: "Kavita Jain" },
    { code: "NAM-0020", display: "Unani Herbal Mix", definition: "Komal Arora" },
  ],
};

const conceptMap = {
  resourceType: "ConceptMap",
  id: "NAMASTE-to-ICD11",
  url: "http://namaste.ayush.gov.in/ConceptMap/NAMASTE-to-ICD11",
  sourceUri: "http://namaste.ayush.gov.in/CodeSystem/NAMASTE",
  targetUri: "http://id.who.int/icd/entity",
  group: [
    {
      source: "http://namaste.ayush.gov.in/CodeSystem/NAMASTE",
      target: "http://id.who.int/icd/entity",
      element: [
        { code: "NAM-0001", target: [{ code: "1A00", equivalence: "equivalent", comment: "ingested from CSV" }] },
        { code: "NAM-0011", target: [{ code: "1A0A", equivalence: "equivalent", comment: "ingested from CSV" }] },
        { code: "NAM-0016", target: [{ code: "1A0F", equivalence: "equivalent", comment: "ingested from CSV" }] },
        { code: "NAM-0020", target: [{ code: "1A13", equivalence: "equivalent", comment: "ingested from CSV" }] },
      ],
    },
  ],
};

// --- Routes ---
app.get("/autocomplete", (req, res) => {
  const q = req.query.q?.toLowerCase();
  const results = codeSystem.concept.filter(c => c.display.toLowerCase().includes(q));
  res.json({ value: results, Count: results.length });
});

app.get("/fhir/CodeSystem/NAMASTE", (req, res) => {
  // Simple token check
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token provided" });

  res.json(codeSystem);
});

app.get("/fhir/ConceptMap/NAMASTE-to-ICD11", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token provided" });

  res.json(conceptMap);
});

app.post("/translate", (req, res) => {
  const { system, code, targetSystem, sourceSystem } = req.body;

  // Only forward translation supported for now
  if (!system || !code || !targetSystem) {
    return res.status(400).json({ error: "Missing system/code/targetSystem" });
  }

  const map = conceptMap.group[0].element.find(e => e.code === code);
  const result = map?.target || [];
  res.json({ result });
});

// --- Start server ---
app.listen(PORT, () => console.log(`NAMASTE backend running on port ${PORT}`));
