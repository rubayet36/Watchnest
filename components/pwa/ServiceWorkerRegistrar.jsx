'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      const clearLocalServiceWorker = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.unregister()))

        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('watchnest-'))
              .map((cacheName) => caches.delete(cacheName))
          )
        }

        if (navigator.serviceWorker.controller && !sessionStorage.getItem('watchnest-sw-dev-cleared')) {
          sessionStorage.setItem('watchnest-sw-dev-cleared', 'true')
          window.location.reload()
        }
      }

      clearLocalServiceWorker().catch((err) => console.warn('[SW] Local cleanup failed:', err))
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => console.log('[SW] Registered:', reg.scope))
      .catch((err) => console.warn('[SW] Registration failed:', err))
  }, [])

  return null
}
