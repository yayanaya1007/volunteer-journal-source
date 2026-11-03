'use strict';
const BASE = new URL('./', self.location.href);
const PAGE = new URL('activity-report-photo.html', BASE);
const CACHE = `activity-report-photo-v1:${BASE.pathname}`;
const ASSETS = ['activity-report-photo.html', 'activity-report-photo-manifest.json',
  'photo-install/install.js', 'photo-install/install.css',
  'photo-install/icon-192.png', 'photo-install/icon-512.png', 'photo-install/icon-180.png'];
const PATHS = new Set(ASSETS.map(path => new URL(path, BASE).pathname));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new URL(path, BASE).href))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin || !PATHS.has(url.pathname)) return;
  const cacheKey = new URL(url.pathname, BASE).href;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(cacheKey, copy)));
    }
    return response;
  }).catch(() => caches.match(cacheKey)));
});
