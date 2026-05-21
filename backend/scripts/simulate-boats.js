/**
 * Demo boat position simulator — nudges fleet GPS every 10s for boats on ACTIVE trips.
 * Run: npm run simulate:boats (with backend running)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.join(__dirname, '../src/database/assa.db');

const STATUSES = ['FISHING', 'FISHING', 'RETURNING', 'FISHING'];
const CENTER = { lat: 11.75, lng: 37.35 };

function nudge(lat, lng) {
  return {
    lat: lat + (Math.random() - 0.5) * 0.008,
    lng: lng + (Math.random() - 0.5) * 0.008,
  };
}

function tick(db) {
  const boats = db.prepare(`
    SELECT b.id as boat_id, t.id as trip_id, bp.lat, bp.lng, bp.status
    FROM boat_trips t
    JOIN boats b ON b.id = t.boat_id
    LEFT JOIN boat_positions bp ON bp.id = (
      SELECT id FROM boat_positions WHERE boat_id = b.id ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE t.status = 'ACTIVE'
    LIMIT 12
  `).all();

  if (boats.length === 0) {
    console.log('[simulate-boats] No active trips — start a trip in the fisher app first');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO boat_positions (boat_id, trip_id, lat, lng, status, recorded_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  boats.forEach((b, i) => {
    const base = b.lat != null ? { lat: b.lat, lng: b.lng } : {
      lat: CENTER.lat + (i * 0.03),
      lng: CENTER.lng + (i * 0.02),
    };
    const pos = nudge(base.lat, base.lng);
    const status = STATUSES[i % STATUSES.length];
    insert.run(b.boat_id, b.trip_id, pos.lat, pos.lng, status);
  });

  console.log(`[simulate-boats] Updated ${boats.length} boats (active trips) at ${new Date().toISOString()}`);
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('[simulate-boats] Starting — updates every 10s for ACTIVE trips only (Ctrl+C to stop)');
tick(db);
setInterval(() => tick(db), 10000);
