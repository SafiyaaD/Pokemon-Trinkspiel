const CACHE = "pwa-cache-v1.0.4";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        "./",
        "./main.js",

        "./assets/pikachu.png",
        "./assets/charmander.png",
        "./assets/squirtle.png",
        "./assets/bulbasaur.png",
        "./assets/title.png",

        "./manifest.webmanifest",
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
  if (url.endsWith("index.html") || url.endsWith("/")) {
  event.respondWith(fetch(event.request));
  return;
}


  // Standard: Cache first
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
