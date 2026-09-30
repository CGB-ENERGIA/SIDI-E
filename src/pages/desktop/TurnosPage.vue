<template>
  <q-page class="turnos-page q-pa-lg">

    <!-- Header -->
    <div class="flex items-center justify-between q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">Controle de Turnos</div>
        <div class="text-caption text-grey-5 q-mt-xs">Acompanhamento diário de início de turno por equipe</div>
      </div>
      <div class="flex items-center gap-sm q-gutter-sm">
        <q-chip v-if="isToday" color="positive" text-color="white" icon="wifi_tethering" dense>
          Tempo real
        </q-chip>
        <q-btn outline dense icon="refresh" label="Atualizar" color="primary"
          :loading="loading" @click="load" style="border-radius:8px;" />
      </div>
    </div>

    <!-- Filtros -->
    <div class="filter-bar q-mb-lg">
      <q-input v-model="filterDate" type="date" label="Data" outlined dense clearable
        bg-color="surface" style="min-width:180px;" @update:model-value="load" />
      <q-select v-model="filterSupervisor" :options="supervisoresList" label="Supervisor"
        outlined dense clearable bg-color="surface" style="min-width:180px;" />
      <q-select v-model="filterCoordenador" :options="coordenadoresList" label="Coordenador"
        outlined dense clearable bg-color="surface" style="min-width:160px;" />
      <q-select v-model="filterGerencia" :options="gerentesList" label="Gerência"
        outlined dense clearable bg-color="surface" style="min-width:160px;" />
      <q-input v-model="search" outlined dense placeholder="Buscar prefixo ou equipe..."
        clearable bg-color="surface" style="min-width:220px;">
        <template #prepend><q-icon name="search" /></template>
      </q-input>
    </div>

    <!-- KPI cards (clicáveis para filtrar) -->
    <div class="kpi-row q-mb-xl">
      <!-- Total -->
      <div class="kpi-card" :class="{ 'kpi-card--active': statusFilter === null }"
        @click="statusFilter = null">
        <div class="kpi-icon kpi-icon--neutral"><q-icon name="groups" size="22px" /></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ totalEquipes }}</div>
          <div class="kpi-label">Total de equipes</div>
        </div>
      </div>

      <!-- Abriram turno (em_turno + encerrado) -->
      <div class="kpi-card" :class="{ 'kpi-card--active': statusFilter === 'abriu' }"
        @click="statusFilter = statusFilter === 'abriu' ? null : 'abriu'">
        <div class="kpi-icon kpi-icon--green"><q-icon name="login" size="22px" /></div>
        <div class="kpi-body">
          <div class="kpi-value" style="color:#22c55e;">{{ countAbriu }}</div>
          <div class="kpi-label">Abriram turno</div>
          <div class="kpi-sub">
            <span class="kpi-sub--em">● {{ countEmTurno }} em campo</span>
            <span class="kpi-sub--enc q-ml-sm">● {{ countEncerrado }} encerrado</span>
          </div>
        </div>
      </div>

      <!-- Em campo agora -->
      <div class="kpi-card" :class="{ 'kpi-card--active': statusFilter === 'em_turno' }"
        @click="statusFilter = statusFilter === 'em_turno' ? null : 'em_turno'">
        <div class="kpi-icon kpi-icon--teal"><q-icon name="wifi_tethering" size="22px" /></div>
        <div class="kpi-body">
          <div class="kpi-value" style="color:#14b8a6;">{{ countEmTurno }}</div>
          <div class="kpi-label">Em campo agora</div>
        </div>
      </div>

      <!-- Não abriram -->
      <div class="kpi-card" :class="{ 'kpi-card--active': statusFilter === 'sem_turno' }"
        @click="statusFilter = statusFilter === 'sem_turno' ? null : 'sem_turno'">
        <div class="kpi-icon kpi-icon--red"><q-icon name="block" size="22px" /></div>
        <div class="kpi-body">
          <div class="kpi-value" style="color:#ef4444;">{{ countSemTurno }}</div>
          <div class="kpi-label">Não abriram turno</div>
        </div>
      </div>
    </div>

    <!-- Lista de equipes -->
    <div v-if="loading" class="team-list">
      <div v-for="n in 6" :key="n" class="team-row">
        <q-skeleton height="60px" style="border-radius:12px;" />
      </div>
    </div>

    <div v-else-if="filteredTeams.length === 0" class="empty-state">
      <q-icon name="search_off" size="56px" color="grey-7" />
      <div class="text-grey-5 q-mt-md">Nenhuma equipe encontrada</div>
    </div>

    <div v-else>
      <!-- Agrupamento por Gerência → Coordenador → Equipes -->
      <div v-for="gerGroup in groupedTeams" :key="gerGroup.gerencia" class="q-mb-xl">

        <!-- Cabeçalho Gerência -->
        <div class="group-header q-mb-md">
          <div class="group-header__line" />
          <div class="group-header__label">
            <q-icon name="corporate_fare" size="16px" class="q-mr-xs" />
            {{ gerGroup.gerencia || 'Sem Gerência' }}
            <q-badge class="q-ml-sm" color="grey-7" :label="gerGroup.total" />
          </div>
          <div class="group-header__line" />
          <!-- mini stats da gerência -->
          <div class="group-mini-stats">
            <span class="mini-stat mini-stat--green">
              <q-icon name="login" size="12px" /> {{ gerGroup.emTurno + gerGroup.encerrado }} abriram
            </span>
            <span class="mini-stat mini-stat--teal q-ml-sm">
              <q-icon name="wifi_tethering" size="12px" /> {{ gerGroup.emTurno }} em campo
            </span>
            <span class="mini-stat mini-stat--red q-ml-sm">
              <q-icon name="block" size="12px" /> {{ gerGroup.semTurno }} não abriram
            </span>
          </div>
        </div>

        <!-- Coordenadores dentro da gerência -->
        <div v-for="coordGroup in gerGroup.coordenadores" :key="coordGroup.coordenador" class="q-mb-lg">
          <div class="coord-header q-mb-sm">
            <q-icon name="person_pin" size="14px" color="grey-5" class="q-mr-xs" />
            <span class="text-caption text-grey-4 text-weight-bold" style="letter-spacing:0.06em; text-transform:uppercase;">
              {{ coordGroup.coordenador || 'Sem Coordenador' }}
            </span>
            <span class="text-caption text-grey-6 q-ml-sm">· {{ coordGroup.teams.length }} equipe{{ coordGroup.teams.length !== 1 ? 's' : '' }}</span>
          </div>

          <div class="team-list">
            <div
              v-for="team in coordGroup.teams" :key="team.id"
              class="team-row"
              :class="`team-row--${team.status}`"
            >
              <!-- Status stripe -->
              <div class="team-row__stripe" :class="`stripe--${team.status}`" />

              <!-- Prefixo badge -->
              <div class="team-badge" :class="`team-badge--${team.status}`">
                {{ team.prefixo }}
              </div>

              <!-- Info principal -->
              <div class="team-info flex-1">
                <div class="team-info__nome">{{ team.nome }}</div>
                <div class="team-info__sub">
                  <span class="q-mr-md"><q-icon name="person" size="12px" class="q-mr-xs" />{{ team.supervisor || '—' }}</span>
                </div>
              </div>

              <!-- Membros em sessão ou do dia -->
              <div class="team-members" v-if="team.activeMembers.length || team.servicoColabs.length">
                <q-avatar
                  v-for="(m, i) in (team.activeMembers.length ? team.activeMembers : team.servicoColabs).slice(0, 4)"
                  :key="i"
                  size="28px" color="primary" text-color="white"
                  class="member-avatar"
                  :style="`z-index:${4 - i}; margin-left:${i === 0 ? '0' : '-8px'};`"
                >{{ initials(m) }}</q-avatar>
                <div
                  v-if="(team.activeMembers.length || team.servicoColabs.length) > 4"
                  class="member-more"
                >+{{ (team.activeMembers.length || team.servicoColabs.length) - 4 }}</div>
              </div>

              <!-- Serviços do dia -->
              <div class="team-count" v-if="team.servicosCount > 0">
                <q-icon name="receipt_long" size="14px" color="grey-5" />
                <span class="text-caption q-ml-xs">{{ team.servicosCount }} serv.</span>
              </div>

              <!-- Hora início -->
              <div class="team-time" v-if="team.firstAt">
                <q-icon name="schedule" size="14px" color="grey-6" />
                <span class="text-caption q-ml-xs text-grey-5">{{ team.firstAt }}</span>
              </div>

              <!-- Status pill -->
              <q-chip
                dense size="sm"
                :color="statusColor(team.status)"
                text-color="white"
                :icon="statusIcon(team.status)"
                class="status-chip"
              >{{ statusLabel(team.status) }}</q-chip>
            </div>
          </div>
        </div>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTeamsStore } from 'src/stores/teams'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'

const teamsStore = useTeamsStore()
const $q = useQuasar()

const loading       = ref(false)
const activeSessions = ref([])   // { id, team_id, prefixo, colaborador, data }
const servicesDay   = ref([])    // services for selected date
const filterDate    = ref(todayStr())
const filterSupervisor  = ref(null)
const filterCoordenador = ref(null)
const filterGerencia    = ref(null)
const search        = ref('')
const statusFilter  = ref(null)

let refreshInterval = null

function todayStr () {
  return new Date().toISOString().split('T')[0]
}

const isToday = computed(() => filterDate.value === todayStr() || !filterDate.value)

// ── Listas de filtros ─────────────────────────────────
const supervisoresList = computed(() => {
  const s = new Set(teamsStore.teams.map(t => t.supervisor).filter(Boolean))
  return [...s].sort()
})
const coordenadoresList = computed(() => {
  const s = new Set(teamsStore.teams.map(t => t.coordenador).filter(Boolean))
  return [...s].sort()
})
const gerentesList = computed(() => {
  const s = new Set(teamsStore.teams.map(t => t.gerencia).filter(Boolean))
  return [...s].sort()
})

// ── Status helpers ─────────────────────────────────────
function statusLabel (s) {
  return { em_turno: 'Em Turno', encerrado: 'Encerrado', sem_turno: 'Sem Turno' }[s] || s
}
function statusColor (s) {
  return { em_turno: 'positive', encerrado: 'warning', sem_turno: 'negative' }[s] || 'grey'
}
function statusIcon (s) {
  return { em_turno: 'login', encerrado: 'task_alt', sem_turno: 'block' }[s] || ''
}

function initials (nome) {
  if (!nome) return '?'
  const parts = nome.trim().split(' ').filter(Boolean)
  return parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
}

// ── Dados brutos → mapa por team_id ──────────────────
const activeMap = computed(() => {
  const m = {}
  for (const s of activeSessions.value) {
    if (!m[s.team_id]) m[s.team_id] = []
    m[s.team_id].push(s.colaborador)
  }
  return m
})

const servicesMap = computed(() => {
  const m = {}
  for (const svc of servicesDay.value) {
    const tid = svc.team_id
    if (!m[tid]) m[tid] = { count: 0, colaboradores: new Set(), firstAt: null }
    m[tid].count++
    for (const c of (svc.colaboradores || [])) m[tid].colaboradores.add(c)
    const t = formatTime(svc.created_at)
    if (!m[tid].firstAt || svc.created_at < m[tid].firstAt) m[tid].firstAt = svc.created_at
  }
  // convert sets to arrays and format time
  for (const tid of Object.keys(m)) {
    m[tid].colaboradores = [...m[tid].colaboradores]
    m[tid].firstAt = m[tid].firstAt ? formatTime(m[tid].firstAt) : null
  }
  return m
})

// ── Equipes enriquecidas ───────────────────────────────
const allTeamsEnriched = computed(() =>
  teamsStore.teams.map(team => {
    const activeMembers  = activeMap.value[team.id] || []
    const svcData        = servicesMap.value[team.id] || { count: 0, colaboradores: [], firstAt: null }
    const isActive       = activeMembers.length > 0
    const hadActivity    = svcData.count > 0

    let status
    if (isActive) status = 'em_turno'
    else if (hadActivity) status = 'encerrado'
    else status = 'sem_turno'

    return {
      ...team,
      status,
      activeMembers,
      servicoColabs: svcData.colaboradores,
      servicosCount: svcData.count,
      firstAt: isActive ? null : svcData.firstAt
    }
  })
)

// ── Filtros ───────────────────────────────────────────
const filteredTeams = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allTeamsEnriched.value.filter(t => {
    if (statusFilter.value === 'abriu' && t.status === 'sem_turno') return false
    else if (statusFilter.value && statusFilter.value !== 'abriu' && t.status !== statusFilter.value) return false
    if (filterSupervisor.value && t.supervisor !== filterSupervisor.value) return false
    if (filterCoordenador.value && t.coordenador !== filterCoordenador.value) return false
    if (filterGerencia.value && t.gerencia !== filterGerencia.value) return false
    if (q && !t.prefixo?.toLowerCase().includes(q) && !t.nome?.toLowerCase().includes(q)) return false
    return true
  })
})

// ── KPI counts ────────────────────────────────────────
const totalEquipes   = computed(() => filteredTeams.value.length)
const countEmTurno   = computed(() => filteredTeams.value.filter(t => t.status === 'em_turno').length)
const countEncerrado = computed(() => filteredTeams.value.filter(t => t.status === 'encerrado').length)
const countSemTurno  = computed(() => filteredTeams.value.filter(t => t.status === 'sem_turno').length)
const countAbriu     = computed(() => countEmTurno.value + countEncerrado.value)

// ── Agrupamento Gerência → Coordenador ───────────────
const groupedTeams = computed(() => {
  const gerMap = {}
  for (const t of filteredTeams.value) {
    const ger = t.gerencia || ''
    const coord = t.coordenador || ''
    if (!gerMap[ger]) gerMap[ger] = { gerencia: ger, coordenadores: {}, total: 0, emTurno: 0, encerrado: 0, semTurno: 0 }
    if (!gerMap[ger].coordenadores[coord]) gerMap[ger].coordenadores[coord] = { coordenador: coord, teams: [] }
    gerMap[ger].coordenadores[coord].teams.push(t)
    gerMap[ger].total++
    if (t.status === 'em_turno')  gerMap[ger].emTurno++
    if (t.status === 'encerrado') gerMap[ger].encerrado++
    if (t.status === 'sem_turno') gerMap[ger].semTurno++
  }
  return Object.values(gerMap)
    .sort((a, b) => a.gerencia.localeCompare(b.gerencia))
    .map(g => ({
      ...g,
      coordenadores: Object.values(g.coordenadores).sort((a, b) => a.coordenador.localeCompare(b.coordenador))
    }))
})

// ── Carregamento ──────────────────────────────────────
async function load () {
  loading.value = true
  try {
    const date = filterDate.value || todayStr()
    const start = date + 'T00:00:00'
    const end   = date + 'T23:59:59'

    const [sessRes, svcRes] = await Promise.all([
      supabase.from('active_sessions').select('id, team_id, prefixo, colaborador, data').order('prefixo'),
      supabase.from('services')
        .select('team_id, activity_name, colaboradores, created_at')
        .gte('created_at', start)
        .lte('created_at', end)
    ])

    if (sessRes.error) throw sessRes.error
    if (svcRes.error) throw svcRes.error

    activeSessions.value = sessRes.data || []
    servicesDay.value    = svcRes.data  || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar turnos: ' + e.message })
  } finally {
    loading.value = false
  }
}

function formatTime (iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await Promise.all([teamsStore.fetchTeams(), load()])
  // Atualiza automaticamente a cada 60s para manter o tempo real
  refreshInterval = setInterval(() => {
    if (isToday.value) load()
  }, 60000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<style scoped>
.turnos-page {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 70% 35% at 50% 0%, color-mix(in oklab, var(--primary) 7%, transparent) 0%, transparent 60%),
    var(--background);
}

/* ── Filtros ─────────────────────────────────────────── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ── KPI cards ──────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--card);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  user-select: none;
}
.kpi-card:hover {
  border-color: color-mix(in oklab, var(--primary) 40%, transparent);
}
.kpi-card--active {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 25%, transparent);
}

.kpi-icon {
  width: 42px; height: 42px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.kpi-icon--neutral { background: rgba(255,255,255,0.08); color: var(--muted-fg); }
.kpi-icon--green   { background: rgba(34,197,94,0.18);  color: #22c55e; }
.kpi-icon--teal    { background: rgba(20,184,166,0.18); color: #14b8a6; }
.kpi-icon--amber   { background: rgba(245,158,11,0.18); color: #f59e0b; }
.kpi-icon--red     { background: rgba(239,68,68,0.18);  color: #ef4444; }

.kpi-value {
  font-size: 1.85rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--fg);
}
.kpi-label {
  font-size: 0.72rem;
  color: var(--muted-fg);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.kpi-sub {
  display: flex;
  align-items: center;
  margin-top: 4px;
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}
.kpi-sub--em  { color: #14b8a6; }
.kpi-sub--enc { color: #f59e0b; }

/* ── Grouping headers ───────────────────────────────── */
.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.group-header__line {
  flex: 1;
  height: 1px;
  background: var(--border);
}
.group-header__label {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted-fg);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  white-space: nowrap;
}
.group-mini-stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.mini-stat {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.mini-stat--green { color: #22c55e; }
.mini-stat--teal  { color: #14b8a6; }
.mini-stat--amber { color: #f59e0b; }
.mini-stat--red   { color: #ef4444; }

.coord-header {
  display: flex;
  align-items: center;
  padding-left: 4px;
}

/* ── Team rows ──────────────────────────────────────── */
.team-list { display: flex; flex-direction: column; gap: 8px; }

.team-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px 14px 0;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card);
  overflow: hidden;
  transition: border-color 0.2s;
  position: relative;
}
.team-row:hover { border-color: color-mix(in oklab, var(--primary) 30%, transparent); }

/* Status stripe */
.team-row__stripe {
  width: 4px;
  align-self: stretch;
  flex-shrink: 0;
  border-radius: 0;
}
.stripe--em_turno  { background: #22c55e; }
.stripe--encerrado { background: #f59e0b; }
.stripe--sem_turno { background: #374151; }

/* Team badge */
.team-badge {
  flex-shrink: 0;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.team-badge--em_turno  { background: rgba(34,197,94,0.18);  color: #22c55e; }
.team-badge--encerrado { background: rgba(245,158,11,0.18); color: #f59e0b; }
.team-badge--sem_turno { background: rgba(55,65,81,0.5);    color: var(--muted-fg); }

/* Team info */
.team-info { min-width: 0; }
.team-info__nome {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.team-info__sub {
  display: flex;
  align-items: center;
  font-size: 0.72rem;
  color: var(--muted-fg);
  margin-top: 2px;
}

/* Members */
.team-members { display: flex; align-items: center; flex-shrink: 0; }
.member-avatar {
  border: 2px solid var(--background);
  font-size: 0.6rem !important;
}
.member-more {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--border);
  color: var(--muted-fg);
  font-size: 0.6rem;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--background);
  margin-left: -8px;
}

/* Extra info */
.team-count, .team-time {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  white-space: nowrap;
}

.status-chip { flex-shrink: 0; }

/* ── Empty state ─────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 64px 0;
}

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 900px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .kpi-row { grid-template-columns: 1fr; }
  .team-time, .team-count { display: none; }
}
</style>
