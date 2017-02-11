// Service Worker
// Caches pages visited by agent for viewing offline

const CACHE_NAME = 'adodson_sw';
const VERSION = 1;

const DB = require('./indexdb');
const db = new DB('adodson_sw', VERSION, {
	falloverStore: {
		autoIncrement: true
	}
});

const falloverStore = db('falloverStore');

self.addEventListener('install', event => {
	// Perform install steps
	event.waitUntil(
		caches.open(CACHE_NAME).then(() => {
			// Opened cache
		})
	);
});

self.addEventListener('fetch', event => {
	const request = event.request;
	event.respondWith(fetch(event.request)
	.then(response => {
			// Check if we received a valid response
		if (!response || response.status !== 200 || response.type !== 'basic') {
			return response || caches.match(event.request);
		}

		const responseToCache = response.clone();

		caches.open(CACHE_NAME).then(cache => {
			cache.put(event.request, responseToCache);
		});

		return response;
	},
	() =>
		// return the cached version
		caches.match(event.request).then(resp => {

			// Fallover
			if (resp) {
				return resp;
			}

			// Does this have a fallover?
			return falloverStore.all().then(fallover => {

				const match = fallover.filter(item => (
					(!item.mode || item.mode === request.mode)
					&& (!item.url || request.url.match(item.url))
				))[0];

				if (match) {
					return caches.match(new Request(match.fallover));
				}

				return resp;
			});
		})
	));
});

self.addEventListener('message', event => {

	const data = event.data;

	// Open cache for actions
	caches.open(CACHE_NAME).then(cache => {
		switch (data.type) {

			case 'fallover': {
				// Has this already been added?
				falloverStore.all().then(fallover => {
					const match = fallover.filter(item => item.mode === data.mode && item.url === data.url)[0];
					if (match) {
						// does this need
						if (match.fallover === data.fallover) {
							// nothing to do
							return;
						}
					}
					const frequest = new Request(data.fallover, {mode: 'no-cors'});

					fetch(frequest).then(response => {
						// Just update the existing record
						if (match) {
							match.fallover = data.fallover;
						}
						else {
							falloverStore.put(data);
						}
						return cache.put(data.fallover, response);
					});
				});
				break;
			}
			case 'add': {
				const request = new Request(data.url, {mode: 'no-cors'});
				return fetch(request).then(response => cache.put(data.url, response));
			}
		}
	});
});


