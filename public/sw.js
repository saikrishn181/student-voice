// Krantind service worker: offline-first app shell + runtime caching.
// - Navigation requests: network-first, falling back to the cached shell so
//   the app still opens offline.
// - Static assets: network-first with cache fallback or cache-first for hashed Next.js chunks.
const CACHE_NAME = "krantind-v2"
const PRECACHE = ["/", "/login", "/signup", "/about"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Page navigations: always try the network first, fall back to cache so the
  // app shell loads even when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/")),
        ),
    )
    return
  }

  // Next static chunks (immutable with hash): cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          if (res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return res
        })
      }),
    )
    return
  }

  // Other static assets (images/fonts): stale while revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => cached)

      return cached || fetchPromise
    }),
  )
})