<template>
  <q-page class="dash-page">

    <!-- Header -->
    <div class="dash-header">
      <div>
        <div class="dash-title">Dashboard</div>
        <div class="dash-date">{{ dateLabel }}</div>
      </div>
      <q-btn flat round icon="refresh" color="grey-5" size="sm" @click="load" :loading="loading" />
    </div>

    <!-- Alerta de solicitações pendentes -->
    <div v-if="pendingRequests.length" class="alert-banner q-mb-lg">
      <div class="alert-left">
        <span class="alert-dot" />
        <q-icon name="pending_actions" size="18px" />
        <span><strong>{{ pendingRequests.length }}</strong> solicitação{{ pendingRequests.length > 1 ? 'ões' : '' }} de equipe aguardando aprovação</span>
      </div>
      <q-btn flat dense no-caps label="Ver solicitações →" color="orange" size="sm" to="/solicitacoes" />
    </div>

    <!-- KPI cards -->
    <div class="kpi-grid q-mb-xl">
      <div class="kpi-card" v-for="k in kpis" :key="k.label" :style="`--accent: ${k.color}`">
        <div class="kpi-top">
          <span class="kpi-label">{{ k.label }}</span>
          <div class="kpi-icon-wrap"><q-icon :name="k.icon" size="18px" /></div>
        </div>
        <div class="kpi-value">{{ k.value }}</div>
        <div class="kpi-sub">{{ k.sub }}</div>
        <div class="kpi-bar" />
      </div>
    </div>

    <!-- Conteúdo principal -->
    <div class="main-grid">

      <!-- Tabela de evidências recentes -->
      <div class="card-block span-2">
        <div class="block-header">
          <span class="block-title">Evidências Recentes</span>
          <q-btn flat dense no-caps label="Ver todas →" color="primary" size="sm" to="/evidencias" />
        </div>

        <div v-if="loading" class="flex flex-center q-py-xl">
          <q-spinner-dots color="primary" size="32px" />
        </div>

        <div v-else-if="!recentEvidences.length" class="empty-state">
          <q-icon name="photo_library" size="40px" class="empty-icon" />
          <div>Nenhuma evidência registrada hoje</div>
        </div>

        <table v-else class="ev-table">
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Atividade</th>
              <th class="center">Fotos</th>
              <th class="center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in recentEvidences" :key="ev.id">
              <td>
                <div class="team-cell">
                  <span class="team-dot">{{ (ev.teams?.prefixo || '?').charAt(0) }}</span>
                  {{ ev.teams?.prefixo || '-' }}
                </div>
              </td>
              <td class="muted">{{ ev.activity_id || '-' }}</td>
              <td class="center">{{ ev.evidence_photos?.length || 0 }}</td>
              <td class="center">
                <span class="status-pill" :class="ev.sync_status === 'synced' ? 'synced' : 'pending'">
                  {{ ev.sync_status === 'synced' ? 'Sincronizado' : 'Pendente' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Equipes ativas -->
      <div class="card-block">
        <div class="block-header">
          <span class="block-title">Equipes Cadastradas</span>
          <q-btn flat dense no-caps label="Gerenciar →" color="primary" size="sm" to="/equipes" />
        </div>

        <div v-if="!activeTeams.length" class="empty-state">
          <q-icon name="groups" size="40px" class="empty-icon" />
          <div>Nenhuma equipe cadastrada</div>
        </div>

        <div v-else class="team-list">
          <div v-for="team in activeTeams" :key="team.id" class="team-row">
            <div class="team-avatar" :style="`background: ${strColor(team.prefixo)}`">
              {{ team.prefixo?.charAt(0) }}
            </div>
            <div class="team-info">
              <div class="team-name">{{ team.prefixo }}</div>
              <div class="team-sub muted">{{ team.nome }}</div>
            </div>
            <div class="team-badge">{{ team.servicos_hoje || 0 }} svc</div>
          </div>
        </div>
      </div>

    </div>

    <!-- Dialog de aprovação -->
    <q-dialog v-model="approveDialog" persistent>
      <q-card style="min-width: 360px; border-radius: 16px;">
        <q-card-section>
          <div class="text-h6">Aprovar Equipe</div>
          <div class="text-caption text-grey-6">Prefixo: <strong>{{ selectedRequest?.prefixo }}</strong></div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="newTeam.nome" label="Nome da equipe *" outlined dense autofocus :rules="[v => !!v || 'Obrigatório']" />
          <q-input v-model="newTeam.descricao" label="Descrição (opcional)" outlined dense type="textarea" rows="2" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated rounded label="Criar Equipe" color="positive" :loading="approvingId !== null" :disable="!newTeam.nome" @click="approveRequest" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTeamsStore } from 'src/stores/teams'
import { useEvidenceStore } from 'src/stores/evidence'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'

const teamsStore = useTeamsStore()
const evidenceStore = useEvidenceStore()
const $q = useQuasar()

const loading = ref(false)
const recentEvidences = ref([])
const pendingRequests = ref([])
const approveDialog = ref(false)
const selectedRequest = ref(null)
const approvingId = ref(null)
const newTeam = ref({ nome: '', descricao: '' })

const today = new Date().toISOString().split('T')[0]
const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

onMounted(load)

async function load () {
  loading.value = true
  await Promise.all([teamsStore.fetchTeams(), fetchPendingRequests()])
  try { recentEvidences.value = await evidenceStore.fetchEvidences({ date: today }) }
  catch { recentEvidences.value = [] }
  finally { loading.value = false }
}

async function fetchPendingRequests () {
  try {
    const { data } = await supabase.from('team_requests').select('*').eq('status', 'pending').order('requested_at')
    pendingRequests.value = data || []
  } catch { pendingRequests.value = [] }
}

async function approveRequest () {
  if (!newTeam.value.nome || !selectedRequest.value) return
  approvingId.value = selectedRequest.value.id
  try {
    const { error: te } = await supabase.from('teams').insert({ prefixo: selectedRequest.value.prefixo, nome: newTeam.value.nome, descricao: newTeam.value.descricao || null })
    if (te) throw te
    await supabase.from('team_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: 'italo.fontes@cgbengenharia.com.br' }).eq('id', selectedRequest.value.id)
    approveDialog.value = false
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== selectedRequest.value.id)
    await teamsStore.fetchTeams()
    $q.notify({ type: 'positive', message: `Equipe ${selectedRequest.value.prefixo} aprovada!` })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + e.message })
  } finally { approvingId.value = null }
}

const kpis = computed(() => [
  { label: 'Equipes', value: teamsStore.teams.length, icon: 'groups', color: '#3b82f6', sub: 'cadastradas' },
  { label: 'Serviços Hoje', value: recentEvidences.value.length, icon: 'task_alt', color: '#22c55e', sub: 'registrados hoje' },
  { label: 'Fotos Hoje', value: recentEvidences.value.reduce((s, e) => s + (e.evidence_photos?.length || 0), 0), icon: 'photo_camera', color: '#a855f7', sub: 'evidências coletadas' },
  { label: 'Pendentes Sync', value: recentEvidences.value.filter(e => e.sync_status !== 'synced').length, icon: 'cloud_sync', color: '#f59e0b', sub: 'aguardando envio' },
])

const activeTeams = computed(() => teamsStore.teams.slice(0, 8))

function strColor (str = '') {
  const colors = ['#3b82f6','#22c55e','#a855f7','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16']
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}
</script>

<style scoped>
.dash-page {
  padding: 32px 36px;
  max-width: 1400px;
}

/* ── Header ─────────────────────────────────────────────── */
.dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}
.dash-title {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f0f4ff;
}
.dash-date {
  font-size: 0.8rem;
  color: #4b5680;
  margin-top: 2px;
  text-transform: capitalize;
}

/* ── Alert banner ───────────────────────────────────────── */
.alert-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 0.85rem;
  color: #fcd34d;
}
.alert-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.alert-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245,158,11,0.25);
  flex-shrink: 0;
}

/* ── KPI Grid ───────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.kpi-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 20px 22px 16px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, background 0.2s;
}
.kpi-card:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.12);
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.kpi-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4b5680;
}
.kpi-icon-wrap {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}
.kpi-value {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #f0f4ff;
  line-height: 1;
  margin-bottom: 6px;
}
.kpi-sub {
  font-size: 0.75rem;
  color: #4b5680;
}
.kpi-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--accent);
  opacity: 0.5;
}

/* ── Main grid ──────────────────────────────────────────── */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
.span-2 { grid-column: span 2; }

.card-block {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 22px 24px;
}
.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.block-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #c8d0f0;
  letter-spacing: 0.01em;
}

/* ── Empty state ────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 0;
  font-size: 0.82rem;
  color: #4b5680;
  text-align: center;
}
.empty-icon { color: #2a2f4a; }

/* ── Evidências table ───────────────────────────────────── */
.ev-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
}
.ev-table th {
  text-align: left;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4b5680;
  padding: 0 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ev-table th.center, .ev-table td.center { text-align: center; }
.ev-table td {
  padding: 11px 10px;
  color: #c8d0f0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.ev-table tr:last-child td { border-bottom: none; }

.team-cell { display: flex; align-items: center; gap: 8px; }
.team-dot {
  width: 24px; height: 24px;
  border-radius: 6px;
  background: rgba(59,130,246,0.2);
  color: #3b82f6;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.muted { color: #4b5680; }

.status-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 600;
}
.status-pill.synced {
  background: rgba(34,197,94,0.12);
  color: #4ade80;
}
.status-pill.pending {
  background: rgba(245,158,11,0.12);
  color: #fbbf24;
}

/* ── Team list ──────────────────────────────────────────── */
.team-list { display: flex; flex-direction: column; gap: 4px; }
.team-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  border-radius: 8px;
  transition: background 0.15s;
}
.team-row:hover { background: rgba(255,255,255,0.04); }

.team-avatar {
  width: 34px; height: 34px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.8rem;
  color: #fff;
  flex-shrink: 0;
}
.team-info { flex: 1; min-width: 0; }
.team-name { font-size: 0.82rem; font-weight: 600; color: #c8d0f0; }
.team-sub { font-size: 0.72rem; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.team-badge {
  font-size: 0.68rem;
  font-weight: 600;
  color: #4b5680;
  background: rgba(255,255,255,0.05);
  padding: 2px 8px;
  border-radius: 100px;
  white-space: nowrap;
}
</style>
