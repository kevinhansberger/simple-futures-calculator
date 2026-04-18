const CACHE_NAME = 'tofx3-v4'
const ASSETS = [
  './',
  './index.html',
  './journal.html',
  './manifest.json',
  './icon.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)

    // For navigate requests, match by pathname so index/journal always come from cache
    if (event.request.mode === 'navigate') {
      const url = new URL(event.request.url)
      const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname
      const key  = url.origin + path
      const hit  = await cache.match(key) || await cache.match(url.origin + url.pathname)
      if (hit) return hit
    }

    // Cache-first for everything else
    const cached = await cache.match(event.request)
    if (cached) return cached

    try {
      const response = await fetch(event.request)
      if (response.ok) cache.put(event.request, response.clone())
      return response
    } catch {
      // Offline fallback for navigation
      if (event.request.mode === 'navigate') {
        return cache.match('./index.html')
      }
    }
  })())
})
