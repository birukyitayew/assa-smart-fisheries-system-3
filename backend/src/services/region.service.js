/**
 * Multi-region scoping for national / regional admin views.
 */
const { prisma } = require('../database/prisma');

function parseRegionId(value) {
  if (value === undefined || value === null || value === '' || value === 'all') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Resolve effective region filter from request + user role.
 * @returns {{ regionId: number|null, isGlobal: boolean, forced: boolean }}
 */
async function resolveRegionFilter(req) {
  const headerId = parseRegionId(req.headers['x-region-id']);
  const queryId = parseRegionId(req.query?.region_id);

  if (req.user?.role === 'regional_admin') {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { regionId: true },
    });
    if (!dbUser?.regionId) {
      const err = new Error('Regional admin has no assigned region');
      err.status = 403;
      throw err;
    }
    if (headerId && headerId !== dbUser.regionId) {
      const err = new Error('Cannot view another region');
      err.status = 403;
      throw err;
    }
    if (queryId && queryId !== dbUser.regionId) {
      const err = new Error('Cannot view another region');
      err.status = 403;
      throw err;
    }
    return { regionId: dbUser.regionId, isGlobal: false, forced: true };
  }

  const regionId = headerId ?? queryId ?? null;
  return { regionId, isGlobal: regionId === null, forced: false };
}

/** SQL fragment: zone in region (alias = fishing_zones table alias) */
function zoneInRegionSql(regionId, zoneAlias = 'fz') {
  if (regionId == null) return { sql: 'TRUE', params: [] };
  return { sql: `${zoneAlias}.region_id = $1`, params: [regionId] };
}

/** For Prisma where on FishingZone */
function zoneWhereRegion(regionId) {
  if (regionId == null) return {};
  return { regionId };
}

/** Catch submissions in region via zone */
function catchZoneRegionFilter(regionId) {
  if (regionId == null) return {};
  return { zone: { regionId } };
}

/** Fisher in region via zone */
function fisherZoneRegionFilter(regionId) {
  if (regionId == null) return {};
  return { zone: { regionId } };
}

async function listRegions() {
  return prisma.region.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      centerLat: true,
      centerLng: true,
    },
  });
}

async function getRegionSummary(regionId) {
  const zoneFilter = zoneWhereRegion(regionId);
  const [zones, fishers, pendingCatches] = await Promise.all([
    prisma.fishingZone.count({ where: zoneFilter }),
    prisma.fisher.count({ where: fisherZoneRegionFilter(regionId) }),
    prisma.catchSubmission.count({
      where: { status: 'PENDING', ...catchZoneRegionFilter(regionId) },
    }),
  ]);

  let activeBoats = 0;
  if (regionId == null) {
    activeBoats = await prisma.boat.count();
  } else {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT b.id)::int as cnt
      FROM boats b
      JOIN fishers f ON b.fisher_id = f.id
      JOIN fishing_zones fz ON f.zone_id = fz.id
      WHERE fz.region_id = ${regionId}
    `;
    activeBoats = Number(rows[0]?.cnt ?? 0);
  }

  return { zones, fishers, pendingCatches, activeBoats };
}

async function assertCatchInRegion(catchId, regionId) {
  if (regionId == null) return true;
  const row = await prisma.catchSubmission.findFirst({
    where: { id: catchId, zone: { regionId } },
    select: { id: true },
  });
  if (!row) {
    const err = new Error('Catch not in your region');
    err.status = 403;
    throw err;
  }
  return true;
}

module.exports = {
  resolveRegionFilter,
  zoneInRegionSql,
  zoneWhereRegion,
  catchZoneRegionFilter,
  fisherZoneRegionFilter,
  listRegions,
  getRegionSummary,
  assertCatchInRegion,
  parseRegionId,
};
