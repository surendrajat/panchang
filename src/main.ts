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
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          // Soft prompt — the architecture spec calls for an in-app
          // banner; for v0.1 we just log and let the browser reload.
          // eslint-disable-next-line no-console
          console.info('Panchanga: a new version is available. Reload to update.');
        },
      });
    })
    .catch(() => {
      /* registration is best-effort; the app works without SW. */
    });
}
