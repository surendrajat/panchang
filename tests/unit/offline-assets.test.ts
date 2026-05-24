import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const path = join(dir, entry);
    const stat = statSync(join(ROOT, path));
    if (stat.isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.(ts|svelte|css)$/.test(path)) {
      out.push(path);
    }
  }
  return out;
}

describe('offline asset contract', () => {
  it('does not allow remote Google font origins', () => {
    const checked = [
      ['index.html', read('index.html')],
      ['public/_headers', read('public/_headers')],
      ['src/styles/tokens.css', read('src/styles/tokens.css')],
    ];

    for (const [path, contents] of checked) {
      expect(contents, `${path} must not reference fonts.googleapis.com`).not.toContain(
        'fonts.googleapis.com',
      );
      expect(contents, `${path} must not reference fonts.gstatic.com`).not.toContain(
        'fonts.gstatic.com',
      );
    }
  });

  it('vendors the Devanagari font files referenced by CSS', () => {
    const css = read('src/styles/tokens.css');
    const urls = Array.from(css.matchAll(/url\('([^']+)'\)/g), (match) => match[1]).filter((url) =>
      url.startsWith('/fonts/'),
    );

    expect(urls).toEqual([
      '/fonts/noto-sans-devanagari-devanagari.woff2',
      '/fonts/noto-serif-devanagari-devanagari.woff2',
    ]);

    for (const url of urls) {
      expect(existsSync(join(ROOT, 'public', url)), `${url} should exist in public/`).toBe(true);
    }
    expect(existsSync(join(ROOT, 'public/fonts/OFL.txt')), 'font license should be bundled').toBe(
      true,
    );
  });

  it('does not use runtime network request APIs', () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bnavigator\.sendBeacon\b/,
      /\bWebSocket\b/,
      /\bEventSource\b/,
      /\bimportScripts\s*\(/,
      /\bgtag\b/,
      /\bgoogle-analytics\b/i,
      /\bgoogletagmanager\b/i,
      /\bposthog\b/i,
      /\bsentry\b/i,
    ];
    const violations: string[] = [];

    for (const path of sourceFiles('src')) {
      const contents = read(path);
      for (const pattern of forbidden) {
        if (pattern.test(contents)) violations.push(`${path}: ${pattern}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('PWA precache stays within bundle budget (run pnpm build first)', () => {
    const swPath = join(ROOT, 'dist/sw.js');
    if (!existsSync(swPath)) {
      console.warn('dist/sw.js not found — skipping bundle budget check (run pnpm build first)');
      return;
    }

    const sw = read('dist/sw.js');
    const MAX_ENTRIES = 25;
    const MAX_KIB = 1000;

    // Extract unique precache URLs from the workbox precacheAndRoute call.
    const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
    const unique = [...new Set(urls)];

    expect(
      unique.length,
      `Precache entry count ${unique.length} exceeds ceiling of ${MAX_ENTRIES}`,
    ).toBeLessThanOrEqual(MAX_ENTRIES);

    // Sum actual sizes of the corresponding files in dist/.
    let totalBytes = 0;
    for (const url of unique) {
      try {
        totalBytes += statSync(join(ROOT, 'dist', url)).size;
      } catch {
        // file not found — workbox sometimes references assets by hash that
        // aren't simple paths; ignore safely.
      }
    }

    const totalKiB = totalBytes / 1024;
    expect(
      totalKiB,
      `Precache total ${totalKiB.toFixed(1)} KiB exceeds ceiling of ${MAX_KIB} KiB`,
    ).toBeLessThanOrEqual(MAX_KIB);
  });
});
