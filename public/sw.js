// SW Kill-switch: This script unregisters the service worker and clears caches.
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    self.registration.unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => {
            clients.forEach(client => client.navigate(client.url));
        });
});

// Clear all caches
caches.keys().then((names) => {
    for (let name of names) caches.delete(name);
});
