import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
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
});
