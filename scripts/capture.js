const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ADMIN_EMAIL = 'dawit@fisheries.gov.et';
const ADMIN_PASS = 'admin123';
const FISHER_EMAIL = 'tesfaye@fisher.et';
const FISHER_PASS = 'fisher123';
const BUYER_EMAIL = 'mesfin@buyer.et';
const BUYER_PASS = 'buyer123';

const ADMIN_URL = 'http://localhost:3001/admin/';
const FISHER_URL = 'http://localhost:3002/fisher/';
const MARKET_URL = 'http://localhost:3003/market/';
const DIAGNOSTICS_URL = 'http://localhost:4000/api/health/detailed';

const OUTPUT_DIR = '/home/iron/.gemini/antigravity-ide/brain/7b50ec06-136b-4c69-90aa-6bcf94bd0955';

async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Helper function to wait
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // 1. Capture Login UI
  console.log('📸 Capturing Login UI...');
  await page.goto(ADMIN_URL + 'login');
  await wait(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'login_ui.png') });

  // Login Admin
  console.log('🔑 Logging into Admin Command Center...');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASS);
  await page.getByRole('button', { name: /sign in|ግባ/i }).click();
  await wait(3000);

  // 2. Capture Admin Overview / Dashboard Home
  console.log('📸 Capturing Admin Dashboard Home...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'command_center_home.png') });

  // 3. Capture Geospatial Map
  console.log('📸 Capturing Geospatial Map...');
  await page.goto(ADMIN_URL + 'map');
  await wait(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'geospatial_map.png') });

  // 4. Capture Fleet Telemetry
  console.log('📸 Capturing Fleet Telemetry...');
  await page.goto(ADMIN_URL + 'fleet');
  await wait(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'fleet_telemetry.png') });

  // 5. Capture Quota / Approval Workflow (Daily Catches)
  console.log('📸 Capturing Daily Catches (Quota/Approval)...');
  await page.goto(ADMIN_URL + 'catches');
  await wait(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'quota_approval.png') });

  // Close context for admin
  await context.close();

  // Create new context for Fisher App (mobile layout)
  console.log('📱 Creating context for mobile Fisher App...');
  const fisherContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true
  });
  const fisherPage = await fisherContext.newPage();

  // Login Fisher
  console.log('📸 Capturing Fisher Login...');
  await fisherPage.goto(FISHER_URL + 'login');
  await wait(2000);
  await fisherPage.screenshot({ path: path.join(OUTPUT_DIR, 'fisher_login.png') });

  console.log('🔑 Logging into Fisher App...');
  await fisherPage.getByLabel(/email/i).fill(FISHER_EMAIL);
  await fisherPage.getByLabel(/password/i).fill(FISHER_PASS);
  await fisherPage.getByRole('button', { name: /sign in|ግባ/i }).click();
  await wait(3000);

  // 6. Capture Fisher Home Screen
  console.log('📸 Capturing Fisher Home...');
  await fisherPage.screenshot({ path: path.join(OUTPUT_DIR, 'fisher_app_home.png') });

  // 7. Capture Catch Logging UI
  console.log('📸 Capturing Fisher Catch Logging UI...');
  await fisherPage.goto(FISHER_URL + 'catch/log');
  await wait(2000);
  await fisherPage.screenshot({ path: path.join(OUTPUT_DIR, 'fisher_catch_logging.png') });

  await fisherContext.close();

  // Create context for Marketplace
  console.log('🛒 Creating context for Marketplace...');
  const marketContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const marketPage = await marketContext.newPage();

  // 8. Capture Marketplace Listings
  console.log('📸 Capturing Marketplace listings...');
  await marketPage.goto(MARKET_URL);
  await wait(3000);
  await marketPage.screenshot({ path: path.join(OUTPUT_DIR, 'marketplace_listings.png') });

  await marketContext.close();

  // Create context for Diagnostics JSON
  console.log('🩺 Creating context for detailed Diagnostics...');
  const diagContext = await browser.newContext();
  const diagPage = await diagContext.newPage();

  // 9. Capture Diagnostics Endpoint
  console.log('📸 Capturing Detailed Diagnostics API health check...');
  await diagPage.goto(DIAGNOSTICS_URL);
  await wait(1000);
  await diagPage.screenshot({ path: path.join(OUTPUT_DIR, 'detailed_health.png') });

  await diagContext.close();

  await browser.close();
  console.log('🎉 Screenshots successfully captured!');
}

run().catch(err => {
  console.error('❌ Error executing script:', err);
  process.exit(1);
});
