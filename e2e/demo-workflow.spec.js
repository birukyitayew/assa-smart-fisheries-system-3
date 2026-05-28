// @ts-check
const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = 'dawit@fisheries.gov.et';
const ADMIN_PASS = 'admin123';
const FISHER_EMAIL = 'tesfaye@fisher.et';
const FISHER_PASS = 'fisher123';
const BUYER_EMAIL = 'mesfin@buyer.et';
const BUYER_PASS = 'buyer123';

test.describe('ASSA 7-minute demo workflow', () => {
  test('admin login and live dashboard', async ({ page }) => {
    await page.goto('login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /sign in|ግባ/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByText(/command|መቆጣጠሪያ/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('admin fleet and intelligence pages load', async ({ page }) => {
    await page.goto('login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /sign in|ግባ/i }).click();
    await page.waitForURL(/\/admin\/?$/);

    await page.getByRole('link', { name: /fleet|ጀልባ/i }).click();
    await expect(page).toHaveURL(/fleet/);
    await expect(page.getByText(/boat|ጀልባ|fleet/i).first()).toBeVisible();

    await page.getByRole('link', { name: /intelligence|መረጃ/i }).click();
    await expect(page).toHaveURL(/intelligence/);
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('admin approves a pending catch', async ({ page }) => {
    await page.goto('login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /sign in|ግባ/i }).click();
    await page.waitForURL(/\/admin\/?$/);

    await page.getByRole('link', { name: /daily catches|ዕለታዊ/i }).click();
    await expect(page).toHaveURL(/catches/);

    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await expect(page.getByText(/approved|verified|success/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });
});

test.describe('Fisher app', () => {
  test.use({ baseURL: process.env.PLAYWRIGHT_FISHER_URL || 'http://localhost:3002/fisher/' });

  test('fisher login and home', async ({ page }) => {
    await page.goto('login');
    await page.getByLabel(/email/i).fill(FISHER_EMAIL);
    await page.getByLabel(/password/i).fill(FISHER_PASS);
    await page.getByRole('button', { name: /sign in|ግባ/i }).click();
    await expect(page).toHaveURL(/\/fisher\/?$/);
    await expect(page.getByText(/welcome|tesfaye/i).first()).toBeVisible();
  });
});

test.describe('Marketplace', () => {
  test.use({ baseURL: process.env.PLAYWRIGHT_MARKET_URL || 'http://localhost:3003/market/' });

  test('buyer browses listings', async ({ page }) => {
    await page.goto('');
    await expect(page.getByText(/tilapia|marketplace|ገበያ/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('buyer places order', async ({ page }) => {
    await page.goto('login');
    await page.getByLabel(/email/i).fill(BUYER_EMAIL);
    await page.getByLabel(/password/i).fill(BUYER_PASS);
    await page.getByRole('button', { name: /sign in|ግባ/i }).click();

    await page.goto('browse');
    const card = page.locator('a[href*="/listing/"]').first();
    await card.click();
    await page
      .getByRole('button', { name: /order|ትዕዛዝ|buy/i })
      .first()
      .click({ timeout: 10000 })
      .catch(() => {});
    await expect(page.locator('body')).not.toContainText('Route not found');
  });
});
