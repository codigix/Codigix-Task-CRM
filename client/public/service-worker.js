// Codigix CRM service worker: shows Web Push notifications (chat messages, mentions,
// reactions...) in the phone / desktop notification bar, and opens the right page on click.
// iPhone/iPad need this (iOS 16.4+, CRM added to the Home Screen); Android and desktop use it
// too so notifications arrive while the CRM is in the background or closed.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const isIOS = /iPad|iPhone|iPod/.test(self.navigator.userAgent) || (self.navigator.platform === 'MacIntel' && self.navigator.maxTouchPoints > 1);

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Codigix', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Codigix';
  const options = {
    body: data.body || '',
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/', roomId: data.roomId || null },
    timestamp: Date.now()
  };

  event.waitUntil((async () => {
    // Someone already reading this conversation in a focused window doesn't need a banner.
    // (iOS requires every push to show a notification, so it always shows there.)
    if (!isIOS && data.roomId) {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const reading = windows.some(c => c.focused && c.visibilityState === 'visible' && new URL(c.url).searchParams.get('room') === String(data.roomId));
      if (reading) return;
    }
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.focus();
        if (client.navigate) {
          try { await client.navigate(target); } catch (e) { client.postMessage({ type: 'open-url', url: target }); }
        } else {
          client.postMessage({ type: 'open-url', url: target });
        }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
