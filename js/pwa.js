// The installable app: registers the service worker (only where browsers allow one: https, or
// this machine during development), keeps the browser's install prompt for an "Install app"
// button, and knows when to show the iPhone hint instead (Safari has no prompt, only Share ›
// Add to Home Screen). Once the app runs installed, neither is shown.

let deferred = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn());

export function onInstallChange(fn) {
  listeners.add(fn);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

// 'installed' | 'prompt' (a button can install) | 'ios' (show the Share hint) | 'none'
export function installState() {
  if (isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  if (isIosSafari()) return 'ios';
  return 'none';
}

export async function promptInstall() {
  if (!deferred) return;
  deferred.prompt();
  try { await deferred.userChoice; } catch { /* dismissed */ }
  deferred = null;
  notify();
}

export function startPwa() {
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if ('serviceWorker' in navigator && secure) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* the app still runs online */ });
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}
