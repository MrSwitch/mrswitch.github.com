// Service Worker
// Caches pages visited by agent for viewing offline

const CACHE_NAME = 'adodson.com';
const fallover = [];

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
  const request = event.request;
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

        // Fallover
        if (resp) {
          return resp;
        }

        // Does this have a fallover?
        const match = fallover.filter(item => {
          return (
              (!item.mode || item.mode === request.mode)
              && (!item.url || request.url.match(item.url))
          );
        })[0];

        if (match) {
          return caches.match(new Request(match.fallover));
        }

        return resp;
      });
    })
  );
});

self.addEventListener('message', event => {

  const data = event.data;

  // Open cache for actions
  caches.open(CACHE_NAME).then(cache => {
    switch(data.type) {
      case 'fallover': 
        // Has this already been added?
        let match = fallover.filter(item => item.mode === data.mode && item.url === data.url)[0];
        if (match) {
          // does this need
          if (match.fallover === data.fallover) {
            // nothing to do
            return;
          }
        }
        const frequest = new Request(data.fallover, {mode: 'no-cors'});
        return fetch(frequest).then(response => {
          // Just update the existing record
          if (match) {
            match.fallover = data.fallover;
          }
          else {
            fallover.push(data);
          }
          return cache.put(data.fallover, response);
        });

      case 'add':
        const request = new Request(data.url, {mode: 'no-cors'});
        return fetch(request).then(response => cache.put(data.url, response));    
    }
  });

});