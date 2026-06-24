import { test, expect } from '@playwright/test';

// Each test runs in a fresh, isolated browser context (empty IndexedDB), so order
// doesn't matter and the persistence test can't leak into the others.

test('Today renders a panchanga', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('table, .day-card, [class*="card"]').first()).toBeVisible();
});

test('Month grid renders and the arrow navigates', async ({ page }) => {
  await page.goto('/#/month/2026-06');
  await expect(page.locator('.cell').first()).toBeVisible();
  expect(await page.locator('.cell').count()).toBeGreaterThanOrEqual(28);
  await page.locator('a[href*="#/month/"]').last().click(); // next-month arrow
  await expect(page.locator('.cell').first()).toBeVisible();
});

test('Settings exposes only Lahiri/Raman + mean/true, and changes persist', async ({ page }) => {
  await page.goto('/#/settings');
  const ayanamsa = page.locator('select').filter({ has: page.locator('option[value="lahiri"]') });
  const node = page.locator('select').filter({ has: page.locator('option[value="mean"]') });
  // the cleanup: exactly two ayanamsa options, both node options
  await expect(ayanamsa.locator('option')).toHaveText([/Lahiri/, /Raman/]);
  await expect(node.locator('option')).toHaveCount(2);
  // change + reload → persisted
  await ayanamsa.selectOption('raman');
  await node.selectOption('mean');
  await page.reload();
  await expect(ayanamsa).toHaveValue('raman');
  await expect(node).toHaveValue('mean');
});

test('Kundli casts a chart and labels the ayanamsa', async ({ page }) => {
  await page.goto('/#/kundli');
  await page.locator('input[type=date]').fill('1990-05-15');
  await page.locator('input[type=time]').fill('08:30');
  await page.locator('input[type=search]').fill('Mumbai');
  await page.getByText(/Mumbai/i).first().click();
  await page.getByRole('button', { name: /Cast Kundli/i }).click();
  await expect(page.locator('.method-note')).toContainText(/ayanamsa/i);
  await expect(page.locator('svg').first()).toBeVisible(); // the rendered chart
});

test('Sky view draws the dome', async ({ page }) => {
  await page.goto('/#/sky');
  await expect(page.locator('svg').first()).toBeVisible();
});

test('Learn guide loads with content', async ({ page }) => {
  await page.goto('/#/learn');
  expect(await page.locator('p, h1, h2, h3').count()).toBeGreaterThan(3);
});
