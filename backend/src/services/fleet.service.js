/**
 * Boat trips and fleet position tracking.
 */
const { Prisma } = require('@prisma/client');
const eventBus = require('./eventBus');
const { prisma } = require('../database/prisma');

async function getBoatForFisher(fisherId) {
  return prisma.boat.findFirst({ where: { fisherId } });
}

async function getActiveTripForFisher(fisherId) {
  const rows = await prisma.$queryRaw`
    SELECT t.*, b.boat_name, b.registration_number
    FROM boat_trips t
    JOIN boats b ON b.id = t.boat_id
    WHERE t.fisher_id = ${fisherId} AND t.status = 'ACTIVE'
    ORDER BY t.started_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getActiveTripForBoat(boatId) {
  return prisma.boatTrip.findFirst({
    where: { boatId, status: 'ACTIVE' },
  });
}

async function startTrip(fisherId) {
  const fisher = await prisma.fisher.findUnique({
    where: { id: fisherId },
    select: {
      licenseStatus: true,
      licenseExpiry: true,
      user: {
        select: { name: true },
      },
    },
  });
  if (!fisher) return { error: 'Fisher profile not found', status: 404 };
  if (fisher.licenseStatus !== 'VALID') {
    return { error: 'Valid license required to start a trip', status: 403 };
  }
  if (new Date(fisher.licenseExpiry) < new Date()) {
    return { error: 'License has expired. Cannot start a trip.', status: 403 };
  }

  const boat = await getBoatForFisher(fisherId);
  if (!boat) return { error: 'No registered boat found', status: 400 };

  const existing = await getActiveTripForBoat(boat.id);
  if (existing) {
    return { error: 'This boat already has an active trip', status: 409 };
  }

  const fisherTrip = await getActiveTripForFisher(fisherId);
  if (fisherTrip) {
    return { error: 'You already have an active fishing trip', status: 409 };
  }

  const zoneRows = await prisma.$queryRaw`
    SELECT fz.gps_lat, fz.gps_lng FROM fishers f
    LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
    WHERE f.id = ${fisherId}
    LIMIT 1
  `;
  const zone = zoneRows[0];
  const lat = zone?.gps_lat ?? 11.75;
  const lng = zone?.gps_lng ?? 37.35;

  const trip = await prisma.$transaction(async (tx) => {
    const created = await tx.boatTrip.create({
      data: {
        boatId: boat.id,
        fisherId,
        status: 'ACTIVE',
      },
    });

    await tx.boatPosition.create({
      data: {
        boatId: boat.id,
        tripId: created.id,
        lat,
        lng,
        status: 'FISHING',
      },
    });

    return created;
  });

  eventBus.emit('boat.trip.started', {
    trip_id: trip.id,
    boat_id: boat.id,
    boat_name: boat.boatName,
    fisher_id: fisherId,
    fisher_name: fisher?.user?.name,
  });

  return { trip, boat };
}

async function endTrip(fisherId) {
  const trip = await getActiveTripForFisher(fisherId);
  if (!trip) return { error: 'No active trip to end', status: 404 };

  await prisma.$transaction(async (tx) => {
    await tx.boatTrip.update({
      where: { id: trip.id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });

    const lastPos = await tx.boatPosition.findFirst({
      where: { boatId: trip.boat_id },
      orderBy: { recordedAt: 'desc' },
    });
    if (lastPos) {
      await tx.boatPosition.create({
        data: {
          boatId: trip.boat_id,
          tripId: trip.id,
          lat: lastPos.lat,
          lng: lastPos.lng,
          status: 'DOCKED',
        },
      });
    }
  });

  eventBus.emit('boat.trip.ended', {
    trip_id: trip.id,
    boat_id: trip.boat_id,
    fisher_id: fisherId,
  });

  const updated = await prisma.boatTrip.findUnique({ where: { id: trip.id } });
  return { trip: updated };
}

async function getFleetList(regionId = null) {
  const regionFilter =
    regionId == null
      ? Prisma.empty
      : Prisma.sql`AND EXISTS (
          SELECT 1 FROM fishing_zones fz_r WHERE fz_r.id = f.zone_id AND fz_r.region_id = ${regionId}
        )`;
  return prisma.$queryRaw`
    SELECT b.id as boat_id, b.boat_name, b.registration_number,
           f.id as fisher_id, u.name as fisher_name,
           t.id as trip_id, t.status as trip_status, t.started_at as trip_started_at,
           bp.lat, bp.lng, bp.status as position_status, bp.recorded_at
    FROM boats b
    JOIN fishers f ON b.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN boat_trips t ON t.id = (
      SELECT id FROM boat_trips WHERE boat_id = b.id AND status = 'ACTIVE' LIMIT 1
    )
    LEFT JOIN boat_positions bp ON bp.id = (
      SELECT id FROM boat_positions WHERE boat_id = b.id ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE 1=1 ${regionFilter}
    ORDER BY b.boat_name
  `;
}

async function getBoatHistory(boatId, hours = 24) {
  const cutoff = new Date(Date.now() - hours * 3600000);
  return prisma.$queryRaw`
    SELECT lat, lng, status, recorded_at, trip_id
    FROM boat_positions
    WHERE boat_id = ${boatId}
      AND recorded_at >= ${cutoff}
    ORDER BY recorded_at ASC
  `;
}

async function countTripsToday(fisherId) {
  const today = new Date().toISOString().split('T')[0];
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) as cnt FROM boat_trips
    WHERE fisher_id = ${fisherId} AND date(started_at) = ${today}
  `;
  return Number(rows[0]?.cnt ?? 0);
}

module.exports = {
  startTrip,
  endTrip,
  getActiveTripForFisher,
  getFleetList,
  getBoatHistory,
  countTripsToday,
  getBoatForFisher,
};
