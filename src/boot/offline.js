import { boot } from 'quasar/wrappers'
import { useOnlineStore } from 'src/stores/online'
import { useEvidenceStore } from 'src/stores/evidence'
import { offlineDB } from 'src/services/localDB'

const TEST_TEAMS = [
  { prefixo: 'EQ-01', nome: 'Equipe Alpha', status: 'ativo' },
  { prefixo: 'EQ-02', nome: 'Equipe Beta', status: 'ativo' },
  { prefixo: 'EQ-03', nome: 'Equipe Gamma', status: 'ativo' }
]

const TEST_ACTIVITIES = [
  { nome: 'Inspeção de Subestação', tipo: 'eletrica' },
  { nome: 'Manutenção de Transformador', tipo: 'eletrica' },
  { nome: 'Troca de Cabo Energizado', tipo: 'eletrica' },
  { nome: 'Inspeção de Rede de Distribuição', tipo: 'eletrica' },
  { nome: 'Podagem de Árvore sob Rede', tipo: 'manutencao' },
  { nome: 'Religamento de Circuito', tipo: 'eletrica' },
  { nome: 'Vistoria de Poste', tipo: 'inspecao' }
]

async function seedTestData () {
  const existingTeams = await offlineDB.getTeams()
  if (existingTeams.length === 0) {
    for (const team of TEST_TEAMS) {
      await offlineDB.saveTeam({ ...team, createdAt: new Date().toISOString() })
    }
  }

  const existingActivities = await offlineDB.getActivities()
  if (existingActivities.length === 0) {
    for (const act of TEST_ACTIVITIES) {
      await offlineDB.saveActivity({ ...act, createdAt: new Date().toISOString() })
    }
  }
}

export default boot(({ app }) => {
  const online = useOnlineStore()
  const evidence = useEvidenceStore()

  seedTestData()

  // Track online/offline status
  window.addEventListener('online', async () => {
    online.setOnline(true)
    // Auto-sync when connection returns
    await evidence.syncPending()
    // Update pending count
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
