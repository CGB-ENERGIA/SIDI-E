import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { ExpirationPlugin } from 'workbox-expiration'

// Injeta o precache gerado pelo Quasar
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Controle do ciclo de vida ─────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.clients.claim()

// ── BackgroundSync: fila para POSTs/PATCHs ao Supabase ───────────────
const syncPlugin = new BackgroundSyncPlugin('supabase-sync-queue', {
  maxRetentionTime: 7 * 24 * 60 // 7 dias em minutos
})

// POST ao Supabase (inserção de serviços, fotos, colaboradores)
registerRoute(
  ({ url, request }) =>
    url.hostname.endsWith('supabase.co') && request.method === 'POST',
  new NetworkFirst({
    cacheName: 'supabase-mutations',
    networkTimeoutSeconds: 10,
    plugins: [syncPlugin]
  }),
  'POST'
)

// PATCH ao Supabase (atualizações)
registerRoute(
  ({ url, request }) =>
    url.hostname.endsWith('supabase.co') && request.method === 'PATCH',
  new NetworkFirst({
    cacheName: 'supabase-mutations',
    networkTimeoutSeconds: 10,
    plugins: [syncPlugin]
  }),
  'PATCH'
)

// ── GETs ao Supabase: NetworkFirst com cache longo ───────────────────
registerRoute(
  ({ url }) => url.hostname.endsWith('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })
    ]
  })
)

// ── Imagens: CacheFirst ───────────────────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 })
    ]
  })
)

// ── Assets estáticos: StaleWhileRevalidate ───────────────────────────
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new StaleWhileRevalidate({ cacheName: 'static-assets' })
)

// ── Notifica clientes após BackgroundSync ────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'workbox-background-sync:supabase-sync-queue') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'BACKGROUND_SYNC_DONE' }))
      })
    )
  }
})

// ── Periodic Background Sync ──────────────────────────────────────────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-evidencias') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'PERIODIC_SYNC' }))
      })
    )
  }
})

// ── Push Notifications ────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'SIDI-E', {
      body:  data.body  || '',
      icon:  '/icons/icon-192x192.png',
      badge: '/icons/icon-128x128.png',
      data:  data
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length) return clients[0].focus()
      return self.clients.openWindow('/')
    })
  )
})
