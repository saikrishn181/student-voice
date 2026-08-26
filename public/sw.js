// Krantind Offline & Asset Caching Service Worker
const CACHE_NAME = "krantind-cache-v1"
const STATIC_ASSETS = ["/", "/feed", "/search", "/manifest.json", "/favicon.ico"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  // Only cache GET requests
  if (event.request.method !== "GET") return

  // Skip Supabase API / auth requests from cache to ensure fresh data
  const url = new URL(event.request.url)
  if (url.origin.includes("supabase.co") || url.pathname.startsWith("/api/")) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseClone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {})
          })
        }
        return networkResponse
      })
      .catch(() => caches.match(event.request))
  )
})