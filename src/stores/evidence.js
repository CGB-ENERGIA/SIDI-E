import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, storage } from 'src/services/supabase'
import { offlineDB } from 'src/services/localDB'
import { useOnlineStore } from './online'

export const useEvidenceStore = defineStore('evidence', () => {
  const currentService = ref(null)
  const photos = ref([])
  const syncing = ref(false)

  // Start a new service record
  function startService (payload) {
    currentService.value = {
      ...payload,
      id: `local_${Date.now()}`,
      photos: [],
      status: 'em_andamento',
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    }
    photos.value = []
  }

  // Add photo blob to current service (works offline)
  async function addPhoto (blob, tipo) {
    const photo = {
      serviceId: currentService.value?.id,
      tipo, // 'epi' | 'atividade'
      blob,
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    }
    const localId = await offlineDB.savePhoto(photo)
    const photoWithId = { ...photo, id: localId }
    photos.value.push(photoWithId)
    if (currentService.value) {
      currentService.value.photos = photos.value
    }
    return photoWithId
  }

  // Remove a photo
  async function removePhoto (photoId) {
    photos.value = photos.value.filter(p => p.id !== photoId)
  }

  // Save service record locally
  async function saveServiceLocally () {
    if (!currentService.value) return
    const id = await offlineDB.saveService(currentService.value)
    currentService.value.localId = id
    return id
  }

  // Sync all pending items to Supabase
  async function syncPending () {
    const online = useOnlineStore()
    if (!online.isOnline || syncing.value) return

    syncing.value = true
    try {
      await syncPendingServices()
      await syncPendingPhotos()
    } finally {
      syncing.value = false
    }
  }

  async function syncPendingServices () {
    const pendingServices = await offlineDB.getPendingServices()
    for (const svc of pendingServices) {
      try {
        const payload = {
          team_id: svc.teamId,
          activity_id: svc.activityId,
          activity_name: svc.activityName,
          descricao: svc.descricao || null,
          colaboradores: svc.colaboradores || [],
          data: svc.data,
          status: 'concluido',
          sync_status: 'synced'
        }
        const { data, error } = await supabase
          .from('services')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        await offlineDB.markServiceSynced(svc.id, data.id)
      } catch (e) {
        console.error('Sync service failed:', e)
      }
    }
  }

  async function syncPendingPhotos () {
    const pendingPhotos = await offlineDB.getPendingPhotos()
    for (const photo of pendingPhotos) {
      try {
        // Resolve remote service id if local was already synced
        let serviceId = photo.serviceId
        if (typeof serviceId === 'string' && serviceId.startsWith('local_')) {
          const { db } = await import('src/services/localDB')
          const localSvc = await db.services.get(serviceId)
          if (localSvc?.remoteId) serviceId = localSvc.remoteId
          else continue // wait until service syncs first
        }

        const filename = `${serviceId}/${photo.tipo}_${photo.id}_${Date.now()}.jpg`
        const file = new File([photo.blob], filename, { type: 'image/jpeg' })
        await storage.uploadPhoto('evidencias', filename, file)

        await supabase.from('evidence_photos').insert({
          service_id: serviceId,
          tipo: photo.tipo,
          file_path: filename,
          created_at: photo.createdAt
        })

        await offlineDB.markPhotoSynced(photo.id, filename)
      } catch (e) {
        console.error('Sync photo failed:', e)
      }
    }
  }

  // Fetch evidence from Supabase (desktop view)
  async function fetchEvidences (filters = {}) {
    let query = supabase
      .from('services')
      .select('*, evidence_photos(*), teams(prefixo, nome)')
      .order('created_at', { ascending: false })

    if (filters.teamId) query = query.eq('team_id', filters.teamId)
    if (filters.date) query = query.gte('created_at', filters.date)

    const { data, error } = await query
    if (error) throw error
    return data
  }

  return {
    currentService,
    photos,
    syncing,
    startService,
    addPhoto,
    removePhoto,
    saveServiceLocally,
    syncPending,
    fetchEvidences
  }
})
