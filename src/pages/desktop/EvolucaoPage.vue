<template>
  <q-page class="evo">

    <!-- ── Cabeçalho ───────────────────────────────────────── -->
    <header class="evo-head">
      <div>
        <div class="evo-eyebrow">Acompanhamento das equipes</div>
        <h1 class="evo-title">Evolução</h1>
        <div class="evo-sub">
          {{ periodLabel }} · {{ scopeTeams.length }} equipe{{ scopeTeams.length === 1 ? '' : 's' }} no filtro
        </div>
      </div>
      <div class="evo-live">
        <span v-if="isLive" class="live-chip"><span class="live-dot" />Ao vivo</span>
        <span class="evo-upd">Atualizado às {{ updatedLabel }}</span>
        <button class="evo-refresh" :disabled="loading" title="Atualizar agora" @click="load()">
          <q-icon name="refresh" size="18px" :class="{ spin: loading }" />
        </button>
      </div>
    </header>

    <!-- ── Filtros ─────────────────────────────────────────── -->
    <section class="evo-filters">
      <div class="seg" role="tablist" aria-label="Período">
        <button
          v-for="p in PRESETS"
          :key="p.v"
          class="seg-btn"
          :class="{ 'seg-btn--on': preset === p.v }"
          @click="applyPreset(p.v)"
        >{{ p.label }}</button>
      </div>

      <div v-if="preset === 'custom'" class="evo-dates">
        <input v-model="dateFrom" type="date" class="date-input" :max="dateTo" @change="onCustomDate" />
        <span class="date-sep">→</span>
        <input v-model="dateTo" type="date" class="date-input" :min="dateFrom" :max="hoje" @change="onCustomDate" />
      </div>

      <q-select
        v-for="f in FIELDS"
        :key="f.key"
        v-model="filters[f.key]"
        :options="options[f.key]"
        :label="f.label"
        outlined dense clearable options-dense
        class="evo-select"
        style="background: transparent;"
      />

      <button v-if="hasFilters" class="evo-clear" @click="clearAll">
        <q-icon name="filter_alt_off" size="16px" /> Limpar filtros
      </button>
    </section>

    <!-- ── KPIs ────────────────────────────────────────────── -->
    <section class="kpis">
      <div
        v-for="(k, i) in kpis"
        :key="k.label"
        class="kpi"
        :style="{ '--accent': k.accent, '--i': i }"
      >
        <div class="kpi-top">
          <span class="kpi-label">{{ k.label }}</span>
          <q-icon :name="k.icon" size="20px" class="kpi-icon" />
        </div>
        <div class="kpi-value">
          <AnimatedNumber :value="k.value" :decimals="k.decimals || 0" :suffix="k.suffix || ''" />
        </div>
        <div class="kpi-sub" :class="k.tone ? `kpi-sub--${k.tone}` : ''">
          <q-icon v-if="k.subIcon" :name="k.subIcon" size="14px" />
          {{ k.sub }}
        </div>
      </div>
    </section>

    <div v-if="!teamsStore.loading && !scopeTeams.length" class="evo-empty">
      <q-icon name="search_off" size="38px" />
      <div>Nenhuma equipe corresponde aos filtros selecionados.</div>
      <button class="evo-clear" @click="clearAll">Limpar filtros</button>
    </div>

    <div v-else class="grid" :class="{ 'grid--loading': loading }">

      <!-- Evolução diária -->
      <section class="panel span-8" :style="{ '--i': 0 }">
        <div class="panel-head">
          <div>
            <h2>Evolução diária</h2>
            <p>{{ focusTeam ? `Equipe ${focusTeam.prefixo}` : 'Todas as equipes do filtro' }}</p>
          </div>
          <button v-if="focusTeam" class="chip" @click="focusTeamId = null">
            {{ focusTeam.prefixo }} <q-icon name="close" size="14px" />
          </button>
        </div>
        <EvoTrendChart :labels="days" :series="trendSeries" :height="300" />
      </section>

      <!-- Processo -->
      <section class="panel span-4" :style="{ '--i': 1 }">
        <div class="panel-head">
          <div><h2>Por processo</h2><p>Clique para filtrar</p></div>
        </div>
        <EvoDonut
          :segments="processoSegments"
          :selected-key="filters.processo"
          center-label="Serviços"
          @select="k => toggleFilter('processo', k)"
        />
      </section>

      <!-- Ranking de equipes -->
      <section class="panel span-6" :style="{ '--i': 2 }">
        <div class="panel-head">
          <div><h2>Ranking de equipes</h2><p>Top 10 em serviços · clique para detalhar</p></div>
        </div>
        <EvoRankBars
          :items="rankingItems"
          :selected-key="focusTeam ? focusTeam.id : null"
          empty-text="Nenhum serviço no período"
          @select="k => (focusTeamId = focusTeamId === k ? null : k)"
        />
      </section>

      <!-- Distribuição -->
      <section class="panel span-6" :style="{ '--i': 3 }">
        <div class="panel-head">
          <div><h2>Distribuição</h2><p>Serviços por {{ breakdownLabel }}</p></div>
          <div class="seg seg--sm">
            <button
              v-for="b in BREAKDOWNS"
              :key="b.key"
              class="seg-btn"
              :class="{ 'seg-btn--on': breakdownDim === b.key }"
              @click="breakdownDim = b.key"
            >{{ b.label }}</button>
          </div>
        </div>
        <EvoRankBars
          :items="breakdownItems"
          :selected-key="filters[breakdownDim]"
          empty-text="Nenhum serviço no período"
          @select="k => toggleFilter(breakdownDim, k)"
        />
      </section>

      <!-- Mapa de calor -->
      <section class="panel span-12" :style="{ '--i': 4 }">
        <div class="panel-head">
          <div>
            <h2>Constância por equipe</h2>
            <p>Serviços por dia · quanto mais forte a cor, mais serviços</p>
          </div>
          <button v-if="heatRowsAll.length > HEAT_LIMIT" class="chip chip--ghost" @click="showAllHeat = !showAllHeat">
            {{ showAllHeat ? 'Mostrar menos' : `Ver todas (${heatRowsAll.length})` }}
          </button>
        </div>
        <EvoHeatmap
          :key="`${days.length}-${heatRows.length}`"
          :days="days"
          :rows="heatRows"
          :today="hoje"
          :selected-key="focusTeam ? focusTeam.id : null"
          @select="k => (focusTeamId = focusTeamId === k ? null : k)"
        />
      </section>

      <!-- Validação -->
      <section class="panel span-6" :style="{ '--i': 5 }">
        <div class="panel-head">
          <div><h2>Validação por dia</h2><p>Aprovados, reprovados e pendentes</p></div>
        </div>
        <EvoStackedBars :labels="days" :stacks="validationStacks" :height="220" />
      </section>

      <!-- Atividades -->
      <section class="panel span-6" :style="{ '--i': 6 }">
        <div class="panel-head">
          <div><h2>Atividades mais realizadas</h2><p>Top 8 no período</p></div>
        </div>
        <EvoRankBars :items="activityItems" :selectable="false" empty-text="Nenhum serviço no período" />
      </section>

      <!-- Sem produção -->
      <section v-if="idleTeams.length" class="panel span-12 panel--warn" :style="{ '--i': 7 }">
        <div class="panel-head">
          <div>
            <h2>Sem serviços no período</h2>
            <p>{{ idleTeams.length }} equipe{{ idleTeams.length === 1 ? '' : 's' }} sem nenhum registro</p>
          </div>
        </div>
        <div class="idle">
          <span v-for="t in idleTeams.slice(0, 40)" :key="t.id" class="idle-chip" :title="t.nome">
            {{ t.prefixo }}
          </span>
          <span v-if="idleTeams.length > 40" class="idle-more">+{{ idleTeams.length - 40 }}</span>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { supabase } from 'src/services/supabase'
import { useTeamsStore } from 'src/stores/teams'
import {
  hojeBrasilia, diaBrasilia, inicioDiaBrasilia, fimDiaBrasilia, addDiasYmd, diasEntre
} from 'src/services/dateBR'
import AnimatedNumber from 'src/components/desktop/evolucao/AnimatedNumber.vue'
import EvoTrendChart from 'src/components/desktop/evolucao/EvoTrendChart.vue'
import EvoDonut from 'src/components/desktop/evolucao/EvoDonut.vue'
import EvoRankBars from 'src/components/desktop/evolucao/EvoRankBars.vue'
import EvoHeatmap from 'src/components/desktop/evolucao/EvoHeatmap.vue'
import EvoStackedBars from 'src/components/desktop/evolucao/EvoStackedBars.vue'

const $q = useQuasar()
const teamsStore = useTeamsStore()

const PRESETS = [
  { v: '7', label: '7 dias' },
  { v: '14', label: '14 dias' },
  { v: '30', label: '30 dias' },
  { v: 'mes', label: 'Mês atual' },
  { v: 'custom', label: 'Personalizado' }
]
const FIELDS = [
  { key: 'processo', label: 'Processo' },
  { key: 'gerencia', label: 'Gerência' },
  { key: 'base', label: 'Base' },
  { key: 'supervisor', label: 'Supervisor' }
]
const BREAKDOWNS = [
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'gerencia', label: 'Gerência' },
  { key: 'base', label: 'Base' }
]
const PROCESSO_COLORS = { GSTC: '#3b82f6', GOMAN: '#f59e0b', GERE: '#10b981' }
const MAX_DAYS = 120
const HEAT_LIMIT = 18

const hoje = hojeBrasilia()
const preset = ref('14')
const dateFrom = ref(addDiasYmd(hoje, -13))
const dateTo = ref(hoje)
const filters = reactive({ processo: null, gerencia: null, base: null, supervisor: null })
const focusTeamId = ref(null)
const breakdownDim = ref('supervisor')
const showAllHeat = ref(false)

const rows = ref([])
const loading = ref(false)
const updatedAt = ref(null)
let reqId = 0
let timer = null

const days = computed(() => diasEntre(dateFrom.value, dateTo.value))
const isLive = computed(() => dateTo.value >= hoje)
const hasFilters = computed(() => FIELDS.some(f => filters[f.key]) || !!focusTeam.value)
const breakdownLabel = computed(() => BREAKDOWNS.find(b => b.key === breakdownDim.value)?.label.toLowerCase())

function fmt (ymd) { return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}` }
const periodLabel = computed(() => `${fmt(dateFrom.value)} a ${fmt(dateTo.value)}`)
const updatedLabel = computed(() =>
  updatedAt.value
    ? updatedAt.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--'
)

// ── Períodos ──────────────────────────────────────────────
function applyPreset (p) {
  preset.value = p
  if (p === 'custom') return
  dateTo.value = hoje
  dateFrom.value = p === 'mes' ? hoje.slice(0, 8) + '01' : addDiasYmd(hoje, -(Number(p) - 1))
  load()
}

function onCustomDate () {
  if (!dateFrom.value || !dateTo.value) return
  if (dateFrom.value > dateTo.value) dateFrom.value = dateTo.value
  if (dateTo.value > hoje) dateTo.value = hoje
  const min = addDiasYmd(dateTo.value, -(MAX_DAYS - 1))
  if (dateFrom.value < min) dateFrom.value = min
  load()
}

// ── Carga ─────────────────────────────────────────────────
async function load (silent = false) {
  const my = ++reqId
  if (!silent) loading.value = true
  try {
    const n = days.value.length || 1
    const start = inicioDiaBrasilia(addDiasYmd(dateFrom.value, -n))
    const end = fimDiaBrasilia(dateTo.value)
    const PAGE = 1000
    const all = []
    for (let off = 0; ; off += PAGE) {
      const { data, error } = await supabase
        .from('services')
        .select('id, team_id, created_at, activity_name, validation_status')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at').order('id')
        .range(off, off + PAGE - 1)
      if (error) throw error
      all.push(...(data || []))
      if (!data || data.length < PAGE) break
    }
    if (my !== reqId) return
    rows.value = all.map(s => ({ ...s, day: diaBrasilia(s.created_at) }))
    updatedAt.value = new Date()
  } catch (e) {
    if (my === reqId) $q.notify({ type: 'negative', message: 'Erro ao carregar a evolução: ' + e.message })
  } finally {
    if (my === reqId) loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([teamsStore.fetchTeams(), load()])
  timer = setInterval(() => {
    if (isLive.value && document.visibilityState === 'visible') load(true)
  }, 60000)
})
onBeforeUnmount(() => clearInterval(timer))

// ── Equipes e filtros ─────────────────────────────────────
const activeTeams = computed(() =>
  teamsStore.teams.filter(t => String(t.status || 'ativo').toLowerCase() !== 'inativo')
)

function matching (except) {
  return activeTeams.value.filter(t =>
    FIELDS.every(f => f.key === except || !filters[f.key] || t[f.key] === filters[f.key])
  )
}

const options = computed(() =>
  Object.fromEntries(FIELDS.map(f => {
    const set = new Set(matching(f.key).map(t => t[f.key]).filter(Boolean))
    if (filters[f.key]) set.add(filters[f.key])
    return [f.key, [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))]
  }))
)

const scopeTeams = computed(() => matching(null))
const scopeIds = computed(() => new Set(scopeTeams.value.map(t => t.id)))
const teamById = computed(() => new Map(teamsStore.teams.map(t => [t.id, t])))
const focusTeam = computed(() => scopeTeams.value.find(t => t.id === focusTeamId.value) || null)

function toggleFilter (key, value) {
  if (!value || value.startsWith('Sem ')) return
  filters[key] = filters[key] === value ? null : value
}
function clearAll () {
  for (const f of FIELDS) filters[f.key] = null
  focusTeamId.value = null
}

// ── Dados derivados ───────────────────────────────────────
const prevDays = computed(() => {
  const n = days.value.length
  return { from: addDiasYmd(dateFrom.value, -n), to: addDiasYmd(dateFrom.value, -1) }
})

const inPeriod = computed(() => rows.value.filter(r => r.day >= dateFrom.value && r.day <= dateTo.value))
const inPrev = computed(() => rows.value.filter(r => r.day >= prevDays.value.from && r.day <= prevDays.value.to))

const scopedNow = computed(() => inPeriod.value.filter(r => scopeIds.value.has(r.team_id)))
const focusedNow = computed(() =>
  focusTeam.value ? scopedNow.value.filter(r => r.team_id === focusTeam.value.id) : scopedNow.value
)
const focusedPrev = computed(() => {
  const list = inPrev.value.filter(r => scopeIds.value.has(r.team_id))
  return focusTeam.value ? list.filter(r => r.team_id === focusTeam.value.id) : list
})

function statusOf (s) {
  return s.validation_status === 'aprovada' || s.validation_status === 'reprovada'
    ? s.validation_status
    : 'pendente'
}

const perDay = computed(() => {
  const map = new Map(days.value.map(d => [d, { total: 0, teams: new Set(), aprovada: 0, reprovada: 0, pendente: 0 }]))
  for (const r of focusedNow.value) {
    const e = map.get(r.day)
    if (!e) continue
    e.total++
    e.teams.add(r.team_id)
    e[statusOf(r)]++
  }
  return days.value.map(d => map.get(d))
})

// ── KPIs ──────────────────────────────────────────────────
const kpis = computed(() => {
  const total = focusedNow.value.length
  const prev = focusedPrev.value.length
  const producing = new Set(focusedNow.value.map(r => r.team_id)).size
  const teamsTotal = focusTeam.value ? 1 : scopeTeams.value.length
  const elapsed = Math.max(1, days.value.filter(d => d <= hoje).length)
  let ap = 0, rep = 0, pen = 0
  for (const r of focusedNow.value) {
    const s = statusOf(r)
    if (s === 'aprovada') ap++
    else if (s === 'reprovada') rep++
    else pen++
  }
  const delta = prev ? Math.round(((total - prev) / prev) * 100) : null
  const adesao = teamsTotal ? Math.round((producing / teamsTotal) * 100) : 0
  const taxa = ap + rep ? Math.round((ap / (ap + rep)) * 100) : null

  return [
    {
      label: 'Serviços', value: total, icon: 'task_alt', accent: '#E8651E',
      sub: delta === null ? 'sem período anterior para comparar' : `${delta > 0 ? '+' : ''}${delta}% vs. período anterior`,
      subIcon: delta === null ? null : delta >= 0 ? 'trending_up' : 'trending_down',
      tone: delta === null ? '' : delta >= 0 ? 'up' : 'down'
    },
    {
      label: 'Equipes produzindo', value: producing, icon: 'groups', accent: '#06b6d4',
      sub: `de ${teamsTotal} equipe${teamsTotal === 1 ? '' : 's'} · ${adesao}% de adesão`
    },
    {
      label: 'Média por dia', value: total / elapsed, decimals: 1, icon: 'speed', accent: '#8b5cf6',
      sub: `${elapsed} dia${elapsed === 1 ? '' : 's'} no período`
    },
    {
      label: 'Taxa de aprovação', value: taxa ?? 0, suffix: '%', icon: 'verified', accent: '#22c55e',
      sub: taxa === null ? 'nenhum serviço analisado' : `${ap} aprovado${ap === 1 ? '' : 's'} · ${rep} reprovado${rep === 1 ? '' : 's'}`
    },
    {
      label: 'Pendentes de validação', value: pen, icon: 'hourglass_top', accent: '#f59e0b',
      sub: pen ? 'aguardando análise' : 'tudo analisado'
    }
  ]
})

// ── Evolução diária ───────────────────────────────────────
const trendSeries = computed(() => [
  { key: 'total', label: 'Serviços', color: '#E8651E', area: true, values: perDay.value.map(d => d.total) },
  { key: 'teams', label: 'Equipes com serviço', color: '#06b6d4', values: perDay.value.map(d => d.teams.size) },
  { key: 'ap', label: 'Aprovados', color: '#22c55e', hidden: true, values: perDay.value.map(d => d.aprovada) }
])

const validationStacks = computed(() => [
  { key: 'aprovada', label: 'Aprovados', color: '#22c55e', values: perDay.value.map(d => d.aprovada) },
  { key: 'reprovada', label: 'Reprovados', color: '#ef4444', values: perDay.value.map(d => d.reprovada) },
  { key: 'pendente', label: 'Pendentes', color: '#f59e0b', values: perDay.value.map(d => d.pendente) }
])

// ── Quebras (facetadas: ignoram o próprio filtro) ─────────
function facet (dim) {
  const ids = new Set(matching(dim).map(t => t.id))
  const map = new Map()
  for (const r of inPeriod.value) {
    if (!ids.has(r.team_id)) continue
    const t = teamById.value.get(r.team_id)
    const k = t?.[dim] || `Sem ${FIELDS.find(f => f.key === dim).label.toLowerCase()}`
    if (!map.has(k)) map.set(k, { key: k, value: 0, teams: new Set() })
    const e = map.get(k)
    e.value++
    e.teams.add(r.team_id)
  }
  return [...map.values()].sort((a, b) => b.value - a.value)
}

const processoSegments = computed(() =>
  facet('processo').map(e => ({
    key: e.key, label: e.key, value: e.value, color: PROCESSO_COLORS[e.key] || '#8b5cf6'
  }))
)

const breakdownItems = computed(() =>
  facet(breakdownDim.value).slice(0, 12).map(e => ({
    key: e.key,
    label: e.key,
    sub: `${e.teams.size} equipe${e.teams.size === 1 ? '' : 's'}`,
    value: e.value,
    color: '#06b6d4'
  }))
)

// ── Ranking, mapa de calor, ociosas ───────────────────────
const byTeam = computed(() => {
  const map = new Map()
  for (const r of scopedNow.value) {
    if (!map.has(r.team_id)) map.set(r.team_id, { total: 0, perDay: new Map() })
    const e = map.get(r.team_id)
    e.total++
    e.perDay.set(r.day, (e.perDay.get(r.day) || 0) + 1)
  }
  return map
})

const rankingItems = computed(() =>
  [...byTeam.value.entries()]
    .map(([id, e]) => ({ id, total: e.total, t: teamById.value.get(id) }))
    .filter(x => x.t)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(x => ({
      key: x.id,
      label: x.t.prefixo,
      sub: x.t.supervisor || x.t.nome || '',
      value: x.total,
      color: '#E8651E'
    }))
)

const heatRowsAll = computed(() =>
  [...byTeam.value.entries()]
    .map(([id, e]) => ({ id, e, t: teamById.value.get(id) }))
    .filter(x => x.t)
    .sort((a, b) => b.e.total - a.e.total)
    .map(x => ({
      key: x.id,
      label: x.t.prefixo,
      sub: x.t.supervisor || '',
      total: x.e.total,
      values: days.value.map(d => x.e.perDay.get(d) || 0)
    }))
)
const heatRows = computed(() => (showAllHeat.value ? heatRowsAll.value : heatRowsAll.value.slice(0, HEAT_LIMIT)))

const idleTeams = computed(() =>
  scopeTeams.value.filter(t => !byTeam.value.has(t.id)).sort((a, b) => a.prefixo.localeCompare(b.prefixo))
)

const activityItems = computed(() => {
  const map = new Map()
  for (const r of focusedNow.value) {
    const k = r.activity_name || 'Sem atividade'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ key: name, label: name, value, color: '#8b5cf6' }))
})
</script>

<style scoped>
.evo {
  padding: 24px 28px 48px;
  max-width: 1500px;
  margin: 0 auto;
  background:
    radial-gradient(ellipse 70% 30% at 15% 0%, color-mix(in oklab, var(--primary) 8%, transparent) 0%, transparent 65%),
    var(--background);
}

/* ── Cabeçalho ───────────────────────────────────────────── */
.evo-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.evo-eyebrow { font: 800 0.68rem 'Manrope', sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary); }
.evo-title { font: 700 1.9rem 'Sora', sans-serif; color: var(--fg); margin: 2px 0 2px; line-height: 1.15; }
.evo-sub { font: 500 0.84rem 'Manrope', sans-serif; color: var(--muted-fg); }
.evo-live { display: flex; align-items: center; gap: 12px; }
.live-chip {
  display: inline-flex; align-items: center; gap: 7px; padding: 4px 12px; border-radius: 999px;
  background: color-mix(in oklab, #22c55e 14%, transparent); color: #4ade80;
  border: 1px solid color-mix(in oklab, #22c55e 35%, transparent);
  font: 800 0.72rem 'Manrope', sans-serif; letter-spacing: 0.05em; text-transform: uppercase;
}
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: pulse 1.6s ease-in-out infinite; }
.evo-upd { font: 600 0.76rem 'Manrope', sans-serif; color: var(--muted-fg); font-variant-numeric: tabular-nums; }
.evo-refresh {
  width: 36px; height: 36px; border-radius: 10px; cursor: pointer; display: grid; place-items: center;
  background: var(--card); border: 1px solid var(--border); color: var(--fg); transition: background 0.15s;
}
.evo-refresh:hover:not(:disabled) { background: color-mix(in oklab, var(--primary) 14%, var(--card)); }
.spin { animation: spin 0.9s linear infinite; }

/* ── Filtros ─────────────────────────────────────────────── */
.evo-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 20px; }
.seg { display: inline-flex; padding: 3px; border-radius: 11px; background: var(--card); border: 1px solid var(--border); }
.seg-btn {
  padding: 7px 13px; border: 0; border-radius: 8px; background: transparent; cursor: pointer;
  color: var(--muted-fg); font: 700 0.78rem 'Manrope', sans-serif; transition: background 0.2s, color 0.2s;
}
.seg-btn:hover { color: var(--fg); }
.seg-btn--on { background: var(--primary); color: var(--primary-fg); box-shadow: var(--shadow-energy); }
.seg--sm .seg-btn { padding: 5px 10px; font-size: 0.72rem; }
.evo-dates { display: inline-flex; align-items: center; gap: 8px; }
.date-input {
  background: var(--card); color: var(--fg); border: 1px solid var(--border); border-radius: 8px;
  padding: 7px 10px; font: 600 0.8rem 'Manrope', sans-serif; color-scheme: dark;
}
.date-sep { color: var(--muted-fg); }
.evo-select { min-width: 150px; flex: 0 1 180px; }
.evo-clear {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 9px; cursor: pointer;
  background: color-mix(in oklab, var(--destructive) 10%, transparent); color: #fca5a5;
  border: 1px solid color-mix(in oklab, var(--destructive) 30%, transparent);
  font: 700 0.76rem 'Manrope', sans-serif;
}
.evo-clear:hover { background: color-mix(in oklab, var(--destructive) 18%, transparent); }

/* ── KPIs ────────────────────────────────────────────────── */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 18px; }
.kpi {
  position: relative; overflow: hidden; padding: 14px 16px 14px; border-radius: 14px;
  background: var(--card); border: 1px solid var(--border);
  animation: rise 0.55s cubic-bezier(0.22, 0.8, 0.3, 1) both; animation-delay: calc(var(--i) * 60ms);
  transition: transform 0.2s, border-color 0.2s;
}
.kpi::before {
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--accent);
  transform-origin: left; animation: grow 0.9s cubic-bezier(0.22, 0.8, 0.3, 1) both; animation-delay: calc(var(--i) * 60ms + 150ms);
}
.kpi:hover { transform: translateY(-2px); border-color: color-mix(in oklab, var(--accent) 55%, var(--border)); }
.kpi-top { display: flex; align-items: center; justify-content: space-between; }
.kpi-label { font: 700 0.7rem 'Manrope', sans-serif; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-fg); }
.kpi-icon { color: var(--accent); }
.kpi-value { font: 800 2.15rem 'Sora', sans-serif; color: var(--accent); line-height: 1.15; margin: 6px 0 4px; }
.kpi-sub { display: flex; align-items: center; gap: 5px; font: 600 0.74rem 'Manrope', sans-serif; color: var(--muted-fg); }
.kpi-sub--up { color: #4ade80; }
.kpi-sub--down { color: #f87171; }

/* ── Painéis ─────────────────────────────────────────────── */
.grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 14px; transition: opacity 0.25s; }
.grid--loading { opacity: 0.55; pointer-events: none; }
.panel {
  padding: 18px 20px 20px; border-radius: 16px; min-width: 0;
  background: var(--card); border: 1px solid var(--border);
  animation: rise 0.6s cubic-bezier(0.22, 0.8, 0.3, 1) both; animation-delay: calc(var(--i) * 70ms + 200ms);
}
.panel--warn { border-color: color-mix(in oklab, #f59e0b 40%, var(--border)); }
.span-12 { grid-column: span 12; }
.span-8 { grid-column: span 8; }
.span-6 { grid-column: span 6; }
.span-4 { grid-column: span 4; }
.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.panel-head h2 { font: 700 1rem 'Sora', sans-serif; color: var(--fg); margin: 0; }
.panel-head p { font: 500 0.76rem 'Manrope', sans-serif; color: var(--muted-fg); margin: 2px 0 0; }

.chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; cursor: pointer;
  background: color-mix(in oklab, var(--primary) 14%, transparent); color: var(--primary);
  border: 1px solid color-mix(in oklab, var(--primary) 40%, transparent);
  font: 800 0.74rem 'Manrope', sans-serif;
}
.chip--ghost { background: transparent; color: var(--muted-fg); border-color: var(--border); }
.chip--ghost:hover { color: var(--fg); }

.idle { display: flex; flex-wrap: wrap; gap: 7px; }
.idle-chip {
  padding: 5px 10px; border-radius: 8px; font: 700 0.76rem 'Manrope', sans-serif; color: #fbbf24;
  background: color-mix(in oklab, #f59e0b 10%, transparent); border: 1px solid color-mix(in oklab, #f59e0b 28%, transparent);
}
.idle-more { padding: 5px 4px; font: 700 0.76rem 'Manrope', sans-serif; color: var(--muted-fg); }

.evo-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 56px 16px;
  color: var(--muted-fg); font: 600 0.9rem 'Manrope', sans-serif; text-align: center;
}

/* ── Responsivo ──────────────────────────────────────────── */
@media (max-width: 1180px) {
  .span-8, .span-6, .span-4 { grid-column: span 12; }
}
@media (max-width: 720px) {
  .evo { padding: 16px 14px 40px; }
  .evo-title { font-size: 1.5rem; }
  .evo-select { flex: 1 1 100%; }
  .kpi-value { font-size: 1.8rem; }
  .panel { padding: 14px 14px 16px; }
}

@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; } 50% { opacity: 0.55; box-shadow: 0 0 0 5px transparent; } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .kpi, .kpi::before, .panel, .live-dot, .spin { animation: none; }
}
</style>
