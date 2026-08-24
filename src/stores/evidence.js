import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, storage } from 'src/services/supabase'
import { offlineDB } from 'src/services/localDB'
import { useOnlineStore } from './online'

export const useEvidenceStore = defineStore('evidence', () => {
  const currentService = ref(null)
  const photos = ref([])
  const syncing = ref(false)
  const lastSyncErrors = ref([])

  function startService (payload) {
    currentService.value = {
      ...payload,
      id: `local_${Date.now()}`,
      photos: [],
      status: 'em_andamento',
      syncStatus: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString()
    }
    photos.value = []
  }

  async function addPhoto (blob, tipo) {
    const photo = {
      serviceId: currentService.value?.id,
      tipo,
      blob,
      syncStatus: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString()
    }
    const localId = await offlineDB.savePhoto(photo)
    const photoWithId = { ...photo, id: localId }
    photos.value.push(photoWithId)
    if (currentService.value) currentService.value.photos = photos.value
    return photoWithId
  }

  async function removePhoto (photoId) {
    photos.value = photos.value.filter(p => p.id !== photoId)
    await offlineDB.deletePhoto(photoId)
  }

  async function saveServiceLocally () {
    if (!currentService.value) return
    const id = await offlineDB.saveService(currentService.value)
    currentService.value.localId = id
    return id
  }

  /**
   * @returns {{ ok: boolean, synced: number, remaining: number, errors: string[] }}
   */
  async function syncPending () {
    const online = useOnlineStore()
    if (!online.isOnline) {
      return { ok: false, synced: 0, remaining: online.pendingCount, errors: ['Sem conexão'] }
    }
    if (syncing.value) {
      return { ok: false, synced: 0, remaining: online.pendingCount, errors: ['Sincronização já em andamento'] }
    }

    syncing.value = true
    lastSyncErrors.value = []
    let synced = 0

    try {
      const before = await offlineDB.getPendingCount()
      await syncPendingServices()
      await syncPendingPhotos()
      const remaining = await offlineDB.getPendingCount()
      online.setPendingCount(remaining)
      synced = Math.max(0, before - remaining)

      return {
        ok: remaining === 0,
        synced,
        remaining,
        errors: [...lastSyncErrors.value]
      }
    } finally {
      syncing.value = false
      const count = await offlineDB.getPendingCount()
      online.setPendingCount(count)
    }
  }

  async function syncPendingServices () {
    const pendingServices = await offlineDB.getPendingServices()
    const errorServices  = await offlineDB.getErrorServices()
    // Recoloca serviços em 'error' na fila — podem ter falhado por problema transitório
    // (FK de activity_id, rede instável, etc.). Resetar attempts permite nova tentativa.
    for (const svc of errorServices) {
      await offlineDB.resetServiceForRetry(svc.id)
    }
    const allServices = [...pendingServices, ...errorServices]
    for (const svc of allServices) {
      try {
        const activityId = resolveActivityId(svc.activityId)

        const payload = {
          team_id:       svc.teamId || null,
          activity_id:   activityId,
          activity_name: svc.activityName || null,
          descricao:     svc.descricao || null,
          colaboradores: svc.colaboradores || [],
          data:          svc.data || null,
          status:        'concluido',
          sync_status:   'synced'
        }
        let { data, error } = await supabase
          .from('services')
          .insert(payload)
          .select()
          .single()

        // FK violation no activity_id (atividade removida do servidor) → retentar sem ela
        if (error?.code === '23503' && error?.message?.includes('activity_id')) {
          const res = await supabase
            .from('services')
            .insert({ ...payload, activity_id: null })
            .select()
            .single()
          data = res.data
          error = res.error
        }

        if (error) throw error
        await offlineDB.markServiceSynced(svc.id, data.id)
      } catch (e) {
        const msg = e?.message || String(e)
        console.error('Sync service failed:', svc.id, msg)
        lastSyncErrors.value.push(`Serviço: ${msg}`)
        await offlineDB.markServiceError(svc.id)
      }
    }
  }

  function resolveActivityId (activityId) {
    if (!activityId) return null
    if (typeof activityId === 'object') return activityId.id || null
    if (typeof activityId === 'string') {
      const looksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activityId)
      return looksUuid ? activityId : null
    }
    return null
  }

  async function syncPendingPhotos () {
    const pendingPhotos = await offlineDB.getPendingPhotos()
    for (const photo of pendingPhotos) {
      try {
        if (!photo.blob) {
          throw new Error('Foto sem dados locais (blob ausente)')
        }

        // Safari armazena ArrayBuffer em vez de Blob — reconverte se necessário
        const blobData = photo.blob instanceof ArrayBuffer
          ? new Blob([photo.blob], { type: 'image/jpeg' })
          : photo.blob

        let serviceId = photo.serviceId
        if (
          typeof serviceId === 'string' &&
          (serviceId.startsWith('local_') || serviceId.startsWith('legacy_') || !/^[0-9a-f-]{36}$/i.test(serviceId))
        ) {
          const remoteId = await offlineDB.resolveRemoteServiceId(serviceId, photo.createdAt)
          if (!remoteId) {
            // Serviço ainda não sincronizou — tenta na próxima rodada
            continue
          }
          serviceId = remoteId
        }

        const filename = `${serviceId}/${photo.tipo}_${photo.id}_${Date.now()}.jpg`
        const file = new File([blobData], filename, { type: 'image/jpeg' })
        await storage.uploadPhoto('evidencias', filename, file)

        const { error } = await supabase.from('evidence_photos').insert({
          service_id: serviceId,
          tipo:       photo.tipo,
          file_path:  filename,
          created_at: photo.createdAt
        })
        if (error) throw error

        await offlineDB.markPhotoSynced(photo.id, filename)
      } catch (e) {
        const msg = e?.message || String(e)
        console.error('Sync photo failed:', photo.id, msg)
        lastSyncErrors.value.push(`Foto: ${msg}`)
        await offlineDB.markPhotoError(photo.id)
      }
    }
  }

  async function fetchEvidences (filters = {}) {
    try {
      let query = supabase
        .from('services')
        .select('*, evidence_photos(*), teams(prefixo, nome)')
        .order('created_at', { ascending: false })

      if (filters.teamId) query = query.eq('team_id', filters.teamId)
      if (filters.date)   query = query.gte('created_at', filters.date)

      const { data, error } = await query
      if (error) throw error
      return data
    } catch (e) {
      console.error('fetchEvidences offline fallback:', e.message)
      return []
    }
  }

  /** Remove serviço remoto + fotos (storage + tabela). Só chamar após checagem de admin na UI. */
  async function deleteService (serviceId) {
    if (!serviceId) throw new Error('Serviço inválido')

    const { data: photosRows, error: photosErr } = await supabase
      .from('evidence_photos')
      .select('id, file_path')
      .eq('service_id', serviceId)
    if (photosErr) throw photosErr

    for (const photo of photosRows || []) {
      if (photo.file_path) {
        try {
          await storage.deletePhoto('evidencias', photo.file_path)
        } catch (e) {
          console.warn('Falha ao remover arquivo do storage:', photo.file_path, e)
        }
      }
    }

    const { error: delPhotosErr } = await supabase
      .from('evidence_photos')
      .delete()
      .eq('service_id', serviceId)
    if (delPhotosErr) throw delPhotosErr

    const { error: delSvcErr } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
    if (delSvcErr) throw delSvcErr
  }

  return {
    currentService, photos, syncing, lastSyncErrors,
    startService, addPhoto, removePhoto,
    saveServiceLocally, syncPending, fetchEvidences, deleteService
  }
})
