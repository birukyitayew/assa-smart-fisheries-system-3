/**
 * Idempotent migrations for existing SQLite databases.
 */
const fs = require('fs');
const path = require('path');

function runMigrations(db) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  }

  const cols = db.prepare('PRAGMA table_info(fishing_zones)').all().map((c) => c.name);
  if (!cols.includes('geo_polygon')) {
    db.exec('ALTER TABLE fishing_zones ADD COLUMN geo_polygon TEXT');
  }

  const posCols = db.prepare('PRAGMA table_info(boat_positions)').all().map((c) => c.name);
  if (!posCols.includes('trip_id')) {
    db.exec('ALTER TABLE boat_positions ADD COLUMN trip_id INTEGER REFERENCES boat_trips(id)');
  }
}

module.exports = { runMigrations };
