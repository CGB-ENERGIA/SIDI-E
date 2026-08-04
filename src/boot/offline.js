import { boot } from 'quasar/wrappers'
import { useOnlineStore } from 'src/stores/online'
import { useEvidenceStore } from 'src/stores/evidence'
import { offlineDB } from 'src/services/localDB'

export default boot(({ app }) => {
  const online = useOnlineStore()
  const evidence = useEvidenceStore()

  // Track online/offline status
  window.addEventListener('online', async () => {
    online.setOnline(true)
    await evidence.syncPending()
    const pending = await offlineDB.getPendingPhotos()
    online.setPendingCount(pending.length)
  })

  window.addEventListener('offline', () => {
    online.setOnline(false)
  })

  // Initial pending count
  offlineDB.getPendingPhotos().then(p => {
    online.setPendingCount(p.length)
  })
})
