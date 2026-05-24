const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../src/server');
const { prisma } = require('../src/database/prisma');

let server, baseUrl, fisherToken, adminToken, buyerToken;

test.before(async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  return new Promise((resolve) => server.close(resolve));
});

async function login(email, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return body.token || body.accessToken;
}

test.describe('E2E Workflows', () => {
  test.before(async () => {
    fisherToken = await login('tesfaye@fisher.et', 'fisher123');
    adminToken = await login('dawit@fisheries.gov.et', 'admin123');
    buyerToken = await login('mesfin@buyer.et', 'buyer123');

    assert.ok(fisherToken, 'Fisher login failed');
    assert.ok(adminToken, 'Admin login failed');
    assert.ok(buyerToken, 'Buyer login failed');
  });

  test('E2E Rejection Workflow', async () => {
    // 1. Submit a catch
    const submitRes = await fetch(`${baseUrl}/api/catches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fisherToken}`,
      },
      body: JSON.stringify({
        species: 'Tilapia',
        quantity_kg: 10,
        number_of_fish: 5,
        fishing_gear: 'Gill Net',
        fishing_date: new Date().toISOString().slice(0, 10),
        fishing_time: '08:00',
        zone_id: 1,
      }),
    });
    assert.strictEqual(submitRes.status, 201);
    const submitBody = await submitRes.json();
    const catchId = submitBody.id;
    assert.ok(catchId);

    // 2. Reject the catch
    const rejectRes = await fetch(`${baseUrl}/api/admin/catches/${catchId}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Incorrect species reported' }),
    });
    assert.strictEqual(rejectRes.status, 200);

    // 3. Verify status in database
    const catchInDb = await prisma.catchSubmission.findUnique({
      where: { id: catchId },
    });
    assert.strictEqual(catchInDb.status, 'REJECTED');
    assert.strictEqual(catchInDb.rejectionReason, 'Incorrect species reported');
  });

  test('E2E Quota Exceeded Blocking Workflow', async () => {
    // Set a very small monthly limit for Nile Perch for current month to easily trigger exceedance
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const species = 'Nile Perch';

    await prisma.speciesQuota.upsert({
      where: {
        species_month_year: { species, month: currentMonth, year: currentYear },
      },
      update: {
        monthlyLimitKg: 10,
        currentMonthKg: 8, // quota starts at 8 / 10 kg
      },
      create: {
        species,
        monthlyLimitKg: 10,
        currentMonthKg: 8,
        month: currentMonth,
        year: currentYear,
      },
    });

    // 1. Submit a catch of 1 kg (Total projected 9 kg / 10 kg) - should be allowed to approve
    const submitRes1 = await fetch(`${baseUrl}/api/catches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fisherToken}`,
      },
      body: JSON.stringify({
        species,
        quantity_kg: 1,
        number_of_fish: 1,
        fishing_gear: 'Gill Net',
        fishing_date: new Date().toISOString().slice(0, 10),
        fishing_time: '08:00',
        zone_id: 1,
      }),
    });
    assert.strictEqual(submitRes1.status, 201);
    const catchId1 = (await submitRes1.json()).id;

    // 2. Submit another catch of 3 kg (Total projected 12 kg / 10 kg) - submits successfully, but approval will fail quota
    const submitRes2 = await fetch(`${baseUrl}/api/catches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fisherToken}`,
      },
      body: JSON.stringify({
        species,
        quantity_kg: 3,
        number_of_fish: 2,
        fishing_gear: 'Gill Net',
        fishing_date: new Date().toISOString().slice(0, 10),
        fishing_time: '08:00',
        zone_id: 1,
      }),
    });
    assert.strictEqual(submitRes2.status, 201);
    const catchId2 = (await submitRes2.json()).id;

    // 3. Approve first catch -> should succeed (9/10 kg)
    const approveRes1 = await fetch(`${baseUrl}/api/admin/catches/${catchId1}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(approveRes1.status, 200);

    // 4. Approve second catch -> should fail with 409 Conflict due to quota exceeded
    const approveRes2 = await fetch(`${baseUrl}/api/admin/catches/${catchId2}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(approveRes2.status, 409);
    const errorBody = await approveRes2.json();
    assert.match(errorBody.error, /exceed the monthly/i);
  });

  test('E2E Out-Of-Stock Order Flow', async () => {
    // 1. Fisher submits a Carp catch of 4 kg
    const submitRes = await fetch(`${baseUrl}/api/catches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fisherToken}`,
      },
      body: JSON.stringify({
        species: 'Carp',
        quantity_kg: 4,
        number_of_fish: 2,
        fishing_gear: 'Gill Net',
        fishing_date: new Date().toISOString().slice(0, 10),
        fishing_time: '08:00',
        zone_id: 1,
      }),
    });
    assert.strictEqual(submitRes.status, 201);
    const catchId = (await submitRes.json()).id;

    // Reset quota for Carp so approval works perfectly
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    await prisma.speciesQuota.upsert({
      where: { species_month_year: { species: 'Carp', month: currentMonth, year: currentYear } },
      update: { currentMonthKg: 0, monthlyLimitKg: 1500 },
      create: { species: 'Carp', currentMonthKg: 0, monthlyLimitKg: 1500, month: currentMonth, year: currentYear },
    });

    // 2. Admin approves catch -> auto-creates active listing with 4 kg Carp
    const approveRes = await fetch(`${baseUrl}/api/admin/catches/${catchId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(approveRes.status, 200);

    // Get the listing ID from database
    const listing = await prisma.marketplaceListing.findFirst({
      where: { catchId, status: 'ACTIVE' },
    });
    assert.ok(listing);
    assert.strictEqual(listing.quantityAvailableKg, 4);

    // 3. Buyer tries to order 10 kg -> should fail with 400 Bad Request
    const orderFailRes = await fetch(`${baseUrl}/api/marketplace/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        listing_id: listing.id,
        quantity_kg: 10,
      }),
    });
    assert.strictEqual(orderFailRes.status, 400);
    const orderFailBody = await orderFailRes.json();
    assert.match(orderFailBody.error, /exceeds available stock/i);

    // 4. Buyer orders 4 kg -> should succeed, and listing becomes SOLD_OUT
    const orderSuccessRes = await fetch(`${baseUrl}/api/marketplace/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        listing_id: listing.id,
        quantity_kg: 4,
      }),
    });
    assert.strictEqual(orderSuccessRes.status, 201);
    const orderSuccessBody = await orderSuccessRes.json();
    assert.strictEqual(orderSuccessBody.success, true);
    assert.strictEqual(orderSuccessBody.quantity_remaining, 0);

    const updatedListing = await prisma.marketplaceListing.findUnique({
      where: { id: listing.id },
    });
    assert.strictEqual(updatedListing.status, 'SOLD_OUT');
    assert.strictEqual(updatedListing.quantityAvailableKg, 0);
  });

  test('E2E Admin User Creation & Login Flow', async () => {
    const testEmail = `newfisher-${Date.now()}@fisher.et`;

    // 1. Admin creates a new fisher user
    const createRes = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'New Fisher Abebe',
        email: testEmail,
        password: 'securepassword123',
        role: 'fisher',
        phone: '+251911111111',
        licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
        boatName: 'Abebe Boat',
        capacityKg: 600,
      }),
    });

    assert.strictEqual(createRes.status, 201);
    const createBody = await createRes.json();
    assert.strictEqual(createBody.success, true);
    assert.strictEqual(createBody.user.email, testEmail);

    // 2. Log in with the newly created user credentials
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'securepassword123',
      }),
    });

    assert.strictEqual(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.ok(loginBody.token || loginBody.accessToken);
    assert.strictEqual(loginBody.user.role, 'fisher');
    assert.ok(loginBody.profile);
    assert.strictEqual(loginBody.profile.boat_name, 'Abebe Boat');
    assert.strictEqual(loginBody.profile.capacity_kg, 600);

    // Clean up created user, fisher, and boat records from database
    const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
    if (userInDb) {
      const fisherInDb = await prisma.fisher.findUnique({ where: { userId: userInDb.id } });
      if (fisherInDb) {
        await prisma.boat.deleteMany({ where: { fisherId: fisherInDb.id } });
        await prisma.fisher.delete({ where: { id: fisherInDb.id } });
      }
      await prisma.user.delete({ where: { id: userInDb.id } });
    }
  });
});
