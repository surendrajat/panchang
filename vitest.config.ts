import { defineConfig } from 'vitest/config';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { resolve } from 'node:path';

// Separate vitest config — vitest pulls its own vite transitively, so
// keeping vite.config.ts pure-vite avoids type-clash with vite-plugin-*.
// The svelte plugin + svelteTesting let component tests render .svelte files
// (those files opt into happy-dom via `// @vitest-environment happy-dom`);
// the engine tests stay in the default node environment.
export default defineConfig({
  plugins: [
    // configFile:false + no forced `runes` → auto-detect per file, so our
    // rune-based components compile as runes while @testing-library/svelte's
    // internal legacy (export let) scaffold still compiles (svelte.config.js
    // forces runes globally, which breaks that scaffold).
    svelte({ configFile: false, preprocess: vitePreprocess() }),
    svelteTesting(),
  ],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $components: resolve(__dirname, 'src/components'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
