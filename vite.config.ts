import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $components: resolve(__dirname, 'src/components'),
    },
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['robots.txt', 'icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Panchanga',
        short_name: 'Panchanga',
        description:
          'Offline Hindu calendar (panchanga) — tithi, nakshatra, yoga, karana, festivals — with Vedic birth charts (kundli).',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fdf6e3',
        theme_color: '#8b1818',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    // No prod sourcemaps: this is an offline-first PWA and shipping ~1.5 MB of
    // .map files to the CDN bloats the deploy with no user benefit. Source is
    // public on GitHub; build locally with `--sourcemap` when debugging.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('astronomy-engine')) return 'ephemeris';
          return undefined;
        },
      },
    },
  },
});
