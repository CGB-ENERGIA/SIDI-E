import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from 'src/services/supabase'
import { offlineDB } from 'src/services/localDB'
import { useOnlineStore } from './online'

// Campos de texto das equipes gravados sempre em MAIÚSCULAS e sem espaços nas pontas
// (status fica de fora: 'ativo'/'inativo' é comparado em minúsculas pelos filtros)
const TEAM_TEXT_FIELDS = ['prefixo', 'nome', 'responsavel', 'supervisor', 'coordenador', 'gerencia', 'base', 'processo']

function normalizeTeamPayload (payload) {
  const out = { ...payload }
  for (const f of TEAM_TEXT_FIELDS) {
    if (typeof out[f] === 'string') out[f] = out[f].trim().toUpperCase()
  }
  return out
}

export const useTeamsStore = defineStore('teams', () => {
  const teams = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchTeams () {
    loading.value = true
    error.value = null
    try {
      const online = useOnlineStore()
      if (online.isOnline) {
        const { data, error: err } = await supabase
          .from('teams')
          .select('*, collaborators(*)')
          .order('prefixo')
        if (err) throw err
        teams.value = data
        // Cache teams + colaboradores (substitui por equipe p/ refletir trocas do admin)
        for (const team of data) {
          const { collaborators, ...teamData } = team
          await offlineDB.saveTeam({ ...teamData })
          await offlineDB.replaceTeamCollaborators(
            team.id,
            (collaborators || []).map(c => ({ ...c, teamId: team.id }))
          )
        }
      } else {
        teams.value = await offlineDB.getTeams()
      }
    } catch (e) {
      error.value = e.message
      teams.value = await offlineDB.getTeams()
    } finally {
      loading.value = false
    }
  }

  async function createTeam (payload) {
    const { data, error: err } = await supabase
      .from('teams')
      .insert(normalizeTeamPayload(payload))
      .select()
      .single()
    if (err) throw err
    teams.value.push(data)
    await offlineDB.saveTeam({ ...data })
    return data
  }

  async function updateTeam (id, payload) {
    const { data, error: err } = await supabase
      .from('teams')
      .update(normalizeTeamPayload(payload))
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const idx = teams.value.findIndex(t => t.id === id)
    if (idx !== -1) teams.value[idx] = data
    await offlineDB.saveTeam({ ...data })
    return data
  }

  async function deleteTeam (id) {
    const { error: err } = await supabase.from('teams').delete().eq('id', id)
    if (err) throw err
    teams.value = teams.value.filter(t => t.id !== id)
    await offlineDB.deleteTeam(id)
  }

  async function addCollaborator (teamId, colaborador) {
    const { data, error: err } = await supabase
      .from('collaborators')
      .insert({ ...colaborador, team_id: teamId })
      .select()
      .single()
    if (err) throw err
    const team = teams.value.find(t => t.id === teamId)
    if (team) {
      team.collaborators = team.collaborators || []
      team.collaborators.push(data)
    }
    return data
  }

  async function removeCollaborator (collaboratorId, teamId) {
    const { error: err } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', collaboratorId)
    if (err) throw err
    const team = teams.value.find(t => t.id === teamId)
    if (team) {
      team.collaborators = team.collaborators.filter(c => c.id !== collaboratorId)
    }
  }

  return {
    teams,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addCollaborator,
    removeCollaborator
  }
})
