// Service Worker
// Caches pages visited by agent for viewing offline

const CACHE_NAME = 'adodson.com';

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request)
    .then(response => {
      // Check if we received a valid response
      if(!response || response.status !== 200 || response.type !== 'basic') {
        return response || caches.match(event.request);
      }

      let responseToCache = response.clone();

      caches.open(CACHE_NAME)
      .then(function(cache) {
        cache.put(event.request, responseToCache);
      });

      return response;
    }, 
    () => {
      return caches.match(event.request);
    })
  );
});