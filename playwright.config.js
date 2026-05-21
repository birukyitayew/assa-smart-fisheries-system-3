// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const ADMIN_URL = process.env.PLAYWRIGHT_ADMIN_URL || 'http://localhost:3001/admin/';
const FISHER_URL = process.env.PLAYWRIGHT_FISHER_URL || 'http://localhost:3002/fisher/';
const MARKET_URL = process.env.PLAYWRIGHT_MARKET_URL || 'http://localhost:3003/market/';

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], baseURL: ADMIN_URL },
    },
    {
      name: 'fisher',
      use: { ...devices['Desktop Chrome'], baseURL: FISHER_URL },
    },
    {
      name: 'market',
      use: { ...devices['Desktop Chrome'], baseURL: MARKET_URL },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:4000/api/health',
        reuseExistingServer: true,
        timeout: 120000,
      },
});
