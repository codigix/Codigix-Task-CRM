import { API_BASE_URL } from '../config/environment';

/**
 * Phone / desktop notifications through Web Push.
 *
 * iPhone/iPad: only works from the CRM added to the Home Screen (Share → Add to Home Screen),
 * on iOS 16.4 or newer, and the permission must be asked from a tap. Android and desktop work
 * in the browser. Each device that turns it on is registered with the server, which then
 * sends chat notifications even when the CRM is in the background or closed.
 */

const FLAG = 'pushEnabledForUser';

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
/** On iOS, notifications need the Home Screen app first. */
export const needsHomeScreen = () => isIOS() && !isStandalone();
export const permission = () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

const registration = async () => {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing || navigator.serviceWorker.register('/service-worker.js');
};

const sendSubscription = async (sub) => {
  const res = await fetch(`${API_BASE_URL}/push/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON ? sub.toJSON() : sub })
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not register this device');
};

const subscribeDevice = async () => {
  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const r = await fetch(`${API_BASE_URL}/push/public-key`);
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.publicKey) throw new Error(d.error || 'Notifications are not available right now');
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(d.publicKey) });
  }
  await sendSubscription(sub);
  return sub;
};

/** Call from a tap / click: asks permission and registers this device. */
export const enablePush = async (userId) => {
  if (needsHomeScreen()) throw new Error('On iPhone/iPad, add the CRM to your Home Screen first, then open it from there.');
  if (!pushSupported()) throw new Error('This browser cannot show notifications.');
  const p = await Notification.requestPermission();
  if (p !== 'granted') return false;
  await subscribeDevice();
  try { localStorage.setItem(FLAG, String(userId || '')); } catch (e) { /* storage unavailable */ }
  return true;
};

/** On app start: keep this device registered for whoever is signed in. */
export const syncPush = async (userId) => {
  if (!pushSupported() || permission() !== 'granted' || needsHomeScreen()) return false;
  try {
    await subscribeDevice();
    try { localStorage.setItem(FLAG, String(userId || '')); } catch (e) { /* storage unavailable */ }
    return true;
  } catch (e) { return false; }
};

export const pushActiveFor = (userId) => {
  try { return permission() === 'granted' && localStorage.getItem(FLAG) === String(userId || ''); } catch (e) { return false; }
};

/** On sign-out: stop this device getting the previous person's notifications. */
export const forgetPushOnLogout = async () => {
  try { localStorage.removeItem(FLAG); } catch (e) { /* storage unavailable */ }
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = reg && await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch(`${API_BASE_URL}/push/unsubscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  } catch (e) { /* nothing to undo */ }
};

/** Show a notification right now (page open) — through the service worker where required (Android). */
export const showLocalNotification = async (title, options) => {
  if (permission() !== 'granted') return false;
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration('/') : null;
    if (reg) { await reg.showNotification(title, options); return true; }
  } catch (e) { /* fall through */ }
  try { const n = new Notification(title, options); n.onclick = () => { window.focus(); if (options?.data?.url) window.location.assign(options.data.url); n.close(); }; return true; } catch (e) { return false; }
};

export const sendTestPush = async () => {
  const r = await fetch(`${API_BASE_URL}/push/test`, { method: 'POST' });
  return r.ok ? (await r.json()).sent : 0;
};
