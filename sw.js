// Service Worker
// Caches pages visited by agent for viewing offline

const CACHE_NAME = 'adodson.com';

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
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

      const responseToCache = response.clone();

      caches.open(CACHE_NAME)
      .then(cache => {
        cache.put(event.request, responseToCache);
      });

      return response;
    }, 
    () => {
      // return the cached version
      return caches.match(event.request).then(resp => {

        // There is no matching cache
        if (!resp && event.request.mode === 'navigate') {
          // This is the initial page, we can provide an offline experience
          // Lets test this by writing to the console.
          console.log(`Could not load ${event.request.url}`);
        }

        return resp;
      });
    })
  );
});