'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Use the current network version. Do not cache journal data or intercept the photo app.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const base = new URL('./', self.location.href);
  if (event.request.method === 'GET' && url.origin === base.origin &&
      (url.pathname === base.pathname || url.pathname === new URL('index.html', base).pathname)) {
    event.respondWith(fetch(event.request, { cache: 'no-cache' }));
  }
});
