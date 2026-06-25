import { test, expect } from '@playwright/test';
import { pickCity, selectByOption } from './helpers';

test('Festivals view lists the major festivals', async ({ page }) => {
  await page.goto('/#/festivals/2026'); // computed off-thread in the worker
  await expect(page.getByText(/Holi/).first()).toBeVisible();
});

test('Deep-linking a date shows that day’s festival', async ({ page }) => {
  await page.goto('/#/day/2026-11-08'); // Diwali
  await expect(page.getByText('Diwali')).toBeVisible();
});

test('A festival in the list links through to its day', async ({ page }) => {
  await page.goto('/#/festivals/2026');
  await page.locator('a[href*="#/day/"]').first().click();
  await expect(page).toHaveURL(/#\/day\/\d{4}-\d\d-\d\d/);
});

test('Day pager navigates to the previous day', async ({ page }) => {
  await page.goto('/#/day/2026-11-08');
  await page.getByRole('link', { name: 'Previous day' }).click();
  await expect(page).toHaveURL(/#\/day\/2026-11-07/);
});

test('Switching language to Hindi renders Devanagari', async ({ page }) => {
  await page.goto('/#/settings');
  await selectByOption(page, 'hi').selectOption('hi');
  await page.goto('/#/');
  await expect(page.locator('body')).toContainText(/[ऀ-ॿ]/); // Devanagari block
});

test('Dark theme applies and persists across reload', async ({ page }) => {
  await page.goto('/#/settings');
  await selectByOption(page, 'dark').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('12-hour time format shows AM/PM times', async ({ page }) => {
  await page.goto('/#/settings');
  await selectByOption(page, '12h').selectOption('12h');
  await page.goto('/#/');
  await expect(page.locator('body')).toContainText(/\b(AM|PM)\b/);
});

test('Month-system toggle switches the calendar to Amanta', async ({ page }) => {
  await page.goto('/#/settings');
  await selectByOption(page, 'amanta').selectOption('amanta');
  await page.goto('/#/month/2026-06');
  await expect(page.getByText(/Amanta/i)).toBeVisible();
});

test('Week-start toggle puts Monday first in the grid header', async ({ page }) => {
  await page.goto('/#/settings');
  await selectByOption(page, 'monday').selectOption('monday');
  await page.goto('/#/month/2026-06');
  await expect(page.getByRole('columnheader').first()).toHaveText(/Somavara|Monday/);
});

test('Changing the location is reflected in Settings', async ({ page }) => {
  await page.goto('/#/settings');
  await pickCity(page, 'Chennai');
  await expect(page.locator('body')).toContainText(/Chennai/);
});

test('No horizontal overflow on the main routes at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['#/', '#/month/2026-06', '#/festivals/2026', '#/kundli', '#/settings']) {
    await page.goto('/' + route);
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `overflow on ${route}`).toBeLessThanOrEqual(0);
  }
});
