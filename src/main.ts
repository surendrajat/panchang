// App entry. Imports global styles in the canonical order:
//   tokens → reset → app.

import './styles/tokens.css';
import './styles/reset.css';
import './styles/app.css';

import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) {
  throw new Error('Root element #app not found in index.html');
}

mount(App, { target });

// PWA registration via vite-plugin-pwa's virtual module. We import
// lazily so the dev experience stays snappy and so the registration
// only happens in production builds.
if (import.meta.env.PROD) {
  Promise.all([import('virtual:pwa-register'), import('./lib/state/sw-update.svelte')])
    .then(([{ registerSW }, { onSwUpdateReady }]) => {
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
