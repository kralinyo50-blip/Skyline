/* Only the public app shell is cached. Never queue payments or cache API/private data. */
const CACHE = "skyline-shell-v3-1";
const SHELL = new URL("./", self.registration.scope).href;
const OFFLINE = new URL("offline.html", self.registration.scope).href;
const ASSETS = [
  "offline.html",
  "manifest.webmanifest",
  "pwa/icon-192.png",
  "pwa/icon-512.png",
  "pwa/icon-maskable.png",
].map((path) => new URL(path, self.registration.scope).href);
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("skyline-shell-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    /(^|\/)api(\/|$)/.test(url.pathname)
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, { cache: "no-store" });
          if (
            response.ok &&
            response.headers.get("content-type")?.includes("text/html")
          ) {
            try {
              const cache = await caches.open(CACHE);
              await cache.put(SHELL, response.clone());
            } catch {
              /* Quota cannot break navigation. */
            }
          }
          return response;
        } catch {
          return (
            (await caches.match(SHELL)) ||
            (await caches.match(OFFLINE)) ||
            new Response("Çevrimdışı. İnternet bağlantını kontrol et.", {
              status: 503,
            })
          );
        }
      })(),
    );
  } else if (ASSETS.includes(url.href)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});
