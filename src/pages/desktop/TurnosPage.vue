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
        <q-btn unelevated icon="share" label="Compartilhar" color="primary"
          @click="showShare = true" style="border-radius:8px;" />
        <q-btn outline dense icon="refresh" label="Atualizar" color="grey-7"
          :loading="loading" @click="load" style="border-radius:8px;" />
      </div>
    </div>

    <!-- Filtros -->
    <div class="filter-bar q-mb-lg">
      <q-input v-model="filterDate" type="date" label="Data" outlined dense clearable
        bg-color="surface" style="min-width:180px;" @update:model-value="load" />
      <q-select v-model="filterBase" :options="basesList" label="Base"
        outlined dense clearable bg-color="surface" style="min-width:140px;" />
      <q-select v-model="filterProcesso" :options="processosList" label="Processo"
        outlined dense clearable bg-color="surface" style="min-width:130px;" />
      <q-select v-model="filterSupervisor" :options="supervisoresList" label="Supervisor"
        outlined dense clearable bg-color="surface" style="min-width:180px;" />
      <q-select v-model="filterCoordenador" :options="coordenadoresList" label="Coordenador"
        outlined dense clearable bg-color="surface" style="min-width:160px;" />
      <q-select v-model="filterGerencia" :options="gerentesList" label="Gerência"
        outlined dense clearable bg-color="surface" style="min-width:160px;" />
      <q-input v-model="search" outlined dense placeholder="Buscar prefixo ou equipe..."
        clearable bg-color="surface" style="min-width:200px;">
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
          <div class="kpi-label">Iniciaram turno</div>
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
              <q-icon name="login" size="12px" /> {{ gerGroup.emTurno + gerGroup.encerrado }} iniciaram
            </span>
            <span class="mini-stat mini-stat--red q-ml-sm">
              <q-icon name="block" size="12px" /> {{ gerGroup.semTurno }} não iniciaram
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

    <!-- ── Dialog: Compartilhar no WhatsApp ─────────────── -->
    <q-dialog v-model="showShare" persistent>
      <q-card style="min-width:480px; max-width:560px; border-radius:18px;">
        <q-card-section class="q-pb-sm">
          <div class="text-h6 text-weight-bold flex items-center q-gutter-sm">
            <q-icon name="share" color="primary" />
            <span>Compartilhar no WhatsApp</span>
          </div>
          <div class="text-caption text-grey-5 q-mt-xs">
            Gera uma imagem pronta para enviar no WhatsApp
          </div>
        </q-card-section>
        <q-separator />

        <q-card-section>
          <!-- Agrupar por -->
          <div class="text-caption text-grey-5 q-mb-sm text-weight-bold" style="letter-spacing:.06em; text-transform:uppercase;">Agrupar por</div>
          <div class="share-group-btns q-mb-lg">
            <button
              v-for="opt in shareGroupOpts" :key="opt.value"
              class="share-group-btn"
              :class="{ 'share-group-btn--active': shareGroupBy === opt.value }"
              @click="shareGroupBy = opt.value"
            >
              <q-icon :name="opt.icon" size="18px" class="q-mr-xs" />
              {{ opt.label }}
            </button>
          </div>

          <!-- Preview do card -->
          <div class="share-preview" ref="sharePreviewRef">
            <div class="sp-header">
              <div class="sp-brand">
                <span class="sp-logo">SIDI-E</span>
                <span class="sp-company">CGB ENERGIA</span>
              </div>
              <div class="sp-date">{{ formatDateBR(filterDate || todayStr()) }}</div>
            </div>

            <div class="sp-title">CONTROLE DE TURNOS</div>
            <div class="sp-context">
              <span v-if="filterBase">Base: {{ filterBase }}</span>
              <span v-if="filterBase && filterProcesso"> · </span>
              <span v-if="filterProcesso">Processo: {{ filterProcesso }}</span>
              <span v-if="!filterBase && !filterProcesso">Todas as equipes</span>
            </div>

            <!-- Stats globais -->
            <div class="sp-stats">
              <div class="sp-stat">
                <div class="sp-stat__val">{{ totalEquipes }}</div>
                <div class="sp-stat__lbl">Total</div>
              </div>
              <div class="sp-stat sp-stat--green">
                <div class="sp-stat__val">{{ countAbriu }}</div>
                <div class="sp-stat__lbl">Abriram</div>
              </div>
              <div class="sp-stat sp-stat--red">
                <div class="sp-stat__val">{{ countSemTurno }}</div>
                <div class="sp-stat__lbl">Não Abriram</div>
              </div>
            </div>

            <!-- Barra de progresso -->
            <div class="sp-progress-wrap">
              <div class="sp-progress-bar">
                <div class="sp-progress-fill" :style="`width:${totalEquipes ? Math.round(countAbriu / totalEquipes * 100) : 0}%`" />
              </div>
              <span class="sp-progress-pct">{{ totalEquipes ? Math.round(countAbriu / totalEquipes * 100) : 0 }}% abriram turno</span>
            </div>

            <!-- Grupos -->
            <div class="sp-groups">
              <div v-for="grp in shareGroups" :key="grp.label" class="sp-group">
                <div class="sp-group__header">
                  <span class="sp-group__name">{{ grp.label }}</span>
                  <div class="sp-group__stats">
                    <span class="sp-gs--green">✓ {{ grp.abriu }}</span>
                    <span class="sp-gs--red">✗ {{ grp.nao }}</span>
                  </div>
                </div>
                <div v-for="t in grp.teams.slice(0, 12)" :key="t.id" class="sp-team">
                  <span class="sp-team__dot" :class="`sp-dot--${t.status === 'sem_turno' ? 'red' : 'green'}`" />
                  <span class="sp-team__prefix">{{ t.prefixo }}</span>
                  <span class="sp-team__status">{{ t.status === 'sem_turno' ? 'Não abriu' : t.status === 'em_turno' ? 'Em campo' : 'Encerrado' }}</span>
                </div>
                <div v-if="grp.teams.length > 12" class="sp-team sp-team--more">
                  + {{ grp.teams.length - 12 }} equipes
                </div>
              </div>
            </div>

            <div class="sp-footer">Gerado por SIDI-E · CGB ENERGIA</div>
          </div>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md q-gutter-sm">
          <q-btn flat label="Fechar" v-close-popup />
          <q-btn outline color="teal" icon="donut_large" label="Gráfico por Processo"
            :loading="generating" @click="downloadDonutChart" />
          <q-btn unelevated color="primary" icon="download" label="Baixar Imagem"
            :loading="generating" @click="downloadImage" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTeamsStore } from 'src/stores/teams'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'

const teamsStore = useTeamsStore()
const $q = useQuasar()

const loading        = ref(false)
const activeSessions = ref([])
const servicesDay    = ref([])
const filterDate     = ref(todayStr())
const filterBase         = ref(null)
const filterProcesso     = ref(null)
const filterSupervisor   = ref(null)
const filterCoordenador  = ref(null)
const filterGerencia     = ref(null)
const search         = ref('')
const statusFilter   = ref(null)

// ── Compartilhar ──────────────────────────────────────
const showShare      = ref(false)
const shareGroupBy   = ref('coordenador')
const generating     = ref(false)
const sharePreviewRef = ref(null)

const shareGroupOpts = [
  { value: 'coordenador', label: 'Coordenador', icon: 'person_pin' },
  { value: 'base',        label: 'Base',         icon: 'location_on' },
  { value: 'processo',    label: 'Processo',     icon: 'category' }
]

let refreshInterval = null

function todayStr () {
  return new Date().toISOString().split('T')[0]
}

function formatDateBR (iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const isToday = computed(() => filterDate.value === todayStr() || !filterDate.value)

// ── Listas de filtros ─────────────────────────────────
const basesList = computed(() => {
  const s = new Set(teamsStore.teams.map(t => t.base).filter(Boolean))
  return [...s].sort()
})
const processosList = ['GERE', 'GOMAN', 'GSTC']

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
  return s === 'sem_turno' ? 'Sem Turno' : 'Iniciou Turno'
}
function statusColor (s) {
  return s === 'sem_turno' ? 'negative' : 'positive'
}
function statusIcon (s) {
  return s === 'sem_turno' ? 'block' : 'login'
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
    if (statusFilter.value === 'sem_turno' && t.status !== 'sem_turno') return false
    if (filterBase.value && t.base !== filterBase.value) return false
    if (filterProcesso.value && t.processo !== filterProcesso.value) return false
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

// ── Compartilhar: agrupamento para preview ─────────────
const shareGroups = computed(() => {
  const key = shareGroupBy.value // 'coordenador' | 'base' | 'processo'
  const map = {}
  for (const t of filteredTeams.value) {
    const grpKey = t[key] || `Sem ${key}`
    if (!map[grpKey]) map[grpKey] = { label: grpKey, teams: [], abriu: 0, nao: 0 }
    map[grpKey].teams.push(t)
    if (t.status !== 'sem_turno') map[grpKey].abriu++
    else map[grpKey].nao++
  }
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label))
})

async function downloadImage () {
  generating.value = true
  try {
    const groups = shareGroups.value
    const date   = formatDateBR(filterDate.value || todayStr())
    const W      = 1080
    const PAD    = 32
    const SEC_H  = 52
    const ROW_H  = 38

    for (let gi = 0; gi < groups.length; gi++) {
      const grp         = groups[gi]
      const abriramTeams = grp.teams.filter(t => t.status !== 'sem_turno')
      const naoTeams     = grp.teams.filter(t => t.status === 'sem_turno')

      // Calculate canvas height dynamically
      const statsH   = 90
      const secRows  = (n) => SEC_H + (n > 0 ? n * ROW_H : ROW_H) + 16
      const H = 240 + statsH + 16 + secRows(abriramTeams.length) + secRows(naoTeams.length) + 60

      const canvas = document.createElement('canvas')
      canvas.width  = W
      canvas.height = H
      const ctx = canvas.getContext('2d')

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#0f172a')
      bg.addColorStop(1, '#111827')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Header bar
      ctx.fillStyle = '#1e293b'
      roundRect(ctx, PAD, 28, W - PAD * 2, 68, 14)
      ctx.fill()
      ctx.font = 'bold 22px Arial'
      ctx.fillStyle = '#f97316'
      ctx.fillText('SIDI-E', PAD + 28, 72)
      ctx.font = 'bold 16px Arial'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('CGB ENERGIA', PAD + 96, 72)
      ctx.font = '14px Arial'
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'right'
      ctx.fillText(date, W - PAD - 28, 72)
      ctx.textAlign = 'left'

      // Title
      ctx.font = 'bold 30px Arial'
      ctx.fillStyle = '#f1f5f9'
      ctx.textAlign = 'center'
      ctx.fillText('CONTROLE DE TURNOS', W / 2, 138)

      // Group label
      ctx.font = 'bold 20px Arial'
      ctx.fillStyle = '#f97316'
      ctx.fillText(grp.label, W / 2, 165)
      ctx.textAlign = 'left'

      // Stats row
      const statsY = 184
      const statW  = 210
      const statX  = [W / 2 - statW * 1.5, W / 2 - statW / 2, W / 2 + statW / 2]
      ;[['#94a3b8', grp.teams.length, 'Total'],
        ['#22c55e', grp.abriu, 'Abriram Turno'],
        ['#ef4444', grp.nao,   'Não Abriram']
      ].forEach(([color, val, lbl], i) => {
        ctx.fillStyle = '#1e293b'
        roundRect(ctx, statX[i], statsY, statW - 10, 68, 10)
        ctx.fill()
        ctx.font = 'bold 34px Arial'
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.fillText(val, statX[i] + (statW - 10) / 2, statsY + 40)
        ctx.font = '12px Arial'
        ctx.fillStyle = '#64748b'
        ctx.fillText(lbl, statX[i] + (statW - 10) / 2, statsY + 58)
      })
      ctx.textAlign = 'left'

      let y = statsY + statsH + 16

      // Section drawer (modifies y via closure)
      const drawSection = (title, teams, accentColor, accentBg) => {
        // Section header
        ctx.fillStyle = accentBg
        roundRect(ctx, PAD, y, W - PAD * 2, SEC_H, 12)
        ctx.fill()
        ctx.font = 'bold 17px Arial'
        ctx.fillStyle = accentColor
        ctx.fillText(title, PAD + 20, y + SEC_H / 2 + 7)
        y += SEC_H + 6

        if (teams.length === 0) {
          ctx.font = '14px Arial'
          ctx.fillStyle = '#475569'
          ctx.textAlign = 'center'
          ctx.fillText('Nenhuma equipe', W / 2, y + 20)
          ctx.textAlign = 'left'
          y += ROW_H
        } else {
          for (const t of teams) {
            const opened = t.status !== 'sem_turno'
            ctx.fillStyle = opened ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.06)'
            roundRect(ctx, PAD + 8, y, W - PAD * 2 - 16, ROW_H - 4, 8)
            ctx.fill()

            ctx.beginPath()
            ctx.arc(PAD + 30, y + (ROW_H - 4) / 2, 5, 0, Math.PI * 2)
            ctx.fillStyle = opened ? '#22c55e' : '#ef4444'
            ctx.fill()

            ctx.font = 'bold 13px Arial'
            ctx.fillStyle = '#e2e8f0'
            ctx.fillText(t.prefixo || '', PAD + 46, y + 25)

            // Truncate name to fit
            const maxW = W - PAD * 2 - 180
            ctx.font = '12px Arial'
            ctx.fillStyle = '#94a3b8'
            let nome = t.nome || ''
            while (nome.length > 0 && ctx.measureText(nome).width > maxW) {
              nome = nome.slice(0, -1)
            }
            if (nome !== (t.nome || '')) nome += '…'
            ctx.fillText(nome, PAD + 160, y + 25)

            const lbl = opened ? (t.status === 'em_turno' ? 'Em Campo' : 'Encerrado') : 'Não Abriu'
            ctx.font = 'bold 12px Arial'
            ctx.fillStyle = opened ? '#22c55e' : '#ef4444'
            ctx.textAlign = 'right'
            ctx.fillText(lbl, W - PAD - 20, y + 25)
            ctx.textAlign = 'left'
            y += ROW_H
          }
        }
        y += 16
      }

      drawSection(
        `✓  ABRIRAM TURNO  (${abriramTeams.length})`,
        abriramTeams, '#22c55e', 'rgba(34,197,94,0.13)'
      )
      drawSection(
        `✗  NÃO ABRIRAM  (${naoTeams.length})`,
        naoTeams, '#ef4444', 'rgba(239,68,68,0.11)'
      )

      // Footer
      ctx.fillStyle = '#334155'
      ctx.fillRect(PAD, H - 46, W - PAD * 2, 1)
      ctx.font = '13px Arial'
      ctx.fillStyle = '#475569'
      ctx.textAlign = 'center'
      ctx.fillText('Gerado por SIDI-E · CGB ENERGIA', W / 2, H - 16)
      ctx.textAlign = 'left'

      // Download this group's image
      const safeLabel = grp.label.replace(/[^a-zA-Z0-9_-]/g, '_')
      const link = document.createElement('a')
      link.download = `turnos-${filterDate.value || todayStr()}-${shareGroupBy.value}-${safeLabel}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      if (gi < groups.length - 1) {
        await new Promise(res => setTimeout(res, 400))
      }
    }

    $q.notify({ type: 'positive', message: `${groups.length} imagem(ns) gerada(s) com sucesso!` })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao gerar imagem: ' + e.message })
  } finally {
    generating.value = false
  }
}

async function downloadDonutChart () {
  generating.value = true
  try {
    const date = formatDateBR(filterDate.value || todayStr())
    const W    = 1080
    const PAD  = 40

    // Compute status for ALL teams regardless of current filters
    const sessionSet  = new Set(activeSessions.value.map(s => s.team_id))
    const activitySet = new Set(servicesDay.value.map(s => s.team_id))

    const PROCESSOS = ['GERE', 'GOMAN', 'GSTC']
    const procData = PROCESSOS.map(proc => {
      const ts   = teamsStore.teams.filter(t => t.processo === proc)
      const abriu = ts.filter(t => sessionSet.has(t.id) || activitySet.has(t.id)).length
      const nao   = ts.length - abriu
      const pct   = ts.length ? Math.round(abriu / ts.length * 100) : 0
      return { label: proc, total: ts.length, abriu, nao, pct }
    })

    const DONUT_R  = 110   // outer radius
    const RING_W   = 28    // stroke width
    const BLOCK_H  = 400   // height per process block
    const H = 220 + PROCESSOS.length * BLOCK_H + 60

    const canvas = document.createElement('canvas')
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0f172a')
    bg.addColorStop(1, '#111827')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Header bar
    ctx.fillStyle = '#1e293b'
    roundRect(ctx, PAD, 28, W - PAD * 2, 68, 14)
    ctx.fill()
    ctx.font = 'bold 22px Arial'
    ctx.fillStyle = '#f97316'
    ctx.fillText('SIDI-E', PAD + 28, 72)
    ctx.font = 'bold 16px Arial'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('CGB ENERGIA', PAD + 96, 72)
    ctx.font = '14px Arial'
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'right'
    ctx.fillText(date, W - PAD - 28, 72)
    ctx.textAlign = 'left'

    // Title
    ctx.font = 'bold 30px Arial'
    ctx.fillStyle = '#f1f5f9'
    ctx.textAlign = 'center'
    ctx.fillText('CONTROLE DE TURNOS', W / 2, 138)
    ctx.font = '16px Arial'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('Visão por Processo', W / 2, 164)
    ctx.textAlign = 'left'

    let blockY = 204

    for (let pi = 0; pi < procData.length; pi++) {
      const p  = procData[pi]
      const cx = W / 2
      const cy = blockY + 38 + DONUT_R

      // Process label
      ctx.font = 'bold 26px Arial'
      ctx.fillStyle = '#f97316'
      ctx.textAlign = 'center'
      ctx.fillText(p.label, cx, blockY + 28)
      ctx.textAlign = 'left'

      // Background ring
      ctx.beginPath()
      ctx.arc(cx, cy, DONUT_R - RING_W / 2, 0, Math.PI * 2)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = RING_W
      ctx.lineCap = 'butt'
      ctx.stroke()

      // Red track (not opened)
      ctx.beginPath()
      ctx.arc(cx, cy, DONUT_R - RING_W / 2, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(239,68,68,0.22)'
      ctx.lineWidth = RING_W
      ctx.lineCap = 'butt'
      ctx.stroke()

      // Green arc (opened)
      if (p.abriu > 0 && p.total > 0) {
        const endAngle = -Math.PI / 2 + 2 * Math.PI * (p.abriu / p.total)
        ctx.beginPath()
        ctx.arc(cx, cy, DONUT_R - RING_W / 2, -Math.PI / 2, endAngle)
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = RING_W
        ctx.lineCap = 'round'
        ctx.shadowColor = '#22c55e'
        ctx.shadowBlur = 18
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Center text: percentage
      ctx.textAlign = 'center'
      ctx.font = `bold 54px Arial`
      ctx.fillStyle = '#f1f5f9'
      ctx.fillText(`${p.pct}%`, cx, cy + 16)
      ctx.font = '14px Arial'
      ctx.fillStyle = '#64748b'
      ctx.fillText('abriram turno', cx, cy + 36)
      ctx.textAlign = 'left'

      // Stat cards row below donut
      const cardsY = cy + DONUT_R + 22
      const cardW  = (W - PAD * 2 - 24) / 3
      ;[
        { val: p.total, lbl: 'Total de Equipes', color: '#94a3b8' },
        { val: p.abriu, lbl: 'Abriram Turno',    color: '#22c55e' },
        { val: p.nao,   lbl: 'Não Abriram',       color: '#ef4444' }
      ].forEach((s, i) => {
        const cx2 = PAD + i * (cardW + 12)
        ctx.fillStyle = '#1e293b'
        roundRect(ctx, cx2, cardsY, cardW, 74, 12)
        ctx.fill()
        ctx.font = 'bold 36px Arial'
        ctx.fillStyle = s.color
        ctx.textAlign = 'center'
        ctx.fillText(s.val, cx2 + cardW / 2, cardsY + 44)
        ctx.font = '12px Arial'
        ctx.fillStyle = '#64748b'
        ctx.fillText(s.lbl, cx2 + cardW / 2, cardsY + 62)
        ctx.textAlign = 'left'
      })

      // Separator (not after last)
      if (pi < procData.length - 1) {
        const sepY = cardsY + 74 + 20
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(PAD, sepY, W - PAD * 2, 1)
      }

      blockY += BLOCK_H
    }

    // Footer
    ctx.fillStyle = '#334155'
    ctx.fillRect(PAD, H - 46, W - PAD * 2, 1)
    ctx.font = '13px Arial'
    ctx.fillStyle = '#475569'
    ctx.textAlign = 'center'
    ctx.fillText('Gerado por SIDI-E · CGB ENERGIA', W / 2, H - 16)
    ctx.textAlign = 'left'

    const link = document.createElement('a')
    link.download = `turnos-${filterDate.value || todayStr()}-grafico-processos.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    $q.notify({ type: 'positive', message: 'Gráfico gerado com sucesso!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao gerar gráfico: ' + e.message })
  } finally {
    generating.value = false
  }
}

function roundRect (ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

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
  max-width: 1400px;
  margin: 0 auto;
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

/* ── Share dialog ───────────────────────────────────── */
.share-group-btns {
  display: flex;
  gap: 8px;
}
.share-group-btn {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-fg);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.share-group-btn--active {
  background: var(--primary);
  color: var(--primary-fg);
  border-color: var(--primary);
}

/* Preview card */
.share-preview {
  background: #0f172a;
  border-radius: 14px;
  padding: 20px;
  font-family: Arial, sans-serif;
  max-height: 480px;
  overflow-y: auto;
}
.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1e293b;
  border-radius: 10px;
  padding: 10px 16px;
  margin-bottom: 14px;
}
.sp-brand { display: flex; align-items: center; gap: 8px; }
.sp-logo  { font-weight: 900; font-size: 0.9rem; color: #f97316; }
.sp-company { font-size: 0.75rem; color: #64748b; font-weight: 700; }
.sp-date { font-size: 0.75rem; color: #64748b; }

.sp-title {
  text-align: center;
  font-size: 1.1rem;
  font-weight: 900;
  color: #f1f5f9;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}
.sp-context {
  text-align: center;
  font-size: 0.72rem;
  color: #94a3b8;
  margin-bottom: 14px;
}

.sp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.sp-stat {
  background: #1e293b;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}
.sp-stat__val { font-size: 1.6rem; font-weight: 900; color: #94a3b8; line-height: 1; }
.sp-stat__lbl { font-size: 0.65rem; color: #475569; margin-top: 4px; text-transform: uppercase; letter-spacing: .05em; }
.sp-stat--green .sp-stat__val { color: #22c55e; }
.sp-stat--red   .sp-stat__val { color: #ef4444; }

.sp-progress-wrap { margin-bottom: 14px; }
.sp-progress-bar {
  height: 10px;
  background: #1e293b;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 4px;
}
.sp-progress-fill { height: 100%; background: linear-gradient(90deg,#22c55e,#16a34a); border-radius: 6px; transition: width .3s; }
.sp-progress-pct { font-size: 0.7rem; color: #64748b; }

.sp-groups { display: flex; flex-direction: column; gap: 10px; }
.sp-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1e293b;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 4px;
}
.sp-group__name { font-size: 0.8rem; font-weight: 700; color: #e2e8f0; }
.sp-group__stats { display: flex; gap: 10px; font-size: 0.72rem; font-weight: 700; }
.sp-gs--green { color: #22c55e; }
.sp-gs--red   { color: #ef4444; }

.sp-team {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
}
.sp-team__dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sp-dot--green { background: #22c55e; }
.sp-dot--red   { background: #ef4444; }
.sp-team__prefix { font-weight: 700; color: #e2e8f0; min-width: 110px; }
.sp-team__status { color: #64748b; margin-left: auto; }
.sp-team--more { color: #475569; font-style: italic; }

.sp-footer {
  text-align: center;
  font-size: 0.65rem;
  color: #334155;
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid #1e293b;
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
