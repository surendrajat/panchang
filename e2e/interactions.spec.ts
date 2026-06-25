import { test, expect, type Page } from '@playwright/test';

async function cast(page: Page) {
  await page.locator('input[type=date]').first().fill('1990-05-15');
  await page.locator('input[type=time]').first().fill('08:30');
  await page.locator('input[type=search]').first().fill('Mumbai');
  await page.getByText(/Mumbai/i).first().click();
  await page.getByRole('button', { name: /Cast Kundli/i }).click();
  await expect(page.locator('.method-note')).toBeVisible();
}

test.describe('GPS', () => {
  // mock the device location at Mumbai's coordinates
  test.use({ geolocation: { latitude: 19.076, longitude: 72.877 }, permissions: ['geolocation'] });

  test('"Use my location" sets the location from GPS', async ({ page }) => {
    await page.goto('/#/settings');
    await page.getByRole('button', { name: /Use my location/i }).click();
    await expect(page.locator('body')).toContainText(/Mumbai/); // "Mumbai (near)"
  });
});

test('Sky time controls: pause freezes, a speed advances, Now resumes live', async ({ page }) => {
  await page.goto('/#/sky');
  const clock = page.locator('.clock').first();
  await expect(clock).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(200);
  const frozen = await clock.textContent();
  await page.waitForTimeout(700);
  expect(await clock.textContent(), 'paused clock should not move').toBe(frozen);
  await page.getByRole('button', { name: '1 week/s' }).click();
  await page.waitForTimeout(1200);
  expect(await clock.textContent(), 'a fast speed should advance the moment').not.toBe(frozen);
  const now = page.getByRole('button', { name: /Now/ });
  await now.click();
  await expect(now).toHaveClass(/\bon\b/);
});

test('Sky shows the "Tonight\'s sky" observation table with body rows', async ({ page }) => {
  await page.goto('/#/sky');
  const table = page.locator('table.obs__table');
  await expect(table).toBeVisible();
  expect(await table.locator('tr').count(), 'header + bodies').toBeGreaterThan(5);
});

test('Learn shares the time clock — a speed advances the moment', async ({ page }) => {
  await page.goto('/#/learn');
  const bar = page.locator('.timebar').first();
  const clock = bar.locator('.clock');
  await expect(clock).toBeVisible();
  await bar.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(200);
  const frozen = await clock.textContent();
  await bar.getByRole('button', { name: '1 week/s' }).click();
  await page.waitForTimeout(1200);
  expect(await clock.textContent()).not.toBe(frozen);
});

test('Kundli without a known birth time omits houses (shows —)', async ({ page }) => {
  await page.goto('/#/kundli');
  await page.getByRole('checkbox').check(); // "I don't know the birth time"
  await page.locator('input[type=date]').first().fill('1990-05-15');
  await page.locator('input[type=search]').first().fill('Mumbai');
  await page.getByText(/Mumbai/i).first().click();
  await page.getByRole('button', { name: /Cast Kundli/i }).click();
  await expect(page.locator('.method-note')).toBeVisible();
  await expect(page.locator('.gt-house[role="cell"]').first()).toHaveText('—');
});

test('A cast chart shows the Vimshottari dasha', async ({ page }) => {
  await page.goto('/#/kundli');
  await cast(page);
  await expect(page.getByRole('heading', { name: /Vimshottari Dasha/i })).toBeVisible();
});
