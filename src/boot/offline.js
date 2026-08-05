import { boot } from 'quasar/wrappers'
import { useOnlineStore } from 'src/stores/online'
import { useEvidenceStore } from 'src/stores/evidence'
import { offlineDB } from 'src/services/localDB'
import { Notify } from 'quasar'

export default boot(({ app }) => {
  const online = useOnlineStore()
  const evidence = useEvidenceStore()

  async function refreshPendingCount () {
    const count = await offlineDB.getPendingCount()
    online.setPendingCount(count)
  }

  // ── Conectividade ─────────────────────────────────────────────────────
  window.addEventListener('online', async () => {
    online.setOnline(true)
    await evidence.syncPending()
    await refreshPendingCount()
  })

  window.addEventListener('offline', () => {
    online.setOnline(false)
  })

  // Contagem inicial
  refreshPendingCount()

  // ── Service Worker: mensagens do SW (BackgroundSync + Update) ────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async event => {
      if (event.data?.type === 'BACKGROUND_SYNC_DONE') {
        await refreshPendingCount()
      }
      if (event.data?.type === 'PERIODIC_SYNC') {
        // O sistema acordou o app em segundo plano — tenta sincronizar
        if (online.isOnline) {
          await evidence.syncPending()
          await refreshPendingCount()
        }
      }
    })

    // ── Aviso de atualização do PWA ──────────────────────────────────
    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Novo SW instalado e pronto — notifica sem forçar
            Notify.create({
              message: 'Nova versão disponível!',
              caption: 'Toque para atualizar o aplicativo.',
              icon: 'system_update',
              color: 'primary',
              position: 'top',
              timeout: 0, // persiste até o usuário agir
              actions: [
                {
                  label: 'Atualizar agora',
                  color: 'white',
                  handler () {
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                    window.location.reload()
                  }
                },
                {
                  label: 'Depois',
                  color: 'grey-3'
                }
              ]
            })
          }
        })
      })
    })

    // Garante que ao detectar o SW controlador mudar (após skipWaiting)
    // a página recarrega automaticamente
    let swRefreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (swRefreshing) return
      swRefreshing = true
      window.location.reload()
    })
  }

  // ── Periodic Background Sync (mantém dados frescos com app fechado) ──
  if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(async registration => {
      try {
        const permissions = await navigator.permissions.query({ name: 'periodic-background-sync' })
        if (permissions.state === 'granted') {
          await registration.periodicSync.register('sync-evidencias', {
            minInterval: 15 * 60 * 1000 // mínimo 15 minutos
          })
        }
      } catch { /* API não suportada no dispositivo, ignora */ }
    })
  }
})
