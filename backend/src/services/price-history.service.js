/**
 * Record market price observations for intelligence charts.
 */

const { prisma } = require('../database/prisma');

async function recordPrice({ species, zoneId = null, pricePerKg, source }, tx = prisma) {
  if (!species || pricePerKg == null) return;
  await tx.priceHistory.create({
    data: {
      species,
      zoneId,
      pricePerKg,
      source,
    },
  });
}

async function getPriceSeries(species, days = 7) {
  return prisma.$queryRaw`
    SELECT date(recorded_at) as date, AVG(price_per_kg) as avg_price, source
    FROM price_history
    WHERE species = ${species}
      AND recorded_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY date(recorded_at), source
    ORDER BY date ASC
  `;
}

async function getSpeciesPriceTrend(species, days = 7) {
  return prisma.$queryRaw`
    SELECT date(recorded_at) as date, AVG(price_per_kg) as price
    FROM price_history
    WHERE species = ${species}
      AND recorded_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY date(recorded_at)
    ORDER BY date ASC
  `;
}

async function getListingPriceHistory(species, days = 7) {
  return prisma.$queryRaw`
    SELECT recorded_at, price_per_kg
    FROM price_history
    WHERE species = ${species}
      AND source IN ('listing', 'order')
      AND recorded_at >= NOW() - (${days}::text || ' days')::interval
    ORDER BY recorded_at ASC
  `;
}

module.exports = {
  recordPrice,
  getPriceSeries,
  getSpeciesPriceTrend,
  getListingPriceHistory,
};
