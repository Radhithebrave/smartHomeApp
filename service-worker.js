const CACHE_NAME = 'smart-home-cache-v1';
const URLS_TO_CACHE = [
    '/smartHomeApp/',
    '/smartHomeApp/index.html',
    '/smartHomeApp/login.html',
    '/smartHomeApp/main.html',
    '/smartHomeApp/style.css',
    '/smartHomeApp/app.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-route.js'
];

let db;

// Open IndexedDB
const openDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('smartHomeDB', 1);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.createObjectStore('responses', { keyPath: 'url' });
            console.log('Object store created');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Error opening IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
};

// Store response in IndexedDB
const storeInIndexedDB = async (url, response) => {
    const db = await openDatabase();
    const clonedResponse = await response.clone().arrayBuffer();
    const blob = new Blob([clonedResponse]);

    const transaction = db.transaction(['responses'], 'readwrite');
    const objectStore = transaction.objectStore('responses');
    const request = objectStore.put({ url, data: blob });

    request.onsuccess = () => {
        console.log('Stored in IndexedDB:', url);
    };

    request.onerror = (event) => {
        console.error('Error storing in IndexedDB:', event.target.error);
    };
};

// Retrieve response from IndexedDB
const getFromIndexedDB = async (url) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['responses'], 'readonly');
        const objectStore = transaction.objectStore('responses');
        const request = objectStore.get(url);

        request.onsuccess = (event) => {
            if (event.target.result) {
                const blob = event.target.result.data;
                resolve(new Response(blob));
                console.log('Retrieved from IndexedDB:', url);
            } else {
                console.log('No entry found in IndexedDB for:', url);
                resolve(null);
            }
        };

        request.onerror = (event) => {
            console.error('Error retrieving from IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
};

// Install event: Open the cache and add files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(URLS_TO_CACHE);
        }).catch((error) => {
            console.error('Failed to cache:', error);
        })
    );
});

// Activate event: Remove old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: Serve cached content or use IndexedDB
self.addEventListener('fetch', (event) => {
    console.log('Fetching:', event.request.url);
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // If cached response exists, return it
            if (cachedResponse) {
                console.log('Serving from cache:', event.request.url);
                return cachedResponse;
            }

            // Otherwise, fetch from network
            return fetch(event.request).then((networkResponse) => {
                console.log('Network response received:', event.request.url);
                if (networkResponse && networkResponse.ok) {
                    console.log('Storing response in IndexedDB:', event.request.url);
                    storeInIndexedDB(event.request.url, networkResponse.clone());
                } else {
                    console.error('Network response not OK:', networkResponse);
                }
                return networkResponse;
            }).catch(async (error) => {
                console.error('Network request failed:', error);
                const idbResponse = await getFromIndexedDB(event.request.url);
                return idbResponse || new Response('Network error occurred.', { status: 408 });
            });
        })
    );
});


/*const CACHE_NAME = 'smart-home-cache-v1'; 
const URLS_TO_CACHE = [
    '/smartHomeApp/',
    '/smartHomeApp/index.html',
    '/smartHomeApp/login.html',
    '/smartHomeApp/main.html',
    '/smartHomeApp/style.css',
    '/smartHomeApp/app.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-route.js'
];

// Install event: Open the cache and add files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(URLS_TO_CACHE);
        }).catch((error) => {
            console.error('Failed to cache:', error);
        })
    );
});

// Activate event: Remove old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: Serve cached content if available
self.addEventListener('fetch', (event) => {
    console.log('Fetching:', event.request.url);
    event.respondWith(
        caches.match(event.request).then((response) => {
            // If we have a cached response, return it; otherwise, fetch from network
            return response || fetch(event.request).catch(() => {
                // Handle fetch failure (e.g., offline)
                console.error('Network request failed, returning fallback response.');
                return new Response('Network error occurred.', { status: 408 });
            });
        })
    );
});*/
