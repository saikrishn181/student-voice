// Krantind Offline & Asset Caching Service Worker
const CACHE_NAME = "krantind-cache-v4"
const STATIC_ASSETS = [
  "/",
  "/feed",
  "/search",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
]

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
  // Only handle GET requests
  if (event.request.method !== "GET") return

  // Skip Supabase API, realtime websockets, and external auth requests
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
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        // If navigating to a page while offline, fallback to cached feed or home
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/feed") || await caches.match("/")
          if (fallback) return fallback
        }
        return new Response("Offline - Krantind", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain" }),
        })
      })
  )
})