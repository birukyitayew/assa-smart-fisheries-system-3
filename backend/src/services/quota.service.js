/**
 * Quota Service
 * Updates species quota after a catch is approved and creates alerts at thresholds.
 */

const eventBus = require('./eventBus');
const { prisma } = require('../database/prisma');

async function checkQuotaBeforeApprove(species, quantityKg) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const quota = await prisma.speciesQuota.findUnique({
    where: {
      species_month_year: { species, month: currentMonth, year: currentYear },
    },
  });

  if (!quota) return { allowed: true };

  const projected = quota.currentMonthKg + quantityKg;
  if (projected > quota.monthlyLimitKg) {
    return {
      allowed: false,
      message: `Approving this catch would exceed the monthly ${species} quota (${Math.round(projected)} / ${quota.monthlyLimitKg} kg).`,
      quota,
    };
  }
  return { allowed: true, quota };
}

async function updateQuota(species, quantityKg) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const defaults = {
    Tilapia: 5000,
    Catfish: 2000,
    'Nile Perch': 2000,
    Carp: 1500,
    'Barbus (Ganfo)': 1000,
  };

  const existing = await prisma.speciesQuota.findUnique({
    where: {
      species_month_year: { species, month: currentMonth, year: currentYear },
    },
  });

  if (!existing) {
    await prisma.speciesQuota.create({
      data: {
        species,
        monthlyLimitKg: defaults[species] || 2000,
        currentMonthKg: quantityKg,
        month: currentMonth,
        year: currentYear,
      },
    });
  } else {
    await prisma.speciesQuota.update({
      where: {
        species_month_year: { species, month: currentMonth, year: currentYear },
      },
      data: { currentMonthKg: { increment: quantityKg } },
    });
  }

  const quota = await prisma.speciesQuota.findUnique({
    where: {
      species_month_year: { species, month: currentMonth, year: currentYear },
    },
  });

  if (!quota) return;

  const pct = (quota.currentMonthKg / quota.monthlyLimitKg) * 100;
  const monthPad = String(currentMonth).padStart(2, '0');
  const yearStr = String(currentYear);

  const existingAlerts = await prisma.$queryRaw`
    SELECT id FROM alerts
    WHERE type IN ('QUOTA_WARNING', 'QUOTA_EXCEEDED')
      AND related_entity_type = 'quota'
      AND related_entity_id = ${quota.id}
      AND EXTRACT(MONTH FROM created_at) = ${currentMonth}
      AND EXTRACT(YEAR FROM created_at) = ${currentYear}
    LIMIT 1
  `;
  const existingAlert = existingAlerts[0];

  if (pct >= 100 && !existingAlert) {
    await prisma.alert.create({
      data: {
        type: 'QUOTA_EXCEEDED',
        title: `${species} Quota Exceeded`,
        message: `Monthly ${species} quota has been exceeded (${Math.round(quota.currentMonthKg)} / ${quota.monthlyLimitKg} kg). No further catches should be approved.`,
        severity: 'CRITICAL',
        relatedEntityType: 'quota',
        relatedEntityId: quota.id,
      },
    });
  } else if (pct >= 90 && !existingAlert) {
    await prisma.alert.create({
      data: {
        type: 'QUOTA_WARNING',
        title: `${species} Quota at ${Math.round(pct)}%`,
        message: `Monthly ${species} quota has reached ${Math.round(pct)}% (${Math.round(quota.currentMonthKg)} / ${quota.monthlyLimitKg} kg). Monitor closely.`,
        severity: 'WARNING',
        relatedEntityType: 'quota',
        relatedEntityId: quota.id,
      },
    });
    eventBus.emit('quota.warning', {
      species,
      usage_pct: Math.round(pct),
      current_month_kg: quota.currentMonthKg,
      monthly_limit_kg: quota.monthlyLimitKg,
      quota_id: quota.id,
    });
  }
}

module.exports = { updateQuota, checkQuotaBeforeApprove };
