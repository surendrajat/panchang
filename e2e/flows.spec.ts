import { test, expect } from '@playwright/test';

// Deeper flows: festivals, deep-linking, day navigation, i18n, theme, location,
// and responsive layout. Each test gets a fresh, isolated context.

test('Festivals view lists the major festivals', async ({ page }) => {
  await page.goto('/#/festivals/2026'); // computed off-thread in the worker
  await expect(page.locator('body')).toContainText(/Holi/);
});

test('Deep-linking a date shows that day’s festival', async ({ page }) => {
  await page.goto('/#/day/2026-11-08'); // Diwali
  await expect(page.locator('body')).toContainText('Diwali');
});

test('Day pager navigates to the previous day', async ({ page }) => {
  await page.goto('/#/day/2026-11-08');
  await page.getByRole('link', { name: 'Previous day' }).click();
  await expect(page).toHaveURL(/#\/day\/2026-11-07/);
});

test('Switching language to Hindi renders Devanagari', async ({ page }) => {
  await page.goto('/#/settings');
  const lang = page.locator('select').filter({ has: page.locator('option[value="hi"]') });
  await lang.selectOption('hi');
  await page.goto('/#/');
  await expect(page.locator('body')).toContainText(/[ऀ-ॿ]/); // Devanagari block
});

test('Dark theme applies and persists across reload', async ({ page }) => {
  await page.goto('/#/settings');
  const theme = page.locator('select').filter({ has: page.locator('option[value="dark"]') });
  await theme.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('Changing the location is reflected in Settings', async ({ page }) => {
  await page.goto('/#/settings');
  await page.locator('input[type=search]').fill('Chennai');
  await page.getByText(/Chennai/i).first().click();
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
