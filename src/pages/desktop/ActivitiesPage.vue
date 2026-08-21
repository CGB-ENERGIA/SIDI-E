<template>
  <q-page class="act-page q-pa-lg">

    <!-- Page header + tabs -->
    <div class="flex items-center justify-between q-mb-sm">
      <div class="text-h5 text-weight-bold">Atividades</div>
    </div>

    <q-tabs v-model="tab" dense align="left" class="q-mb-lg act-tabs"
      active-color="white" indicator-color="primary" active-bg-color="primary">
      <q-tab name="atividades" icon="bar_chart" label="Atividades" />
      <q-tab name="servicos"   icon="build"     label="Serviços"   />
    </q-tabs>

    <q-tab-panels v-model="tab" animated keep-alive class="bg-transparent">

      <!-- ══════ TAB: ATIVIDADES ══════ -->
      <q-tab-panel name="atividades" class="q-pa-none">

        <!-- Filtro bar -->
        <div class="filter-bar q-mb-lg">
          <q-input v-model="atividadesDate" type="date" label="Todas as datas"
            outlined dense clearable bg-color="surface" style="min-width:190px;"
            @update:model-value="loadAtividades" />
          <q-select v-model="atividadesTeam" :options="teamOptions" label="Todas as equipes"
            outlined dense clearable emit-value map-options bg-color="surface"
            style="min-width:260px;" @update:model-value="loadAtividades" />
          <q-select v-model="filterSupervisor" :options="supervisoresList" label="Supervisor"
            outlined dense clearable bg-color="surface" style="min-width:180px;" />
          <q-select v-model="filterCoordenador" :options="coordenadoresList" label="Coordenador"
            outlined dense clearable bg-color="surface" style="min-width:160px;" />
          <q-btn unelevated icon="refresh" label="Atualizar" color="primary"
            :loading="loadingAtividades" @click="loadAtividades"
            style="height:40px; border-radius:8px;" />
        </div>

        <!-- KPI tiles -->
        <div class="kpi-row q-mb-xl">
          <div class="kpi-tile">
            <div class="kpi-icon"><q-icon name="receipt_long" size="22px" /></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ totalServicos }}</div>
              <div class="kpi-label">Serviços no dia</div>
            </div>
          </div>
          <div class="kpi-tile">
            <div class="kpi-icon kpi-icon--teams"><q-icon name="groups" size="22px" /></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ resumoEquipes.length }}</div>
              <div class="kpi-label">Equipes ativas</div>
            </div>
          </div>
          <div class="kpi-tile">
            <div class="kpi-icon kpi-icon--people"><q-icon name="people" size="22px" /></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ totalColaboradores }}</div>
              <div class="kpi-label">Colaboradores em campo</div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!loadingAtividades && resumoEquipes.length === 0" class="empty-state">
          <q-icon name="event_busy" size="56px" color="grey-7" />
          <div class="text-grey-5 q-mt-md text-subtitle1">Nenhum serviço registrado nesta data</div>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loadingAtividades" class="team-list">
          <q-card v-for="n in 3" :key="n" flat class="team-card">
            <q-skeleton height="100px" />
          </q-card>
        </div>

        <!-- Team cards -->
        <div v-else class="team-list">
          <div v-for="equipe in resumoEquipes" :key="equipe.teamId" class="team-card">
            <!-- Card header -->
            <div class="team-card__header" @click="toggleExpand(equipe.teamId)">
              <div class="team-card__left">
                <div class="team-badge">
                  <span class="team-badge__prefix">{{ equipe.prefixo }}</span>
                </div>
                <div class="team-card__info">
                  <div class="team-card__nome">{{ equipe.nomeEquipe }}</div>
                  <div class="team-card__chips">
                    <q-chip
                      v-for="(nome, i) in equipe.atividadeNomes" :key="i"
                      dense size="sm"
                      class="act-chip"
                    >{{ nome }}</q-chip>
                  </div>
                </div>
              </div>

              <div class="team-card__right">
                <!-- Collaborator avatars -->
                <div class="avatar-stack q-mr-lg">
                  <q-avatar
                    v-for="(c, i) in equipe.colaboradores.slice(0,4)" :key="i"
                    size="32px"
                    color="primary"
                    text-color="white"
                    class="avatar-stack__item"
                    :style="`z-index:${4-i}; font-size:0.65rem;`"
                  >{{ initials(c) }}</q-avatar>
                  <div v-if="equipe.colaboradores.length > 4" class="avatar-more">
                    +{{ equipe.colaboradores.length - 4 }}
                  </div>
                </div>

                <!-- Count badge -->
                <div class="count-badge">
                  <div class="count-badge__number">{{ equipe.total }}</div>
                  <div class="count-badge__label">{{ equipe.total === 1 ? 'serviço' : 'serviços' }}</div>
                </div>

                <!-- Expand arrow -->
                <q-icon
                  :name="expanded.includes(equipe.teamId) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                  size="24px" color="grey-5" class="q-ml-md"
                />
              </div>
            </div>

            <!-- Expanded: service rows -->
            <transition name="slide">
              <div v-if="expanded.includes(equipe.teamId)" class="team-card__detail">
                <div class="detail-header" :class="{ 'detail-header--admin': authStore.isAdmin }">
                  <span>Horário</span><span>Serviço</span><span>Colaboradores</span><span v-if="authStore.isAdmin"></span>
                </div>
                <div
                  v-for="svc in equipe.servicos" :key="svc.id"
                  class="detail-row"
                  :class="{ 'detail-row--admin': authStore.isAdmin }"
                >
                  <span class="detail-time">{{ formatTime(svc.created_at) }}</span>
                  <span class="detail-act">{{ svc.activity_name || '—' }}</span>
                  <span class="detail-collabs">{{ (svc.colaboradores || []).join(', ') }}</span>
                  <span v-if="authStore.isAdmin" class="detail-actions">
                    <q-btn flat round dense icon="delete" color="negative" size="sm"
                      @click.stop="confirmDeleteService(svc)">
                      <q-tooltip>Excluir registro</q-tooltip>
                    </q-btn>
                  </span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </q-tab-panel>

      <!-- ══════ TAB: SERVIÇOS ══════ -->
      <q-tab-panel name="servicos" class="q-pa-none">
        <div class="flex items-center justify-between q-mb-md">
          <q-input v-model="search" outlined dense placeholder="Buscar serviço..."
            clearable style="max-width:360px;" bg-color="surface">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
          <q-btn
            v-if="authStore.isAdmin"
            unelevated rounded color="primary" icon="add" label="Novo Serviço"
            @click="openForm()"
          />
        </div>

        <q-card flat bordered style="border-radius:14px;">
          <q-table :rows="filtered" :columns="colsServicos" row-key="id" flat
            :loading="activitiesStore.loading">
            <template #body-cell-tipo="{ row }">
              <q-td>
                <q-chip dense :color="tipoColor(row.tipo)" text-color="white">
                  {{ tipoLabel(row.tipo) }}
                </q-chip>
              </q-td>
            </template>
            <template #body-cell-status="{ row }">
              <q-td>
                <q-badge :color="row.status === 'ativo' ? 'positive' : 'grey'"
                  :label="row.status === 'ativo' ? 'Ativo' : 'Inativo'" />
              </q-td>
            </template>
            <template #body-cell-acoes="{ row }">
              <q-td class="text-right">
                <template v-if="authStore.isAdmin">
                  <q-btn flat round dense icon="edit" color="primary" @click="openForm(row)" />
                  <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(row)" />
                </template>
                <span v-else class="text-caption text-grey-6">—</span>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Dialog CRUD serviço -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:420px; border-radius:16px;">
        <q-card-section class="text-h6 text-weight-bold">
          {{ editing ? 'Editar serviço' : 'Novo serviço' }}
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-lg">
          <q-input v-model="form.nome" label="Nome *" outlined dense class="q-mb-md"
            :rules="[v => !!v || 'Obrigatório']" />
          <q-input v-model="form.descricao" label="Descrição" outlined dense
            type="textarea" rows="2" class="q-mb-md" />
          <q-select v-model="form.tipo" :options="tipoOptions" label="Tipo *"
            outlined dense emit-value map-options class="q-mb-md" />
          <q-select v-model="form.status" :options="['ativo','inativo']"
            label="Status" outlined dense />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated rounded color="primary"
            :label="editing ? 'Salvar' : 'Criar'"
            :loading="saving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useActivitiesStore } from 'src/stores/activities'
import { useTeamsStore } from 'src/stores/teams'
import { useEvidenceStore } from 'src/stores/evidence'
import { useAuthStore } from 'src/stores/auth'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'
import { EQUIPES_FILTRO, SUPERVISORES, COORDENADORES } from 'src/data/equipes-filtro'

const activitiesStore = useActivitiesStore()
const teamsStore = useTeamsStore()
const evidenceStore = useEvidenceStore()
const authStore = useAuthStore()
const $q = useQuasar()

const tab = ref('atividades')

// ── ATIVIDADES ──────────────────────────────────────────
const atividadesDate = ref(null)
const atividadesTeam = ref(null)
const filterSupervisor = ref(null)
const filterCoordenador = ref(null)
const loadingAtividades = ref(false)
const servicesData = ref([])
const expanded = ref([])

const supervisoresList = SUPERVISORES
const coordenadoresList = COORDENADORES

const teamOptions = computed(() =>
  teamsStore.teams.map(t => ({ label: `${t.prefixo} — ${t.nome}`, value: t.id }))
)

const totalServicos = computed(() => servicesData.value.length)

const resumoEquipes = computed(() => {
  const map = {}
  for (const svc of servicesData.value) {
    const tid = svc.team_id
    if (!map[tid]) {
      map[tid] = {
        teamId: tid,
        prefixo: svc.teams?.prefixo || '—',
        nomeEquipe: svc.teams?.nome || '',
        total: 0,
        atividadeNomes: [],
        colaboradores: [],
        servicos: []
      }
    }
    map[tid].total++
    map[tid].servicos.push(svc)
    if (svc.activity_name && !map[tid].atividadeNomes.includes(svc.activity_name))
      map[tid].atividadeNomes.push(svc.activity_name)
    for (const c of (svc.colaboradores || []))
      if (!map[tid].colaboradores.includes(c)) map[tid].colaboradores.push(c)
  }
  let result = Object.values(map).sort((a, b) => a.prefixo.localeCompare(b.prefixo))
  if (filterSupervisor.value)
    result = result.filter(e => EQUIPES_FILTRO[e.prefixo]?.supervisor === filterSupervisor.value)
  if (filterCoordenador.value)
    result = result.filter(e => EQUIPES_FILTRO[e.prefixo]?.coordenador === filterCoordenador.value)
  return result
})

const totalColaboradores = computed(() => {
  const all = new Set()
  resumoEquipes.value.forEach(e => e.colaboradores.forEach(c => all.add(c)))
  return all.size
})

function toggleExpand (teamId) {
  const idx = expanded.value.indexOf(teamId)
  if (idx === -1) expanded.value.push(teamId)
  else expanded.value.splice(idx, 1)
}

async function loadAtividades () {
  loadingAtividades.value = true
  try {
    let query = supabase
      .from('services')
      .select('id, team_id, activity_name, colaboradores, created_at, teams(prefixo, nome)')
      .order('created_at', { ascending: false })
    if (atividadesDate.value) {
      query = query
        .gte('created_at', atividadesDate.value + 'T00:00:00')
        .lte('created_at', atividadesDate.value + 'T23:59:59')
    }
    if (atividadesTeam.value) query = query.eq('team_id', atividadesTeam.value)
    const { data, error } = await query
    if (error) throw error
    servicesData.value = data || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar atividades: ' + e.message })
  } finally {
    loadingAtividades.value = false
  }
}

function formatTime (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function initials (nome) {
  if (!nome) return '?'
  const parts = nome.trim().split(' ').filter(Boolean)
  return parts.length === 1
    ? parts[0][0]
    : parts[0][0] + parts[parts.length - 1][0]
}

// ── SERVIÇOS ────────────────────────────────────────────
const search = ref('')
const showForm = ref(false)
const saving = ref(false)
const editing = ref(null)
const form = ref({ nome: '', descricao: '', tipo: 'servico', status: 'ativo' })

const tipoOptions = [
  { label: 'Serviço',    value: 'servico'    },
  { label: 'Manutenção', value: 'manutencao' },
  { label: 'Inspeção',   value: 'inspecao'   },
  { label: 'Emergência', value: 'emergencia' }
]

const colsServicos = [
  { name: 'nome',      label: 'Nome',      field: 'nome',      align: 'left',   sortable: true },
  { name: 'tipo',      label: 'Tipo',      field: 'tipo',      align: 'left',   sortable: true },
  { name: 'descricao', label: 'Descrição', field: 'descricao', align: 'left'   },
  { name: 'status',    label: 'Status',    field: 'status',    align: 'center', sortable: true },
  { name: 'acoes',     label: 'Ações',     field: 'acoes',     align: 'right'  }
]

const filtered = computed(() =>
  activitiesStore.activities.filter(a =>
    !search.value ||
    a.nome?.toLowerCase().includes(search.value.toLowerCase()) ||
    a.descricao?.toLowerCase().includes(search.value.toLowerCase())
  )
)

function tipoLabel (t) { return tipoOptions.find(o => o.value === t)?.label || t }
function tipoColor (t) {
  return { servico: 'primary', manutencao: 'orange', inspecao: 'teal', emergencia: 'negative' }[t] || 'grey'
}

function openForm (activity = null) {
  if (!authStore.isAdmin) {
    $q.notify({ type: 'negative', message: 'Sem permissão para editar.' })
    return
  }
  editing.value = activity
  form.value = activity
    ? { nome: activity.nome, descricao: activity.descricao || '', tipo: activity.tipo || 'servico', status: activity.status || 'ativo' }
    : { nome: '', descricao: '', tipo: 'servico', status: 'ativo' }
  showForm.value = true
}

async function save () {
  if (!authStore.isAdmin) {
    $q.notify({ type: 'negative', message: 'Sem permissão para editar.' })
    return
  }
  if (!form.value.nome) return
  saving.value = true
  try {
    const nome = form.value.nome
    if (editing.value) {
      await activitiesStore.updateActivity(editing.value.id, { ...form.value })
    } else {
      await activitiesStore.createActivity({ ...form.value })
      await activitiesStore.fetchActivities()
      search.value = nome
    }
    showForm.value = false
    $q.notify({ type: 'positive', message: 'Serviço salvo com sucesso!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + (e.message || JSON.stringify(e)) })
  } finally {
    saving.value = false
  }
}

function confirmDelete (activity) {
  if (!authStore.isAdmin) {
    $q.notify({ type: 'negative', message: 'Sem permissão para excluir.' })
    return
  }
  $q.dialog({
    title: 'Excluir serviço',
    message: `Tem certeza que deseja excluir "${activity.nome}"?`,
    cancel: true, color: 'negative'
  }).onOk(async () => {
    try {
      await activitiesStore.deleteActivity(activity.id)
      $q.notify({ type: 'positive', message: 'Serviço excluído.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message })
    }
  })
}

function confirmDeleteService (svc) {
  if (!authStore.isAdmin) {
    $q.notify({ type: 'negative', message: 'Sem permissão para excluir.' })
    return
  }
  $q.dialog({
    title: 'Excluir registro',
    message: `Excluir o serviço <strong>${svc.activity_name || '—'}</strong> e suas fotos?`,
    html: true,
    cancel: true,
    ok: { label: 'Excluir', color: 'negative', unelevated: true }
  }).onOk(async () => {
    try {
      await evidenceStore.deleteService(svc.id)
      servicesData.value = servicesData.value.filter(s => s.id !== svc.id)
      $q.notify({ type: 'positive', message: 'Registro excluído.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro ao excluir: ' + (e.message || e) })
    }
  })
}

onMounted(async () => {
  await Promise.all([activitiesStore.fetchActivities(), teamsStore.fetchTeams(), loadAtividades()])
})
</script>

<style scoped>
/* ── Page ─────────────────────────────────────────────── */
.act-page { min-height: 100vh; }

/* ── Tab bar ─────────────────────────────────────────── */
.act-tabs {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 4px;
  border: 1px solid rgba(255,255,255,0.08);
}

:deep(.act-tabs .q-tab) {
  border-radius: 7px;
  min-height: 38px;
  padding: 0 20px;
  color: rgba(255,255,255,0.5);
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: color 0.2s, background 0.2s;
}

:deep(.act-tabs .q-tab--active) {
  color: #fff !important;
  background: var(--q-primary);
  box-shadow: 0 2px 8px rgba(15,111,255,0.35);
}

:deep(.act-tabs .q-tab__indicator) {
  display: none;
}

/* ── Filter bar ──────────────────────────────────────── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ── KPI tiles ───────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.kpi-tile {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.04);
}

.kpi-icon {
  width: 44px; height: 44px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(59,130,246,0.18);
  color: #3b82f6;
  flex-shrink: 0;
}
.kpi-icon--teams  { background: rgba(139,92,246,0.18); color: #8b5cf6; }
.kpi-icon--people { background: rgba(34,197,94,0.18);  color: #22c55e; }

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.kpi-label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.45);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Team cards ──────────────────────────────────────── */
.team-list { display: flex; flex-direction: column; gap: 12px; }

.team-card {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  overflow: hidden;
  transition: border-color 0.2s;
}
.team-card:hover { border-color: rgba(59,130,246,0.35); }

/* Card header: clickable row */
.team-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  cursor: pointer;
  user-select: none;
}

.team-card__left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  min-width: 0;
}

.team-badge {
  background: linear-gradient(135deg, #1d4ed8 0%, #0f3460 100%);
  border-radius: 10px;
  padding: 8px 14px;
  flex-shrink: 0;
}
.team-badge__prefix {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.team-card__nome {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.4);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.team-card__chips { display: flex; flex-wrap: wrap; gap: 6px; }

.act-chip {
  background: rgba(59,130,246,0.15) !important;
  color: #93c5fd !important;
  border: 1px solid rgba(59,130,246,0.3) !important;
  font-size: 0.72rem !important;
}

/* Right section */
.team-card__right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0;
}

/* Avatar stack */
.avatar-stack { display: flex; align-items: center; }
.avatar-stack__item {
  border: 2px solid rgba(13,17,23,0.9);
  margin-left: -8px;
  font-size: 0.6rem !important;
}
.avatar-stack__item:first-child { margin-left: 0; }
.avatar-more {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
  font-size: 0.65rem;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(13,17,23,0.9);
  margin-left: -8px;
}

/* Count badge */
.count-badge {
  text-align: center;
  min-width: 64px;
}
.count-badge__number {
  font-size: 2rem;
  font-weight: 800;
  color: #22c55e;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.count-badge__label {
  font-size: 0.65rem;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Expanded detail rows */
.team-card__detail {
  border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.2);
  padding: 0 24px 12px;
}

.detail-header {
  display: grid;
  grid-template-columns: 72px 1fr 1fr;
  gap: 16px;
  padding: 10px 0 6px;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.25);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  margin-bottom: 4px;
}
.detail-header--admin {
  grid-template-columns: 72px 1fr 1fr 44px;
}

.detail-row {
  display: grid;
  grid-template-columns: 72px 1fr 1fr;
  gap: 16px;
  padding: 8px 0;
  font-size: 0.82rem;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  align-items: center;
}
.detail-row--admin {
  grid-template-columns: 72px 1fr 1fr 44px;
}
.detail-row:last-child { border-bottom: none; }
.detail-actions { text-align: right; }

.detail-time {
  color: rgba(255,255,255,0.35);
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
}
.detail-act  { color: rgba(255,255,255,0.85); font-weight: 500; }
.detail-collabs { color: rgba(255,255,255,0.4); font-size: 0.75rem; }

/* Slide transition */
.slide-enter-active, .slide-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
  max-height: 600px;
}
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; }

/* Empty state */
.empty-state {
  text-align: center;
  padding: 64px 0;
}

/* Light theme overrides */
:root[data-theme="light"] .kpi-tile,
:root[data-theme="light"] .team-card {
  background: rgba(0,0,0,0.03);
  border-color: rgba(0,0,0,0.08);
}
:root[data-theme="light"] .team-badge {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
}
:root[data-theme="light"] .kpi-value { color: #111827; }
:root[data-theme="light"] .kpi-label { color: #6b7280; }
:root[data-theme="light"] .count-badge__number { color: #16a34a; }
:root[data-theme="light"] .count-badge__label { color: #9ca3af; }
:root[data-theme="light"] .detail-act { color: #111827; }
:root[data-theme="light"] .detail-collabs { color: #6b7280; }
:root[data-theme="light"] .team-card__detail { background: rgba(0,0,0,0.03); }

/* Responsive */
@media (max-width: 768px) {
  .kpi-row { grid-template-columns: 1fr; }
  .team-card__header { flex-wrap: wrap; gap: 12px; }
  .team-card__right { flex-wrap: wrap; }
}
</style>
