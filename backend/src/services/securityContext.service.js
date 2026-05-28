/**
 * Security Context Service
 *
 * Builds a compact, live snapshot of the operational state of the system
 * (catches, quotas, alerts, violations, fleet, fishers, market) that is
 * injected into the AI Security Assistant prompt so the model answers from
 * real database data instead of fabricated/illustrative numbers.
 */

const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

function monthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtKg(n) {
  return `${Math.round(Number(n) || 0).toLocaleString('en-US')} kg`;
}

function fmtTime(date) {
  if (!date) return 'unknown time';
  return new Date(date).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

async function gatherCatches() {
  const today = startOfToday();
  const [byStatus, todayAgg, pendingOldest] = await Promise.all([
    prisma.catchSubmission.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.catchSubmission.aggregate({
      where: { submittedAt: { gte: today } },
      _count: { _all: true },
      _sum: { quantityKg: true },
    }),
    prisma.catchSubmission.findFirst({
      where: { status: 'PENDING' },
      orderBy: { submittedAt: 'asc' },
      select: { submittedAt: true },
    }),
  ]);

  const counts = byStatus.reduce((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});

  const lines = [
    `- Pending review: ${counts.PENDING || 0}; Approved: ${counts.APPROVED || 0}; Rejected: ${counts.REJECTED || 0}`,
    `- Submitted today: ${todayAgg._count._all} (${fmtKg(todayAgg._sum.quantityKg)} total)`,
  ];
  if (pendingOldest) {
    lines.push(`- Oldest unreviewed submission since ${fmtTime(pendingOldest.submittedAt)}`);
  }
  return `**Catch submissions**\n${lines.join('\n')}`;
}

async function gatherQuotas() {
  const { month, year } = monthRange();
  const quotas = await prisma.speciesQuota.findMany({
    where: { month, year },
    orderBy: { species: 'asc' },
  });
  if (quotas.length === 0)
    return '**Quotas (this month)**\n- No quota records for the current month.';

  const rows = quotas
    .map((q) => {
      const pct = q.monthlyLimitKg > 0 ? (q.currentMonthKg / q.monthlyLimitKg) * 100 : 0;
      const flag = pct >= 100 ? ' [EXCEEDED]' : pct >= 85 ? ' [NEAR LIMIT]' : '';
      return {
        pct,
        text: `- ${q.species}: ${fmtKg(q.currentMonthKg)} / ${fmtKg(q.monthlyLimitKg)} (${Math.round(pct)}%)${flag}`,
      };
    })
    .sort((a, b) => b.pct - a.pct)
    .map((r) => r.text);

  return `**Quotas (this month)**\n${rows.join('\n')}`;
}

async function gatherAlerts() {
  const [unread, recent] = await Promise.all([
    prisma.alert.count({ where: { isRead: false } }),
    prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { title: true, severity: true, createdAt: true },
    }),
  ]);

  if (recent.length === 0) return `**Alerts**\n- No alerts on record. Unread: ${unread}.`;

  const rows = recent.map((a) => `- [${a.severity}] ${a.title} (${fmtTime(a.createdAt)})`);
  return `**Alerts** (unread: ${unread})\n${rows.join('\n')}`;
}

async function gatherViolations() {
  const [openBySeverity, recentOpen] = await Promise.all([
    prisma.violation.groupBy({
      by: ['severity'],
      where: { status: 'OPEN' },
      _count: { _all: true },
    }),
    prisma.violation.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        fisher: { include: { user: { select: { name: true } } } },
        zone: { select: { name: true } },
      },
    }),
  ]);

  const severityText =
    openBySeverity.length > 0
      ? openBySeverity.map((s) => `${s._count._all} ${s.severity}`).join(', ')
      : 'none open';

  const rows = recentOpen.map((v) => {
    const fisher = v.fisher?.user?.name || `Fisher #${v.fisherId}`;
    const zone = v.zone?.name ? ` in ${v.zone.name}` : '';
    return `- [${v.severity}] ${v.type} — ${fisher}${zone} (${fmtTime(v.createdAt)})`;
  });

  const header = `**Open violations** (${severityText})`;
  return rows.length > 0 ? `${header}\n${rows.join('\n')}` : `${header}`;
}

async function gatherFishers() {
  const today = startOfToday();
  const [total, expired, lowCompliance, suspicious] = await Promise.all([
    prisma.fisher.count({ where: { deletedAt: null } }),
    prisma.fisher.count({
      where: { deletedAt: null, licenseExpiry: { lt: today } },
    }),
    prisma.fisherCompliance.count({ where: { score: { lt: 60 } } }),
    prisma.fisherCompliance.count({ where: { openViolations: { gt: 0 } } }),
  ]);

  return [
    '**Fishers**',
    `- Registered: ${total}; Expired licenses: ${expired}`,
    `- Below compliance threshold (<60): ${lowCompliance}; With open violations: ${suspicious}`,
  ].join('\n');
}

async function gatherFleet() {
  const activeTrips = await prisma.boatTrip.count({ where: { status: 'ACTIVE' } });

  // Recent position pings grouped by status, as a fleet-activity proxy.
  let fishing = 0;
  let returning = 0;
  let docked = 0;
  try {
    const grouped = await prisma.boatPosition.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { recordedAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
    });
    for (const g of grouped) {
      if (g.status === 'FISHING') fishing = g._count._all;
      else if (g.status === 'RETURNING') returning = g._count._all;
      else if (g.status === 'DOCKED') docked = g._count._all;
    }
  } catch {
    // position telemetry optional
  }

  return [
    '**Fleet**',
    `- Active trips: ${activeTrips}`,
    `- Recent position pings (last 6h): ${fishing} fishing, ${returning} returning, ${docked} docked`,
  ].join('\n');
}

async function gatherMarket() {
  const [listingAgg, lowStock, recentSnapshots] = await Promise.all([
    prisma.marketplaceListing.aggregate({
      where: { status: 'ACTIVE' },
      _count: { _all: true },
      _sum: { quantityAvailableKg: true },
    }),
    prisma.marketplaceListing.count({
      where: { status: 'ACTIVE', quantityAvailableKg: { lt: 10 } },
    }),
    prisma.marketSnapshot.findMany({
      orderBy: { snapshotDate: 'desc' },
      take: 5,
    }),
  ]);

  const lines = [
    '**Marketplace**',
    `- Active listings: ${listingAgg._count._all} (${fmtKg(listingAgg._sum.quantityAvailableKg)} available); low-stock (<10kg): ${lowStock}`,
  ];
  if (recentSnapshots.length > 0) {
    const latestDate = recentSnapshots[0].snapshotDate;
    const sameDay = recentSnapshots.filter(
      (s) => new Date(s.snapshotDate).getTime() === new Date(latestDate).getTime(),
    );
    const priceRows = sameDay
      .map((s) => `${s.species} ETB ${Math.round(s.avgPrice || 0)}/kg`)
      .join(', ');
    if (priceRows) {
      lines.push(`- Latest snapshot prices: ${priceRows}`);
    }
  }
  return lines.join('\n');
}

/**
 * Builds a compact Markdown snapshot of current operational data. Each section
 * is resilient: a failing query degrades to a short note rather than aborting
 * the whole context (so the assistant still works if part of the DB is empty).
 */
async function buildSecurityContext() {
  const sections = await Promise.allSettled([
    gatherCatches(),
    gatherQuotas(),
    gatherAlerts(),
    gatherViolations(),
    gatherFishers(),
    gatherFleet(),
    gatherMarket(),
  ]);

  const parts = sections.filter((s) => s.status === 'fulfilled' && s.value).map((s) => s.value);

  const failures = sections.filter((s) => s.status === 'rejected');
  if (failures.length > 0) {
    logger.warn(
      { failures: failures.map((f) => f.reason?.message) },
      'Some security-context sections failed to build',
    );
  }

  if (parts.length === 0) return null;

  const header = `Live operational snapshot generated at ${fmtTime(new Date())}. Use these real figures when answering; do not invent numbers that contradict them.`;
  return `${header}\n\n${parts.join('\n\n')}`;
}

module.exports = { buildSecurityContext };
