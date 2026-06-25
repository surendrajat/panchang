import { test, expect } from '@playwright/test';
import { cast } from './helpers';

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
  const clock = page.locator('time').first();
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
  await expect(now).toHaveAttribute('aria-pressed', 'true');
});

test('Sky shows the "Tonight\'s sky" observation table with body rows', async ({ page }) => {
  await page.goto('/#/sky');
  const rows = page.getByRole('table').getByRole('row');
  expect(await rows.count(), 'header + body rows').toBeGreaterThan(5);
});

test('Learn shares the time clock — a speed advances the moment', async ({ page }) => {
  await page.goto('/#/learn');
  const speeds = page.getByRole('group', { name: /Time speed/i });
  const clock = page.locator('time').first();
  await expect(clock).toBeVisible();
  await speeds.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(200);
  const frozen = await clock.textContent();
  await speeds.getByRole('button', { name: '1 week/s' }).click();
  await page.waitForTimeout(1200);
  expect(await clock.textContent()).not.toBe(frozen);
});

test('Kundli without a known birth time omits houses (shows —)', async ({ page }) => {
  await page.goto('/#/kundli');
  await cast(page, { time: null });
  await expect(page.getByRole('cell', { name: '—' }).first()).toBeVisible();
});

test('A cast chart shows the Vimshottari dasha', async ({ page }) => {
  await page.goto('/#/kundli');
  await cast(page);
  await expect(page.getByRole('heading', { name: /Vimshottari Dasha/i })).toBeVisible();
});
