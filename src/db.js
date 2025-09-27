// src/db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./terminology.db');

function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS code_systems (
      id TEXT PRIMARY KEY, uri TEXT, name TEXT, version TEXT, fhir_json TEXT, created_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, system TEXT, code TEXT, display TEXT, description TEXT,
      namaste_version TEXT, metadata_json TEXT, created_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS concept_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source_system TEXT, target_system TEXT,
      source_code TEXT, target_code TEXT, equivalence TEXT, comment TEXT, provenance TEXT, created_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS bundles (
      id TEXT PRIMARY KEY, abha_id TEXT, bundle_json TEXT, created_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS provenance (
      id TEXT PRIMARY KEY, target_id TEXT, agent TEXT, recorded TEXT, data JSON
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, resource_type TEXT, resource_id TEXT, version TEXT, created_at TEXT
    )`);
  });
}
module.exports = { db, init };
