// src/checkDb.js
const { db, init } = require('./db');

init();

function query(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

(async () => {
  try {
    console.log('Codes table:');
    let codes = await query('SELECT code, display, description FROM codes;');
    console.log(codes);

    console.log('\nConcept Maps table:');
    let maps = await query('SELECT source_code, target_code FROM concept_maps;');
    console.log(maps);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();