import { test, expect, type Page } from '@playwright/test';

// Cast a birth chart on the Kundli (Birth Chart) tab.
async function cast(page: Page) {
  await page.locator('input[type=date]').first().fill('1990-05-15');
  await page.locator('input[type=time]').first().fill('08:30');
  await page.locator('input[type=search]').first().fill('Mumbai');
  await page.getByText(/Mumbai/i).first().click();
  await page.getByRole('button', { name: /Cast Kundli/i }).click();
  await expect(page.locator('.method-note')).toBeVisible();
}

test('Milan / Match computes a guna-milan score out of 36', async ({ page }) => {
  await page.goto('/#/kundli');
  await page.getByRole('tab', { name: 'Match (Milan)' }).click();
  const dates = page.locator('input[type=date]');
  const places = page.locator('input[type=search]');
  await dates.nth(0).fill('1990-05-15');
  await places.nth(0).fill('Mumbai');
  await page.getByText(/Mumbai/i).first().click();
  await dates.nth(1).fill('1992-08-20');
  await places.nth(1).fill('Chennai');
  await page.getByText(/Chennai/i).first().click();
  await page.getByRole('button', { name: 'Match', exact: true }).click();
  await expect(page.locator('.score-num')).toBeVisible();
  await expect(page.locator('.score-den')).toContainText('36');
});

test('A cast chart saves and reappears as a saved chart after reload', async ({ page }) => {
  await page.goto('/#/kundli');
  await cast(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: /Saved/ })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Saved charts/i)).toBeVisible();
});

test('Kundli toggles from Rashi (D1) to Navamsa (D9)', async ({ page }) => {
  await page.goto('/#/kundli');
  await cast(page);
  const navamsa = page.getByRole('button', { name: /Navamsa \(D9\)/ });
  await navamsa.click();
  await expect(navamsa).toHaveClass(/vt--on/);
  await expect(page.locator('svg').first()).toBeVisible(); // chart still drawn
});

test('Clicking a day in the Month grid opens that Day', async ({ page }) => {
  await page.goto('/#/month/2026-06');
  await page.locator('button.cell').first().click();
  await expect(page).toHaveURL(/#\/day\/2026-06-\d\d/);
});

test('Devanagari numerals render as Devanagari digits', async ({ page }) => {
  await page.goto('/#/settings');
  const numerals = page.locator('select').filter({ has: page.locator('option[value="devanagari"]') });
  await numerals.selectOption('devanagari');
  await page.goto('/#/month/2026-06');
  await expect(page.locator('body')).toContainText(/[०-९]/); // Devanagari digit block
});

test('Transliteration off switches graha names to Western (Mars, not Mangala)', async ({ page }) => {
  await page.goto('/#/settings');
  const translit = page.locator('select').filter({ has: page.locator('option[value="off"]') });
  await translit.selectOption('off');
  await page.goto('/#/kundli');
  await cast(page);
  await expect(page.locator('body')).toContainText(/Mars/);
  await expect(page.locator('body')).not.toContainText(/Maṅgala|Mangala/);
});
