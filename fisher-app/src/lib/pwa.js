/**
 * Service worker registration + install-prompt plumbing for the fisher PWA.
 *
 * Registration only happens for production builds served from HTTPS or
 * localhost — `vite dev` will skip it, matching the way the SW is shipped
 * (the SW file lives in `public/` and is only resolved from the built bundle).
 */

import { toast } from 'sonner';

let deferredInstallEvent = null;
const installListeners = new Set();

function emitInstallAvailability() {
  installListeners.forEach((cb) => {
    try {
      cb(Boolean(deferredInstallEvent));
    } catch {
      /* ignore listener errors */
    }
  });
}

export function onInstallAvailabilityChange(listener) {
  installListeners.add(listener);
  listener(Boolean(deferredInstallEvent));
  return () => {
    installListeners.delete(listener);
  };
}

export async function promptInstall() {
  if (!deferredInstallEvent) return 'unavailable';
  const evt = deferredInstallEvent;
  deferredInstallEvent = null;
  emitInstallAvailability();
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    return choice?.outcome ?? 'dismissed';
  } catch {
    return 'error';
  }
}

export function bindInstallPromptCapture() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallEvent = event;
    emitInstallAvailability();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallEvent = null;
    emitInstallAvailability();
  });
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  const base = import.meta.env.BASE_URL || '/';
  const swUrl = new URL('service-worker.js', new URL(base, window.location.origin)).toString();

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl, { scope: base })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Update available', {
                description: 'A new version of the Fisher app is ready.',
                action: {
                  label: 'Reload',
                  onClick: () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  },
                },
                duration: Infinity,
              });
            }
          });
        });
      })
      .catch(() => {
        /* registration is best-effort */
      });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}
