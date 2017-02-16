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

	event.respondWith(promiseAny([
		caches.match(request)
			.then(b => {
				if (!b) throw "Not in cache";
				console.log('Cache wins', request.url);
				return b;
			}),
		fetch(request)
			.then(b => {
				if (!b) throw "No access via network";
				console.log('network wins', request.url);
				return b;
			})
			.then(cacheUpdate.bind(null, request))
    ]).catch(offlineFallback.bind(null, request)));
});


function promiseAny(promises) {
	return new Promise((resolve, reject) => {
		// make sure promises are all promises
		promises = promises.map(p => Promise.resolve(p));
		// resolve this promise as soon as one resolves
		promises.forEach(p => p.then(resolve));
		// reject if all promises reject
		promises
		.reduce((a, b) => a.catch(() => b))
		.catch(() => reject(Error("All failed")));
	});
};

function cacheUpdate(request, response) {

	// Check if we received a valid response
	if (!response || response.status !== 200 || response.type !== 'basic') {
		return response;
	}

	const responseToCache = response.clone();

	caches.open(CACHE_NAME).then(cache => {
		cache.put(request, responseToCache);
	});

	return response;
}

function offlineFallback(request) {

	return falloverStore.all().then(fallover => {

		const match = fallover.filter(item => (
			(!item.mode || item.mode === request.mode)
			&& (!item.url || request.url.match(item.url))
		))[0];

		if (match) {
			return caches.match(new Request(match.fallover));
		}

		return;
	});
}


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


