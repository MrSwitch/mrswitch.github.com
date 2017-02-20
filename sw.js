(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// indexStorage
// This wraps an interface around IndexDB to create an object store

// Create an instance of the db
// The Cache name is optional, it will allow us to group various datasets (the default is __tricks__)

class DB {
	constructor (name, version, schema) {

		// Define the schema to use in the connection
		this.db_name = name || '__tricks__';
		if (typeof version === 'object') {
			this.version = 1;
			this.schema = version;
		}
		else {
			this.version = version || 1;
			this.schema = schema;
		}
		this.table_name = '__tricks__';

		// Return a function
		return Object.assign(this.scope.bind(this), this);
	}

	scope (name) {
		// Create a new store instance
		const inst = Object.create(this);
		inst.table_name = name;
		return inst;
	}

	open(mode) {
		return new Promise((accept, reject) => {
			const db = self.indexedDB.open(this.db_name, this.version);
			db.onsuccess = event => {
				accept(event.target.result);
			};
			db.onerror = reject;
			db.onupgradeneeded = event => {
				const db = event.target.result;

				// this should probably do something;
				for (const x in this.schema) {
					if (!db.objectStoreNames.contains(x)) {
						db.createObjectStore(x, this.schema[x]);
					}
				}
			};
		})
		.then(db => {
			// The DB connection has been established
			// Lets create a connection to it
			const transaction = db.transaction([this.table_name], mode);

			// Return the API for the Object Store
			return transaction.objectStore(this.table_name);
		});
	}

	get (key) {

		// We've got all the information to make a request to IndexDB
		return new Promise((accept, reject) => {
			this.open().then(objectStore => {
				// Find items in this table by Key
				const request = objectStore.get(key);
				request.onsuccess = event => {
					accept(event.target.result);
				};
				request.onerror = event => {
					reject(event.target.result);
				};
			});
		});
	}

	all () {

		// We've got all the information to make a request to IndexDB
		return new Promise((accept, reject) => {
			this.open().then(objectStore => {
		  // Find items in this table by Key
				const request = objectStore.openCursor();
				request.onerror = event => {
					reject(event.target.result);
				};

				const a = [];
				request.onsuccess = event => {
					const cursor = event.target.result;
					if (cursor) {
						a.push(cursor.value);
						cursor.continue();
					}
					else {
						accept(a);
					}
				};
			});
		});
	}

	put (key, data) {

		return new Promise((accept, reject) => {

			// Allow data as a thing on its own.
			if (typeof key === 'object') {
				data = key;
			}
			else {
				data.key = key;
			}

			// Open up a connection to indexdb
			this.open('readwrite').then(objectStore => {
				const request = objectStore.put(data);
				request.onsuccess = event => {
					accept(event.target.result);
				};
				request.onerror = event => {
					reject(event.target.result);
				};
			})
			.catch(reject);

		});
	}
}

module.exports = DB;

},{}],2:[function(require,module,exports){
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



},{"./indexdb":1}]},{},[2])

//# sourceMappingURL=sw.js.map
