const CACHE_NAME = 'visicheck-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/visitors.html',
    '/css/style.css',
    '/js/db.js',
    '/js/auth.js',
    '/js/app.js',
    '/js/visitors.js',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
