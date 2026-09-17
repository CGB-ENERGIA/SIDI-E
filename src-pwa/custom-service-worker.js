import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Injeta o precache gerado pelo Quasar
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Fallback de navegação (SPA offline) ───────────────────────────────
// Sem isso, ao reabrir o app offline em qualquer rota (ex: /m/home),
// o navegador não encontra nada em cache e mostra a tela nativa
// "Você está off-line" em vez do app. Toda navegação cai no shell
// precacheado (index.html) e o Vue Router assume a rota certa no cliente.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/(supabase|storage)\//]
  })
)

// ── Controle do ciclo de vida ─────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.clients.claim()

// ── Mutações (POST/PATCH) ao Supabase: NÃO interceptar ───────────────
// A app já mantém sua própria fila offline (IndexedDB, ver src/services/localDB.js
// e src/stores/evidence.js) com estado de retry visível ao usuário. Um Background
// Sync do Service Worker aqui reenviaria a MESMA requisição de forma automática e
// descoordenada com o retry da app, causando serviços e fotos duplicados no banco
// sempre que uma gravação falhasse por timeout/queda de conexão. Deixando essas
// rotas sem registro, o navegador usa o fetch normal — falha rápido e visível,
// e a fila da própria app é a ÚNICA responsável por reenviar.

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
