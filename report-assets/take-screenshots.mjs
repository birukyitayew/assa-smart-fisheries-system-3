/**
 * ASSA Smart Fisheries System — Internship Report Screenshot Script
 * Captures: Fisher App, Admin Dashboard, Marketplace
 * Run: node report-assets/take-screenshots.js
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const URLS = {
  fisher:    'https://assa-smart-fisheries-system-3.vercel.app/fisher/',
  admin:     'https://assa-smart-fisheries-system-3.vercel.app/admin/',
  market:    'https://assa-smart-fisheries-system-3.vercel.app/market/',
};

const CREDS = {
  fisher:  { email: 'tesfaye@fisher.et',          password: 'fisher123' },
  admin:   { email: 'dawit@fisheries.gov.et',      password: 'admin123'  },
  buyer:   { email: 'mesfin@buyer.et',             password: 'buyer123'  },
};

async function shot(page, filename, description) {
  const fp = path.join(OUT, filename);
  await page.screenshot({ path: fp, fullPage: false });
  console.log(`✅  [${description}] → ${filename}`);
  return fp;
}

async function waitAndShot(page, filename, description, waitMs = 2000) {
  await page.waitForTimeout(waitMs);
  return shot(page, filename, description);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function tryLogin(page, emailSel, passSel, submitSel, email, password) {
  try {
    await page.waitForSelector(emailSel, { timeout: 8000 });
    await page.fill(emailSel, email);
    await page.fill(passSel, password);
    await page.click(submitSel);
    await page.waitForTimeout(2500);
    return true;
  } catch {
    return false;
  }
}

// ─── FISHER APP ──────────────────────────────────────────────────────────────

async function screenshotFisherApp(browser) {
  console.log('\n📱 Fisher App screenshots...');
  const ctx  = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // 1. Landing / Login page
  await page.goto(URLS.fisher, { waitUntil: 'load' });
  await waitAndShot(page, 'fig3a-fisher-login.png', 'Fisher App — Login Page');

  // 2. Try to login
  const loginSelectors = [
    ['input[type="email"]', 'input[type="password"]', 'button[type="submit"]'],
    ['input[name="email"]', 'input[name="password"]', 'button[type="submit"]'],
    ['#email', '#password', 'button[type="submit"]'],
  ];

  let loggedIn = false;
  for (const [e, p, s] of loginSelectors) {
    loggedIn = await tryLogin(page, e, p, s, CREDS.fisher.email, CREDS.fisher.password);
    if (loggedIn) break;
  }

  if (loggedIn) {
    await page.waitForTimeout(3000);
    await shot(page, 'fig3b-fisher-dashboard.png', 'Fisher App — Dashboard (logged in)');

    // Try to navigate to different sections
    const navItems = await page.$$('nav a, aside a, [role="navigation"] a');
    for (let i = 0; i < Math.min(navItems.length, 3); i++) {
      try {
        const text = await navItems[i].textContent();
        await navItems[i].click();
        await page.waitForTimeout(1500);
        const slug = text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await shot(page, `fig3c-fisher-${slug}.png`, `Fisher App — ${text.trim()}`);
      } catch { /* skip */ }
    }
  } else {
    // Still screenshot whatever is visible — may be dashboard directly
    await waitAndShot(page, 'fig3b-fisher-home.png', 'Fisher App — Home', 2000);
  }

  // Wide/mobile view too
  await ctx.close();

  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await ctx2.newPage();
  await page2.goto(URLS.fisher, { waitUntil: 'load' });
  await waitAndShot(page2, 'fig3d-fisher-mobile.png', 'Fisher App — Mobile View');
  await ctx2.close();
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────

async function screenshotAdminDashboard(browser) {
  console.log('\n🖥️  Admin Dashboard screenshots...');
  const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Login page
  await page.goto(URLS.admin, { waitUntil: 'load' });
  await waitAndShot(page, 'fig4a-admin-login.png', 'Admin Dashboard — Login Page');

  // 2. Try login
  const loginSelectors = [
    ['input[type="email"]', 'input[type="password"]', 'button[type="submit"]'],
    ['input[name="email"]', 'input[name="password"]', 'button[type="submit"]'],
    ['#email', '#password', 'button[type="submit"]'],
  ];

  let loggedIn = false;
  for (const [e, p, s] of loginSelectors) {
    loggedIn = await tryLogin(page, e, p, s, CREDS.admin.email, CREDS.admin.password);
    if (loggedIn) break;
  }

  await page.waitForTimeout(3000);

  // 3. Main dashboard overview
  await shot(page, 'fig4b-admin-overview.png', 'Admin Dashboard — Main Overview');

  if (loggedIn) {
    // Try sidebar navigation items
    const navLinks = await page.$$('nav a, aside a, [role="navigation"] a, [data-sidebar] a');
    const visited = new Set();

    for (let i = 0; i < Math.min(navLinks.length, 5); i++) {
      try {
        const text  = await navLinks[i].textContent();
        const clean = text.trim();
        if (visited.has(clean) || !clean) continue;
        visited.add(clean);

        await navLinks[i].click();
        await page.waitForTimeout(1800);
        const slug = clean.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await shot(page, `fig4c-admin-${slug}.png`, `Admin — ${clean}`);
      } catch { /* skip */ }
    }

    // Try the map view if exists
    try {
      const mapLink = await page.$('a[href*="map"], a[href*="location"], button:has-text("Map")');
      if (mapLink) {
        await mapLink.click();
        await page.waitForTimeout(3000);
        await shot(page, 'fig4d-admin-map.png', 'Admin Dashboard — Map View');
      }
    } catch { /* skip */ }
  }

  await ctx.close();
}

// ─── MARKETPLACE ─────────────────────────────────────────────────────────────

async function screenshotMarketplace(browser) {
  console.log('\n🐟 Marketplace screenshots...');
  const ctx  = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // 1. Home / Landing
  await page.goto(URLS.market, { waitUntil: 'load' });
  await waitAndShot(page, 'fig5a-market-home.png', 'Marketplace — Home Page');

  // 2. Try login as buyer
  const loginSelectors = [
    ['input[type="email"]', 'input[type="password"]', 'button[type="submit"]'],
    ['input[name="email"]', 'input[name="password"]', 'button[type="submit"]'],
    ['#email', '#password', 'button[type="submit"]'],
  ];

  let loggedIn = false;
  for (const [e, p, s] of loginSelectors) {
    loggedIn = await tryLogin(page, e, p, s, CREDS.buyer.email, CREDS.buyer.password);
    if (loggedIn) break;
  }

  await page.waitForTimeout(3000);
  await shot(page, 'fig5b-market-listings.png', 'Marketplace — Fish Listings');

  if (loggedIn) {
    // Try browsing listings
    const navLinks = await page.$$('nav a, aside a, [role="navigation"] a');
    const visited = new Set();

    for (let i = 0; i < Math.min(navLinks.length, 4); i++) {
      try {
        const text  = await navLinks[i].textContent();
        const clean = text.trim();
        if (visited.has(clean) || !clean) continue;
        visited.add(clean);

        await navLinks[i].click();
        await page.waitForTimeout(1500);
        const slug = clean.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await shot(page, `fig5c-market-${slug}.png`, `Marketplace — ${clean}`);
      } catch { /* skip */ }
    }

    // Click a listing card if any
    try {
      const card = await page.$('[data-listing], .listing-card, article, [class*="card"]');
      if (card) {
        await card.click();
        await page.waitForTimeout(1500);
        await shot(page, 'fig5d-market-listing-detail.png', 'Marketplace — Listing Detail');
      }
    } catch { /* skip */ }
  }

  await ctx.close();
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('🚀 Starting ASSA screenshot capture...');
  console.log(`📁 Output folder: ${OUT}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    await screenshotFisherApp(browser);
    await screenshotAdminDashboard(browser);
    await screenshotMarketplace(browser);
  } finally {
    await browser.close();
  }

  // Summary
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\n✅ Done! ${files.length} screenshots saved to:\n   ${OUT}`);
  console.log('\nFiles:');
  files.sort().forEach(f => console.log(`   • ${f}`));
})();
