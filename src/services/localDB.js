import Dexie from 'dexie'

export const db = new Dexie('SIDIE_v1')

db.version(1).stores({
  teams:         'id, prefixo, nome, status, createdAt',
  collaborators: '++id, teamId, nome',
  activities:    'id, nome, tipo',
  services:      '++id, teamId, activityId, data, syncStatus, attempts, createdAt',
  evidencePhotos:'++id, serviceId, tipo, syncStatus, attempts, createdAt',
  syncQueue:     '++id, entity, action, attempts, createdAt'
})

// syncStatus values: 'pending' | 'synced' | 'error'

export const offlineDB = {
  // ── Teams ─────────────────────────────────────────────────────
  async saveTeam (team) {
    return db.teams.put(team)
  },

  async getTeams () {
    return db.teams.toArray()
  },

  async getTeamByPrefixo (prefixo) {
    return db.teams.where('prefixo').equals(prefixo).first()
  },

  async deleteTeam (id) {
    await db.collaborators.where('teamId').equals(id).delete()
    return db.teams.delete(id)
  },

  // ── Collaborators ─────────────────────────────────────────────
  async saveCollaborator (collab) {
    return db.collaborators.put(collab)
  },

  async getCollaboratorsByTeam (teamId) {
    return db.collaborators.where('teamId').equals(teamId).toArray()
  },

  // ── Activities ────────────────────────────────────────────────
  async saveActivity (activity) {
    return db.activities.put(activity)
  },

  async getActivities () {
    return db.activities.toArray()
  },

  // ── Services ──────────────────────────────────────────────────
  async saveService (service) {
    return db.services.put({
      ...service,
      syncStatus: service.syncStatus || 'pending',
      attempts: service.attempts || 0,
      createdAt: service.createdAt || new Date().toISOString()
    })
  },

  async getAllServices () {
    return db.services.toArray()
  },

  async getPendingServices () {
    return db.services.where('syncStatus').equals('pending').toArray()
  },

  async markServiceSynced (id, remoteId) {
    return db.services.update(id, { syncStatus: 'synced', remoteId })
  },

  async markServiceError (id) {
    const svc = await db.services.get(id)
    const attempts = (svc?.attempts || 0) + 1
    return db.services.update(id, { syncStatus: attempts >= 3 ? 'error' : 'pending', attempts })
  },

  async deleteService (id) {
    await db.evidencePhotos.where('serviceId').equals(id).delete()
    return db.services.delete(id)
  },

  // ── Photos ────────────────────────────────────────────────────
  async savePhoto (photo) {
    return db.evidencePhotos.put({
      ...photo,
      syncStatus: 'pending',
      attempts: 0,
      createdAt: photo.createdAt || new Date().toISOString()
    })
  },

  async getPhotosByService (serviceId) {
    return db.evidencePhotos.where('serviceId').equals(serviceId).toArray()
  },

  async getPendingPhotos () {
    return db.evidencePhotos.where('syncStatus').equals('pending').toArray()
  },

  async markPhotoSynced (id, filePath) {
    return db.evidencePhotos.update(id, { syncStatus: 'synced', filePath, blob: null })
  },

  async markPhotoError (id) {
    const photo = await db.evidencePhotos.get(id)
    const attempts = (photo?.attempts || 0) + 1
    return db.evidencePhotos.update(id, { syncStatus: attempts >= 3 ? 'error' : 'pending', attempts })
  },

  async deletePhoto (id) {
    return db.evidencePhotos.delete(id)
  },

  // ── Contagem total de pendentes ───────────────────────────────
  async getPendingCount () {
    const [services, photos] = await Promise.all([
      db.services.where('syncStatus').equals('pending').count(),
      db.evidencePhotos.where('syncStatus').equals('pending').count()
    ])
    return services + photos
  },

  // ── Sync Queue ────────────────────────────────────────────────
  async addToQueue (entity, action, payload) {
    return db.syncQueue.add({ entity, action, payload, attempts: 0, createdAt: new Date().toISOString() })
  },

  async getQueue () {
    return db.syncQueue.toArray()
  },

  async removeFromQueue (id) {
    return db.syncQueue.delete(id)
  },

  async incrementAttempts (id) {
    const item = await db.syncQueue.get(id)
    return db.syncQueue.update(id, { attempts: (item?.attempts || 0) + 1 })
  }
}
