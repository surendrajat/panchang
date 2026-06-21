// App entry. Imports global styles in the canonical order:
//   tokens → reset → app.

import './styles/tokens.css';
import './styles/reset.css';
import './styles/app.css';

import { mount } from 'svelte';
import App from './App.svelte';
// Static import: App.svelte already imports this store eagerly, so importing it
// dynamically here only earned an INEFFECTIVE_DYNAMIC_IMPORT build warning
// without actually splitting it out. The module is tiny.
import { onSwUpdateReady } from './lib/state/sw-update.svelte';

const target = document.getElementById('app');
if (!target) {
  throw new Error('Root element #app not found in index.html');
}

mount(App, { target });

// PWA registration via vite-plugin-pwa's virtual module — imported lazily and
// only in production builds, so the dev experience stays snappy.
if (import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          // A new build's SW is waiting → surface the in-app reload banner.
          // updateSW(true) activates it (skipWaiting) and reloads the page.
          onSwUpdateReady(() => updateSW(true));
        },
      });
    })
    .catch(() => {
      /* registration is best-effort; the app works without SW. */
    });
}
