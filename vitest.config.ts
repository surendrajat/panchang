import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Separate vitest config — vitest pulls its own vite transitively, so
// keeping vite.config.ts pure-vite avoids type-clash with vite-plugin-*.

export default defineConfig({
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
  },
});
