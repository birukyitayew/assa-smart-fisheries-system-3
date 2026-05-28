const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../src/server');

let server, baseUrl, fisherToken, adminToken;

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

test.describe('Catches API', () => {
  test.before(async () => {
    fisherToken = await login('tesfaye@fisher.et', 'fisher123');
    adminToken = await login('dawit@fisheries.gov.et', 'admin123');
    assert.ok(fisherToken, 'Fisher login failed');
    assert.ok(adminToken, 'Admin login failed');
  });

  test('POST /api/catches - fisher can submit a catch', async () => {
    const res = await fetch(`${baseUrl}/api/catches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fisherToken}`,
      },
      body: JSON.stringify({
        species: 'Tilapia',
        quantity_kg: 5,
        number_of_fish: 3,
        fishing_gear: 'Gill Net',
        fishing_date: new Date().toISOString().slice(0, 10),
        fishing_time: '06:00',
        zone_id: 1,
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.success && body.id);
  });

  test('POST /api/catches - rejects unauthenticated request', async () => {
    const res = await fetch(`${baseUrl}/api/catches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ species: 'Tilapia', quantity_kg: 5 }),
    });
    assert.strictEqual(res.status, 401);
  });

  test('GET /admin/catches - admin can list catches', async () => {
    const res = await fetch(`${baseUrl}/api/admin/catches?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.catches));
  });
});
