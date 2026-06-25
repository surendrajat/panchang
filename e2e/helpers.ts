import { expect, type Page, type Locator } from '@playwright/test';

// Shared e2e helpers. These deliberately use semantic locators (roles, labels,
// accessible names, option values) rather than CSS classes or DOM positions, so a
// styling/layout refactor doesn't break the suite.

/** Fill a LocationPicker search within `scope` and choose the matching city. */
export async function pickCity(scope: Page | Locator, city: string): Promise<void> {
  await scope.getByRole('searchbox').fill(city);
  await scope.getByText(new RegExp(city, 'i')).first().click();
}

/** Cast a birth chart on the Kundli (Birth Chart) tab. Pass `time: null` to cast
 *  with an unknown birth time (ticks the "I don't know the birth time" box). */
export async function cast(
  page: Page,
  opts: { date?: string; time?: string | null; place?: string } = {},
): Promise<void> {
  const { date = '1990-05-15', time = '08:30', place = 'Mumbai' } = opts;
  await page.getByLabel(/date of birth/i).fill(date);
  if (time === null) {
    await page.getByRole('checkbox', { name: /don.?t know the birth time/i }).check();
  } else {
    await page.getByLabel(/time of birth/i).fill(time);
  }
  await pickCity(page, place);
  await page.getByRole('button', { name: /cast kundli/i }).click();
  await expect(page.getByText(/Computed with .* ayanamsa/i)).toBeVisible(); // method note = cast OK
}

/** A <select> located by one of its option values — a stable contract, not a
 *  layout-coupled class or DOM position. */
export function selectByOption(page: Page, value: string): Locator {
  return page.locator('select').filter({ has: page.locator(`option[value="${value}"]`) });
}
