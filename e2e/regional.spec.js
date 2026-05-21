// @ts-check
const { test, expect } = require('@playwright/test');

const NATIONAL_ADMIN = { email: 'dawit@fisheries.gov.et', pass: 'admin123' };
const REGIONAL_ADMIN = { email: 'regional@ziway.gov.et', pass: 'admin123' };

async function adminLogin(page, creds) {
  await page.goto('login');
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.pass);
  await page.getByRole('button', { name: /sign in|ግባ/i }).click();
  await page.waitForURL(/\/admin\/?$/);
}

test.describe('Phase 5 — Multi-region admin', () => {
  test('regional admin sees Ziway scope only', async ({ page }) => {
    await adminLogin(page, REGIONAL_ADMIN);
    await expect(page.getByText(/Lake Ziway|የዝዋይ ሐይቅ/i).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: /daily catches|ዕለታዊ/i }).click();
    await expect(page).toHaveURL(/catches/);
    const tanaRefs = page.getByText(/Lake Tana –/i);
    await expect(tanaRefs).toHaveCount(0, { timeout: 5000 });
  });

  test('national admin can switch to Lake Ziway', async ({ page }) => {
    await adminLogin(page, NATIONAL_ADMIN);
    const selector = page.getByRole('combobox').first();
    await expect(selector).toBeVisible({ timeout: 15000 });
    await selector.click();
    await page.getByRole('option', { name: /Lake Ziway/i }).click();

    await page.getByRole('link', { name: /fleet|ጀልባ/i }).click();
    await expect(page).toHaveURL(/fleet/);
    await expect(page.locator('body')).not.toContainText('404');
  });
});
