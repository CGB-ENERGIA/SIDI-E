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

// v2: índice localId para vincular fotos (serviceId local_*) ao serviço sincronizado
db.version(2).stores({
  teams:         'id, prefixo, nome, status, createdAt',
  collaborators: '++id, teamId, nome',
  activities:    'id, nome, tipo',
  services:      '++id, localId, teamId, activityId, data, syncStatus, attempts, createdAt',
  evidencePhotos:'++id, serviceId, tipo, syncStatus, attempts, createdAt',
  syncQueue:     '++id, entity, action, attempts, createdAt'
}).upgrade(async tx => {
  const rows = await tx.table('services').toArray()
  for (const row of rows) {
    if (!row.localId) {
      const localId = (typeof row.id === 'string' && String(row.id).startsWith('local_'))
        ? row.id
        : `legacy_${row.id}`
      await tx.table('services').update(row.id, { localId })
    }
  }
})

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

  /** Substitui o cache local de colaboradores de uma equipe (evita nomes órfãos após troca). */
  async replaceTeamCollaborators (teamId, list = []) {
    await db.collaborators.where('teamId').equals(teamId).delete()
    for (const c of list) {
      await db.collaborators.put({
        ...c,
        teamId,
        nome: (c.nome || '').trim().toUpperCase()
      })
    }
  },

  /** Remove todas as entradas locais com o mesmo nome (qualquer equipe). */
  async deleteCollaboratorsByNome (nome) {
    const needle = (nome || '').trim().toUpperCase()
    if (!needle) return
    const all = await db.collaborators.toArray()
    const ids = all.filter(c => (c.nome || '').trim().toUpperCase() === needle).map(c => c.id)
    if (ids.length) await db.collaborators.bulkDelete(ids)
  },

  // ── Activities ────────────────────────────────────────────────
  async saveActivity (activity) {
    return db.activities.put(activity)
  },

  async getActivities () {
    return db.activities.toArray()
  },

  // ── Services ──────────────────────────────────────────────────
  /**
   * Salva serviço offline. Retorna o localId (string local_*) usado pelas fotos.
   * PK Dexie continua autoincrement; localId é o vínculo estável.
   */
  async saveService (service) {
    const localId = service.localId ||
      (typeof service.id === 'string' && service.id.startsWith('local_') ? service.id : null) ||
      `local_${Date.now()}`

    // Não forçar id string no store ++id (quebra a PK)
    const { id: _ignore, ...rest } = service
    const record = {
      ...rest,
      localId,
      syncStatus: service.syncStatus || 'pending',
      attempts: service.attempts || 0,
      createdAt: service.createdAt || new Date().toISOString()
    }
    await db.services.put(record)
    return localId
  },

  async getAllServices () {
    return db.services.toArray()
  },

  async getPendingServices () {
    return db.services.where('syncStatus').equals('pending').toArray()
  },

  async getErrorServices () {
    return db.services.where('syncStatus').equals('error').toArray()
  },

  async markServiceSynced (id, remoteId) {
    return db.services.update(id, { syncStatus: 'synced', remoteId })
  },

  async markServiceError (id) {
    const svc = await db.services.get(id)
    const attempts = (svc?.attempts || 0) + 1
    return db.services.update(id, { syncStatus: attempts >= 3 ? 'error' : 'pending', attempts })
  },

  async resetServiceForRetry (id) {
    return db.services.update(id, { syncStatus: 'pending', attempts: 0 })
  },

  async deleteService (id) {
    const svc = await db.services.get(id)
    if (svc?.localId) {
      await db.evidencePhotos.where('serviceId').equals(svc.localId).delete()
    }
    return db.services.delete(id)
  },

  /**
   * Resolve UUID remoto a partir do serviceId gravado na foto (local_*).
   */
  async resolveRemoteServiceId (serviceId, photoCreatedAt = null) {
    if (!serviceId) return null

    // Já é UUID remoto
    if (
      typeof serviceId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId)
    ) {
      return serviceId
    }

    // Busca por localId (vínculo correto)
    let svc = await db.services.where('localId').equals(String(serviceId)).first()
    if (svc?.remoteId) return svc.remoteId

    // Busca direta pela PK (legado)
    svc = await db.services.get(serviceId)
    if (svc?.remoteId) return svc.remoteId

    // Recuperação: foto órfã (serviço já syncou com PK numérica sem localId)
    if (typeof serviceId === 'string' && serviceId.startsWith('local_')) {
      const synced = (await db.services.toArray())
        .filter(s => s.remoteId && s.syncStatus === 'synced')
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

      if (!synced.length) return null

      if (photoCreatedAt) {
        const photoTime = new Date(photoCreatedAt).getTime()
        const closest = synced
          .map(s => ({ s, dist: Math.abs(new Date(s.createdAt).getTime() - photoTime) }))
          .sort((a, b) => a.dist - b.dist)[0]
        // Janela de 30 min — típico do fluxo offline → sync
        if (closest && Number.isFinite(closest.dist) && closest.dist < 30 * 60 * 1000) {
          // Repara o vínculo para próximas tentativas
          await db.services.update(closest.s.id, { localId: serviceId })
          return closest.s.remoteId
        }
      }

      // Fallback: único serviço synced recente
      if (synced.length === 1) {
        await db.services.update(synced[0].id, { localId: serviceId })
        return synced[0].remoteId
      }
    }

    return null
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
    const [svcPending, svcError, photoPending, photoError] = await Promise.all([
      db.services.where('syncStatus').equals('pending').count(),
      db.services.where('syncStatus').equals('error').count(),
      db.evidencePhotos.where('syncStatus').equals('pending').count(),
      db.evidencePhotos.where('syncStatus').equals('error').count()
    ])
    return svcPending + svcError + photoPending + photoError
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
