const CACHE = "pwa-cache-v4";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        "./",
        "./index.html",
        "./main.js",
        "./assets/pikachu.png"
      ]);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );

  // Neuer SW übernimmt SOFORT
  self.clients.claim();
});

 self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // ⭐ CSS NIE cachen – auch nicht mit ?v=123
  if (url.endsWith(".css") || url.includes(".css?v=")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Standard: Cache first
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
