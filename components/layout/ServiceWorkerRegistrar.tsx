"use client"

// Registers the offline service worker. Silent: registration failures (e.g.
// non-secure contexts) are ignored so the app still works normally.
import { useEffect } from "react"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Unlock screen orientation if supported by mobile browser
    if (typeof window !== "undefined" && window.screen && window.screen.orientation) {
      try {
        if (typeof window.screen.orientation.unlock === "function") {
          window.screen.orientation.unlock().catch(() => {})
        }
      } catch {}
    }

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