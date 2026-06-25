import { test, expect } from '@playwright/test';
import { cast, selectByOption } from './helpers';

// Each test runs in a fresh, isolated browser context (empty IndexedDB).

test('Today renders a panchanga', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByText('Nakshatra').first()).toBeVisible(); // a panchanga anga rendered
});

test('Month grid renders and the arrow navigates', async ({ page }) => {
  await page.goto('/#/month/2026-06');
  await expect(page.getByRole('gridcell').first()).toBeVisible();
  expect(await page.getByRole('gridcell').count()).toBeGreaterThanOrEqual(28);
  await page.getByRole('link', { name: /next month/i }).click();
  await expect(page).toHaveURL(/#\/month\/2026-07/);
});

test('Settings exposes only Lahiri/Raman + mean/true, and changes persist', async ({ page }) => {
  await page.goto('/#/settings');
  const ayanamsa = selectByOption(page, 'lahiri');
  const node = selectByOption(page, 'mean');
  await expect(ayanamsa.locator('option')).toHaveText([/Lahiri/, /Raman/]); // exactly two
  await expect(node.locator('option')).toHaveCount(2);
  await ayanamsa.selectOption('raman');
  await node.selectOption('mean');
  await page.reload();
  await expect(ayanamsa).toHaveValue('raman');
  await expect(node).toHaveValue('mean');
});

test('Kundli casts a chart and labels the ayanamsa', async ({ page }) => {
  await page.goto('/#/kundli');
  await cast(page);
  await expect(page.getByText(/Computed with .* ayanamsa/i)).toBeVisible();
});

test('Sky view draws the dome', async ({ page }) => {
  await page.goto('/#/sky');
  await expect(page.locator('svg').first()).toBeVisible();
});

test('Learn guide loads with content', async ({ page }) => {
  await page.goto('/#/learn');
  expect(await page.getByRole('heading').count()).toBeGreaterThan(3);
});
