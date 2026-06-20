// Generates the PNG icon set from a single SVG source. Optional — if
// you already have icons committed, skip this. Requires `sharp` which is
// installed as a dev dep on demand:
//   pnpm add -D sharp && pnpm tsx scripts/build-icons.ts
//
// We don't run this in CI; PNGs are committed.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

interface IconSpec {
  size: number;
  outName: string;
  pad?: boolean; // maskable: pad with safe area
}

const SPECS: IconSpec[] = [
  { size: 192, outName: 'icon-192.png' },
  { size: 512, outName: 'icon-512.png' },
  { size: 512, outName: 'maskable-512.png', pad: true },
];

// sharp is an optional dev dep; we resolve it dynamically so this script
// can be deleted without dragging in a hard dependency. The unknown cast
// keeps the file type-checkable even when sharp isn't installed.
async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sharp: any;
  try {
    sharp = (await import(/* @vite-ignore */ 'sharp' as string)).default;
  } catch {
    console.error('sharp is not installed. Run: pnpm add -D sharp');
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const svgPath = resolve(here, '../public/icons/icon.svg');
  const svg = await readFile(svgPath);

  for (const spec of SPECS) {
    const out = resolve(here, '../public/icons', spec.outName);
    let pipeline = sharp(svg).resize(spec.size, spec.size);
    if (spec.pad) {
      // Maskable icons need ~10% safe padding; we shrink the artwork to
      // ~80% of the canvas and centre on a solid background.
      const inner = Math.round(spec.size * 0.8);
      pipeline = sharp({
        create: {
          width: spec.size,
          height: spec.size,
          channels: 4,
          background: '#fdf6e3',
        },
      }).composite([
        {
          input: await sharp(svg).resize(inner, inner).png().toBuffer(),
          top: Math.round((spec.size - inner) / 2),
          left: Math.round((spec.size - inner) / 2),
        },
      ]);
    }
    const buf = await pipeline.png().toBuffer();
    await writeFile(out, buf);
    // eslint-disable-next-line no-console
    console.log(`wrote ${out} (${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
