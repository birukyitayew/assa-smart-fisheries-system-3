/**
 * Demo boat position simulator — nudges fleet GPS every 10s for boats on ACTIVE trips.
 * Run: npm run simulate:boats (with backend running)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { prisma } = require('../src/database/prisma');

const STATUSES = ['FISHING', 'FISHING', 'RETURNING', 'FISHING'];
const CENTER = { lat: 11.75, lng: 37.35 };

function nudge(lat, lng) {
  return {
    lat: lat + (Math.random() - 0.5) * 0.008,
    lng: lng + (Math.random() - 0.5) * 0.008,
  };
}

async function tick() {
  const boats = await prisma.$queryRaw`
    SELECT b.id as boat_id, t.id as trip_id, bp.lat, bp.lng, bp.status
    FROM boat_trips t
    JOIN boats b ON b.id = t.boat_id
    LEFT JOIN boat_positions bp ON bp.id = (
      SELECT id FROM boat_positions WHERE boat_id = b.id ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE t.status = 'ACTIVE'
    LIMIT 12
  `;

  if (boats.length === 0) {
    console.log('[simulate-boats] No active trips — start a trip in the fisher app first');
    return;
  }

  for (let i = 0; i < boats.length; i++) {
    const b = boats[i];
    const base = b.lat != null
      ? { lat: Number(b.lat), lng: Number(b.lng) }
      : { lat: CENTER.lat + i * 0.03, lng: CENTER.lng + i * 0.02 };
    const pos = nudge(base.lat, base.lng);
    const status = STATUSES[i % STATUSES.length];
    await prisma.boatPosition.create({
      data: {
        boatId: b.boat_id,
        tripId: b.trip_id,
        lat: pos.lat,
        lng: pos.lng,
        status,
      },
    });
  }

  console.log(`[simulate-boats] Updated ${boats.length} boats (active trips) at ${new Date().toISOString()}`);
}

async function main() {
  console.log('[simulate-boats] Starting — updates every 10s for ACTIVE trips only (Ctrl+C to stop)');
  await tick();
  setInterval(() => {
    tick().catch((err) => console.error('[simulate-boats]', err.message));
  }, 10000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
