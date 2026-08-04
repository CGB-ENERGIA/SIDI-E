import Dexie from 'dexie'

export const db = new Dexie('GSTCOfflineDB')

db.version(1).stores({
  // Teams & collaborators
  teams: '++id, prefixo, nome, status, createdAt',
  collaborators: '++id, teamId, nome, funcao',

  // Activities & services
  activities: '++id, nome, descricao, tipo',
  services: '++id, teamId, activityId, data, status, syncStatus, createdAt',

  // Evidence photos
  evidencePhotos: '++id, serviceId, tipo, filePath, blob, syncStatus, createdAt',

  // Pending sync queue
  syncQueue: '++id, entity, action, payload, attempts, createdAt'
})

// Sync status values: 'pending' | 'synced' | 'error'

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

  // ── Activities ────────────────────────────────────────────────
  async saveActivity (activity) {
    return db.activities.put(activity)
  },

  async getActivities () {
    return db.activities.toArray()
  },

  // ── Services ──────────────────────────────────────────────────
  async saveService (service) {
    return db.services.put({ ...service, syncStatus: 'pending', createdAt: new Date().toISOString() })
  },

  async getPendingServices () {
    return db.services.where('syncStatus').equals('pending').toArray()
  },

  async markServiceSynced (id, remoteId) {
    return db.services.update(id, { syncStatus: 'synced', remoteId })
  },

  // ── Photos ────────────────────────────────────────────────────
  async savePhoto (photo) {
    return db.evidencePhotos.put({
      ...photo,
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
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
