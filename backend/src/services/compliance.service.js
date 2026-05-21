/**
 * Fisher compliance score — recalculated when violations change.
 */
const { prisma } = require('../database/prisma');

const SEVERITY_PENALTY = { LOW: 5, MEDIUM: 10, HIGH: 20, CRITICAL: 35 };

async function recalculateCompliance(fisherId) {
  const statsRows = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int as total,
      COALESCE(SUM(CASE WHEN status IN ('OPEN','UNDER_REVIEW') THEN 1 ELSE 0 END), 0)::int as open_cnt,
      MAX(created_at) as last_at
    FROM violations WHERE fisher_id = ${fisherId}
  `;
  const stats = statsRows[0] || { total: 0, open_cnt: 0, last_at: null };

  const penalties = await prisma.violation.findMany({
    where: { fisherId, status: { not: 'DISMISSED' } },
    select: { severity: true },
  });

  let score = 100;
  penalties.forEach((v) => {
    score -= SEVERITY_PENALTY[v.severity] || 10;
  });
  score = Math.max(0, Math.min(100, score));

  await prisma.fisherCompliance.upsert({
    where: { fisherId },
    create: {
      fisherId,
      score,
      violationsCount: stats.total,
      openViolations: stats.open_cnt,
      lastViolationAt: stats.last_at,
    },
    update: {
      score,
      violationsCount: stats.total,
      openViolations: stats.open_cnt,
      lastViolationAt: stats.last_at,
    },
  });

  if (score < 50 && stats.open_cnt > 0) {
    const fisher = await prisma.fisher.findUnique({ where: { id: fisherId } });
    if (fisher?.licenseStatus === 'VALID') {
      await prisma.fisher.update({
        where: { id: fisherId },
        data: { licenseStatus: 'SUSPENDED' },
      });
    }
  }

  return { score, violations_count: stats.total, open_violations: stats.open_cnt };
}

async function getCompliance(fisherId) {
  let row = await prisma.fisherCompliance.findUnique({ where: { fisherId } });
  if (!row) {
    await recalculateCompliance(fisherId);
    row = await prisma.fisherCompliance.findUnique({ where: { fisherId } });
  }
  if (!row) {
    return { fisher_id: fisherId, score: 100, violations_count: 0, open_violations: 0 };
  }
  return {
    fisher_id: row.fisherId,
    score: row.score,
    violations_count: row.violationsCount,
    open_violations: row.openViolations,
    last_violation_at: row.lastViolationAt,
    updated_at: row.updatedAt,
  };
}

module.exports = { recalculateCompliance, getCompliance, SEVERITY_PENALTY };
