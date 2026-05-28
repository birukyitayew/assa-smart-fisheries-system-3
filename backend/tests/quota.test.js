const test = require('node:test');
const assert = require('node:assert');
const { prisma } = require('../src/database/prisma');
const quotaService = require('../src/services/quota.service');

test.describe('Quota Service', () => {
  const testSpecies = 'TestFish';
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  test.beforeEach(async () => {
    // Clean up dummy data before each test
    await prisma.alert.deleteMany({
      where: {
        relatedEntityType: 'quota',
        title: { contains: testSpecies },
      },
    });

    await prisma.speciesQuota.deleteMany({
      where: {
        species: testSpecies,
        month: currentMonth,
        year: currentYear,
      },
    });
  });

  test.afterEach(async () => {
    // Clean up dummy data after each test
    await prisma.alert.deleteMany({
      where: {
        relatedEntityType: 'quota',
        title: { contains: testSpecies },
      },
    });

    await prisma.speciesQuota.deleteMany({
      where: {
        species: testSpecies,
        month: currentMonth,
        year: currentYear,
      },
    });
  });

  test('checkQuotaBeforeApprove & updateQuota basic flow', async () => {
    // First, verify checkQuotaBeforeApprove allows when no quota exists
    const beforeCheck = await quotaService.checkQuotaBeforeApprove(testSpecies, 100);
    assert.strictEqual(beforeCheck.allowed, true);

    // Call updateQuota to initialize quota (default limit is 2000)
    await quotaService.updateQuota(testSpecies, 500);

    const quota = await prisma.speciesQuota.findUnique({
      where: {
        species_month_year: { species: testSpecies, month: currentMonth, year: currentYear },
      },
    });

    assert.ok(quota);
    assert.strictEqual(quota.currentMonthKg, 500);
    assert.strictEqual(quota.monthlyLimitKg, 2000);

    // checkQuotaBeforeApprove should allow another 500
    const check2 = await quotaService.checkQuotaBeforeApprove(testSpecies, 500);
    assert.strictEqual(check2.allowed, true);

    // checkQuotaBeforeApprove should deny 2000 (would exceed 2000 limit)
    const checkDeny = await quotaService.checkQuotaBeforeApprove(testSpecies, 2000);
    assert.strictEqual(checkDeny.allowed, false);
    assert.match(checkDeny.message, /would exceed/);
  });

  test('Quota alerts - warning >= 90% and exceeded >= 100%', async () => {
    // Initialize TestFish with limit 1000 by setting it or letting it create
    // Let's create it manually so we control limit
    const quota = await prisma.speciesQuota.create({
      data: {
        species: testSpecies,
        monthlyLimitKg: 1000,
        currentMonthKg: 0,
        month: currentMonth,
        year: currentYear,
      },
    });

    // 1. Submit 850 kg (85%) - no warning alert should fire
    await quotaService.updateQuota(testSpecies, 850);
    let alerts = await prisma.alert.findMany({
      where: { relatedEntityType: 'quota', relatedEntityId: quota.id },
    });
    assert.strictEqual(alerts.length, 0, 'Should not fire warning alert under 90%');

    // 2. Submit another 50 kg (total 900 kg = 90%) - warning alert should fire
    await quotaService.updateQuota(testSpecies, 50);
    alerts = await prisma.alert.findMany({
      where: { relatedEntityType: 'quota', relatedEntityId: quota.id },
    });
    assert.strictEqual(alerts.length, 1, 'Should fire exactly one warning alert at 90%');
    assert.strictEqual(alerts[0].type, 'QUOTA_WARNING');

    // 3. Submit another 50 kg (total 950 kg = 95%) - warning alert should NOT duplicate
    await quotaService.updateQuota(testSpecies, 50);
    alerts = await prisma.alert.findMany({
      where: { relatedEntityType: 'quota', relatedEntityId: quota.id },
    });
    assert.strictEqual(alerts.length, 1, 'Warning alert should be deduplicated (only 1 alert)');

    // 4. Submit another 60 kg (total 1010 kg = 101%) - exceeded alert should fire
    await quotaService.updateQuota(testSpecies, 60);
    alerts = await prisma.alert.findMany({
      where: { relatedEntityType: 'quota', relatedEntityId: quota.id },
    });
    const warningAlerts = alerts.filter((a) => a.type === 'QUOTA_WARNING');
    const exceededAlerts = alerts.filter((a) => a.type === 'QUOTA_EXCEEDED');
    assert.strictEqual(warningAlerts.length, 1, 'Still only one warning alert');
    assert.strictEqual(exceededAlerts.length, 1, 'One critical/exceeded alert should be created');
    assert.strictEqual(exceededAlerts[0].severity, 'CRITICAL');
  });
});
