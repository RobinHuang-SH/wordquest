const CACHE = 'wordquest-dev-v3'
const CORE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('wordquest-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const bypassCache =
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/docs') ||
    event.request.headers.has('authorization')
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || bypassCache) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
        }
        return response
      })
      .catch(() => caches.match(event.request, { ignoreVary: true }).then((hit) => hit || caches.match('/', { ignoreVary: true }))),
  )
})
