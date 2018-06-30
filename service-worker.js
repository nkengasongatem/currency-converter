let staticCacheName = 'currencyConvert-PWA-v2';
let assetsToCache = [
    '/currency-converter/',
    '/currency-converter/index.html',
    '/currency-converter/css/main.css',
    '/currency-converter/js/main.js',
    '/currency-converter/js/idb.js',
    '/currency-converter/imgs/currencyconverter.svg',
    '/currency-converter/imgs/currencyconverter.png',
    '/currency-converter/imgs/ok.png',
    '/currency-converter/imgs/error.png'
];

// Cache all static contents (app shell)
self.addEventListener('install', (e) => {
    console.log('Service Worker Installed');
    e.waitUntil(
        caches.open(staticCacheName).then(
            (cache) => {
                console.log('Service Worker cached app shell');
                return cache.addAll(assetsToCache);
            }
        )
    );
});

// Activate the service worker -> use this opportunity to clean up outdated caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(function(cacheName) {
                if (cacheName !== staticCacheName) {
                  console.log('[ServiceWorker] Deleting old cache:', cacheName);
                  return caches.delete(cacheName);
                }
              })
            );
        }
    )
)});

// Serve the app from the Service Worker before goint to network[if necessary]
self.addEventListener('fetch', e => {
    let requestUrl = new URL(e.request.url);

    // Fetch from the app shell ?
    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname === '/') {
            e.respondWith(caches.match('/'));
            return;
        }
    }
    e.respondWith(
        caches.match(e.request).then(function(response) {
        return response || fetch(e.request);
        })
    );
});

addEventListener('message', messageEvent => {
    if (messageEvent.data === 'skipWaiting') return skipWaiting();
});

// Push event listeners to handle push events from the server
self.addEventListener('push', e => {
    var options = {
      body: 'Check Out the Latest Exchange Rates!',
      icon: 'imgs/currencyconverter.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1'
      },
      actions: [
        {action: 'explore', title: 'Explore',
        icon: 'imgs/ok.png'},
        {action: 'close', title: 'Close',
        icon: 'imgs/error.png'},
      ]
    };
    e.waitUntil(
      self.registration.showNotification('New Rates Available!', options)
    );
  });

// Respond to user interaction with offline notification
self.addEventListener('notificationclick', e => {
     e.notification.close();
});
