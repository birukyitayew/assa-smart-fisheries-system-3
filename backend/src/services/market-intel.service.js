/**
 * Market snapshots and intelligence aggregations.
 */
const { prisma } = require('../database/prisma');

async function buildDailySnapshot(dateStr) {
  const speciesRows = await prisma.$queryRaw`
    SELECT DISTINCT species FROM marketplace_listings
    UNION
    SELECT DISTINCT ml.species FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
  `;

  for (const { species } of speciesRows) {
    const listedRows = await prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity_available_kg), 0) as kg
      FROM marketplace_listings
      WHERE species = ${species} AND status = 'ACTIVE' AND date(listed_at) <= ${dateStr}
    `;
    const listed = listedRows[0];

    const soldRows = await prisma.$queryRaw`
      SELECT COALESCE(SUM(o.quantity_kg), 0) as kg,
             COALESCE(AVG(o.price_per_kg), 0) as avg_price,
             COUNT(*) as order_count
      FROM orders o
      JOIN marketplace_listings ml ON o.listing_id = ml.id
      WHERE ml.species = ${species} AND date(o.ordered_at) = ${dateStr} AND o.status != 'CANCELLED'
    `;
    const sold = soldRows[0];

    await prisma.marketSnapshot.upsert({
      where: {
        snapshotDate_species: {
          snapshotDate: new Date(`${dateStr}T00:00:00.000Z`),
          species,
        },
      },
      create: {
        snapshotDate: new Date(`${dateStr}T00:00:00.000Z`),
        species,
        totalListedKg: listed?.kg ?? 0,
        totalSoldKg: sold?.kg ?? 0,
        avgPrice: sold?.avg_price ?? null,
        orderCount: Number(sold?.order_count ?? 0),
      },
      update: {
        totalListedKg: listed?.kg ?? 0,
        totalSoldKg: sold?.kg ?? 0,
        avgPrice: sold?.avg_price ?? null,
        orderCount: Number(sold?.order_count ?? 0),
      },
    });
  }
}

async function refreshSnapshots(days = 14) {
  for (let d = 0; d < days; d++) {
    const date = new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
    await buildDailySnapshot(date);
  }
}

const { Prisma } = require('@prisma/client');

function listingRegionSql(regionId) {
  if (regionId == null) return Prisma.empty;
  return Prisma.sql`AND EXISTS (
    SELECT 1 FROM fishers f_r
    JOIN fishing_zones fz_r ON f_r.zone_id = fz_r.id
    WHERE f_r.id = ml.fisher_id AND fz_r.region_id = ${regionId}
  )`;
}

function orderRegionSql(regionId) {
  if (regionId == null) return Prisma.empty;
  return Prisma.sql`AND EXISTS (
    SELECT 1 FROM marketplace_listings ml_r
    JOIN fishers f_r ON ml_r.fisher_id = f_r.id
    JOIN fishing_zones fz_r ON f_r.zone_id = fz_r.id
    WHERE ml_r.id = o.listing_id AND fz_r.region_id = ${regionId}
  )`;
}

async function getIntelligenceOverview(regionId = null) {
  const snapshots = await prisma.$queryRaw`
    SELECT snapshot_date, species, total_listed_kg, total_sold_kg, avg_price, order_count
    FROM market_snapshots
    WHERE snapshot_date >= CURRENT_DATE - interval '14 days'
    ORDER BY snapshot_date ASC, species
  `;

  const priceTrends = await prisma.$queryRaw`
    SELECT species, recorded_at::date as date, AVG(price_per_kg) as avg_price
    FROM price_history
    WHERE recorded_at >= NOW() - interval '7 days'
    GROUP BY species, recorded_at::date
    ORDER BY date ASC
  `;

  const speciesSold7d = await prisma.$queryRaw`
    SELECT species, SUM(total_sold_kg) as kg_sold
    FROM market_snapshots
    WHERE snapshot_date >= CURRENT_DATE - interval '7 days'
    GROUP BY species
    ORDER BY kg_sold DESC
  `;

  const quotas = await prisma.$queryRaw`
    SELECT species, monthly_limit_kg, current_month_kg,
           ROUND((current_month_kg * 100.0 / monthly_limit_kg)::numeric, 1) as usage_pct
    FROM species_quotas
    WHERE month = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)::int
  `;

  const quotaShortages = quotas.filter((q) => Number(q.usage_pct) >= 85);

  const stockLow = await prisma.$queryRaw`
    SELECT species, SUM(quantity_available_kg) as available_kg
    FROM marketplace_listings ml
    WHERE status = 'ACTIVE' ${listingRegionSql(regionId)}
    GROUP BY species HAVING COALESCE(SUM(quantity_available_kg), 0) < 10
  `;

  const avgPriceDeltaRows = await prisma.$queryRaw`
    SELECT
      (SELECT AVG(price_per_kg) FROM price_history WHERE recorded_at >= NOW() - interval '7 days') as recent,
      (SELECT AVG(price_per_kg) FROM price_history
       WHERE recorded_at >= NOW() - interval '14 days' AND recorded_at < NOW() - interval '7 days') as prior
  `;
  const avgPriceDelta = avgPriceDeltaRows[0];

  let priceDeltaPct = null;
  if (avgPriceDelta?.prior > 0 && avgPriceDelta?.recent) {
    priceDeltaPct = Math.round(
      ((avgPriceDelta.recent - avgPriceDelta.prior) / avgPriceDelta.prior) * 100,
    );
  }

  return {
    snapshots,
    priceTrends,
    speciesSold7d,
    quotaShortages,
    stockLow,
    priceDeltaPct,
    totalSoldKg7d: speciesSold7d.reduce((s, r) => s + (r.kg_sold || 0), 0),
    speciesCount: speciesSold7d.length,
  };
}

async function getShortageFlagsForSpecies(species) {
  const quotaRows = await prisma.$queryRaw`
    SELECT ROUND((current_month_kg * 100.0 / monthly_limit_kg)::numeric, 1) as usage_pct
    FROM species_quotas
    WHERE species = ${species}
      AND month = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)::int
    LIMIT 1
  `;
  const quota = quotaRows[0];

  const stockRows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(quantity_available_kg), 0) as kg
    FROM marketplace_listings WHERE species = ${species} AND status = 'ACTIVE'
  `;
  const stock = stockRows[0];

  const flags = [];
  if (quota?.usage_pct >= 85) flags.push('quota');
  if ((stock?.kg ?? 0) < 10) flags.push('low_stock');
  return flags;
}

module.exports = {
  buildDailySnapshot,
  refreshSnapshots,
  getIntelligenceOverview,
  getShortageFlagsForSpecies,
};
