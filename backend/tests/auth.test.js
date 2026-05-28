const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../src/server');

let server;
let baseUrl;

test.before(async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test.describe('Authentication API', () => {
  let accessToken;
  let refreshToken;

  test('POST /api/auth/login - should log in successfully with valid admin credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dawit@fisheries.gov.et',
        password: 'admin123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.token || body.accessToken);
    assert.ok(body.refreshToken);
    assert.strictEqual(body.user.email, 'dawit@fisheries.gov.et');

    accessToken = body.token || body.accessToken;
    refreshToken = body.refreshToken;
  });

  test('POST /api/auth/login - should fail with invalid password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dawit@fisheries.gov.et',
        password: 'wrongpassword',
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.ok(body.error);
  });

  test('POST /api/auth/refresh - should refresh accessToken successfully', async () => {
    assert.ok(refreshToken, 'Requires active refreshToken from previous test');

    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.accessToken || body.token);
  });

  test('POST /api/auth/logout - should log out successfully', async () => {
    assert.ok(refreshToken, 'Requires active refreshToken');
    assert.ok(accessToken, 'Requires active accessToken');

    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  test('POST /api/auth/forgot-password & reset-password flow', async () => {
    // 1. Request forgot password for a seeded user (e.g., dawit@fisheries.gov.et)
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dawit@fisheries.gov.et' }),
    });

    assert.strictEqual(forgotRes.status, 200);
    const forgotBody = await forgotRes.json();
    assert.strictEqual(forgotBody.success, true);
    assert.ok(forgotBody.token);

    const resetToken = forgotBody.token;

    // 2. Reset the password to a new password
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: 'newadminpassword123',
      }),
    });

    assert.strictEqual(resetRes.status, 200);
    const resetBody = await resetRes.json();
    assert.strictEqual(resetBody.success, true);

    // 3. Verify logging in with the new password works
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dawit@fisheries.gov.et',
        password: 'newadminpassword123',
      }),
    });

    assert.strictEqual(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.ok(loginBody.token || loginBody.accessToken);

    // 4. Restore original password so subsequent test runs aren't affected
    const restoreRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dawit@fisheries.gov.et' }),
    });
    const restoreToken = (await restoreRes.json()).token;

    await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: restoreToken,
        password: 'admin123',
      }),
    });
  });
});
