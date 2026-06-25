import { test, expect } from '@playwright/test';
import { cast, pickCity, selectByOption } from './helpers';

test('Milan / Match computes a guna-milan score out of 36', async ({ page }) => {
  await page.goto('/#/kundli');
  await page.getByRole('tab', { name: 'Match (Milan)' }).click();
  const groom = page.getByRole('group', { name: 'Groom' });
  const bride = page.getByRole('group', { name: 'Bride' });
  await groom.getByLabel('Date', { exact: true }).fill('1990-05-15');
  await pickCity(groom, 'Mumbai');
  await bride.getByLabel('Date', { exact: true }).fill('1992-08-20');
  await pickCity(bride, 'Chennai');
  await page.getByRole('button', { name: 'Match', exact: true }).click();
  await expect(page.getByText(/\/\s*36\b/)).toBeVisible(); // the "/ 36" score denominator
});

test('A cast chart saves and can be loaded back after reload', async ({ page }) => {
  await page.goto('/#/kundli');
  await cast(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: /Saved/ })).toBeVisible(); // ✓ Saved
  await page.reload();
  await page.getByRole('button', { name: /Unnamed/ }).click(); // the saved-chart chip
  await expect(page.getByText(/Computed with .* ayanamsa/i)).toBeVisible();
});

test('Kundli toggles from Rashi (D1) to Navamsa (D9)', async ({ page }) => {
  await page.goto('/#/kundli');
  await cast(page);
  const navamsa = page.getByRole('button', { name: /Navamsa \(D9\)/ });
  await navamsa.click();
  await expect(navamsa).toHaveAttribute('aria-pressed', 'true');
});

test('Clicking a day in the Month grid opens that Day', async ({ page }) => {
  await page.goto('/#/month/2026-06');
  await page.getByRole('gridcell').first().click();
  await expect(page).toHaveURL(/#\/day\/2026-06-\d\d/);
});

test('Devanagari numerals render as Devanagari digits', async ({ page }) => {
  await page.goto('/#/settings');
  await selectByOption(page, 'devanagari').selectOption('devanagari');
  await page.goto('/#/month/2026-06');
  await expect(page.locator('body')).toContainText(/[०-९]/); // Devanagari digit block
});

test('Transliteration off switches graha names to Western (Mars, not Mangala)', async ({ page }) => {
  await page.goto('/#/settings');
  await selectByOption(page, 'off').selectOption('off');
  await page.goto('/#/kundli');
  await cast(page);
  await expect(page.getByText(/\bMars\b/).first()).toBeVisible();
  await expect(page.getByText(/Maṅgala|Mangala/)).toHaveCount(0);
});

test('The Kundli form draft survives navigating away and back', async ({ page }) => {
  await page.goto('/#/kundli');
  await page.getByLabel(/date of birth/i).fill('1985-03-21');
  await page.goto('/#/');
  await page.goto('/#/kundli');
  await expect(page.getByLabel(/date of birth/i)).toHaveValue('1985-03-21');
});
