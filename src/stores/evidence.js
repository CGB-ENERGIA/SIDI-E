import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, storage } from 'src/services/supabase'
import { offlineDB } from 'src/services/localDB'
import { useOnlineStore } from './online'

export const useEvidenceStore = defineStore('evidence', () => {
  const currentService = ref(null)
  const photos = ref([])
  const syncing = ref(false)

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

  // Remove foto da memória E do IndexedDB
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

  async function syncPending () {
    const online = useOnlineStore()
    if (!online.isOnline || syncing.value) return

    syncing.value = true
    try {
      await syncPendingServices()
      await syncPendingPhotos()
    } finally {
      syncing.value = false
      // Atualiza contagem após sync
      const count = await offlineDB.getPendingCount()
      online.setPendingCount(count)
    }
  }

  async function syncPendingServices () {
    const pendingServices = await offlineDB.getPendingServices()
    for (const svc of pendingServices) {
      try {
        const payload = {
          team_id:       svc.teamId,
          activity_id:   svc.activityId,
          activity_name: svc.activityName,
          descricao:     svc.descricao || null,
          colaboradores: svc.colaboradores || [],
          data:          svc.data,
          status:        'concluido',
          sync_status:   'synced'
        }
        const { data, error } = await supabase
          .from('services')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        await offlineDB.markServiceSynced(svc.id, data.id)
      } catch (e) {
        console.error('Sync service failed:', svc.id, e.message)
        await offlineDB.markServiceError(svc.id) // incrementa tentativas, marca 'error' após 3
      }
    }
  }

  async function syncPendingPhotos () {
    const pendingPhotos = await offlineDB.getPendingPhotos()
    for (const photo of pendingPhotos) {
      try {
        let serviceId = photo.serviceId
        if (typeof serviceId === 'string' && serviceId.startsWith('local_')) {
          const { db } = await import('src/services/localDB')
          const localSvc = await db.services.get(serviceId)
          if (localSvc?.remoteId) serviceId = localSvc.remoteId
          else continue // serviço ainda não sincronizou, tenta na próxima rodada
        }

        const filename = `${serviceId}/${photo.tipo}_${photo.id}_${Date.now()}.jpg`
        const file = new File([photo.blob], filename, { type: 'image/jpeg' })
        await storage.uploadPhoto('evidencias', filename, file)

        await supabase.from('evidence_photos').insert({
          service_id: serviceId,
          tipo:       photo.tipo,
          file_path:  filename,
          created_at: photo.createdAt
        })

        await offlineDB.markPhotoSynced(photo.id, filename)
      } catch (e) {
        console.error('Sync photo failed:', photo.id, e.message)
        await offlineDB.markPhotoError(photo.id) // marca 'error' após 3 tentativas
      }
    }
  }

  // Desktop: busca evidências do Supabase com fallback local mínimo
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

  return {
    currentService, photos, syncing,
    startService, addPhoto, removePhoto,
    saveServiceLocally, syncPending, fetchEvidences
  }
})
