const CACHE_NAME = '1010tool-v6';
const MODEL_CACHE_NAME = '1010tool-models-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './js/app.js',
  './js/passport-studio.js'
];

function isCacheableMediaPipeRequest(url) {
  return (
    (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('@mediapipe/tasks-vision')) ||
    (url.hostname === 'storage.googleapis.com' && url.pathname.startsWith('/mediapipe-models/'))
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== MODEL_CACHE_NAME)
          .map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only cache GET requests, avoid caching user data
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol.startsWith('chrome-extension') || url.protocol === 'data:') return;

  // Cache MediaPipe WASM and tflite models permanently after first download
  if (isCacheableMediaPipeRequest(url)) {
    event.respondWith(
      caches.open(MODEL_CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
