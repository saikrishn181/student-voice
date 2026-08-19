"use client"

// Registers the offline service worker. Silent: registration failures (e.g.
// non-secure contexts) are ignored so the app still works normally.
import { useEffect } from "react"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return null
}