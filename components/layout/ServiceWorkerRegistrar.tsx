"use client"

// Registers the offline service worker. Silent: registration failures (e.g.
// non-secure contexts) are ignored so the app still works normally.
import { useEffect } from "react"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Unlock screen orientation if the browser supports it
    try {
      screen?.orientation?.unlock?.()
    } catch {}

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update().catch(() => {})
        })
        .catch(() => {})
    }
  }, [])
  return null
}