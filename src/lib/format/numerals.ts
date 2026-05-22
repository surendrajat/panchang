// Numeral system rendering: Latin (1, 2, 3 — the international form
// of Hindu numerals) and Devanagari (१, २, ३ — the Indic
// script form).
// More scripts (Tamil, Telugu, Kannada) ship in Phase 2.

const DEVANAGARI: readonly string[] = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export type NumeralSystem = 'latin' | 'devanagari';

export function renderNumber(n: number, system: NumeralSystem = 'latin'): string {
  return applyNumerals(String(n), system);
}

// Convert any ASCII digit characters in `text` to the selected numeral
// system, leaving the rest of the string untouched. Single helper used
// everywhere — dates, times, durations, percentages — so numerals stay
// consistent across the app regardless of where the string was built.
export function applyNumerals(text: string, system: NumeralSystem): string {
  if (system === 'latin') return text;
  return text.replace(/\d/g, (d) => DEVANAGARI[Number(d)]);
}
