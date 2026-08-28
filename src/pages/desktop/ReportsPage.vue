<template>
  <q-page class="rp-page">

    <!-- ── Header ─────────────────────────────────────────── -->
    <div class="rp-header">
      <div>
        <div class="rp-title">Relatórios</div>
        <div class="rp-subtitle">Resumo de atividades e evidências</div>
      </div>

      <div class="rp-filters">
        <div class="date-field">
          <span class="date-label">De</span>
          <input type="date" class="date-input" v-model="dateFrom" @change="load" />
        </div>
        <div class="date-sep">→</div>
        <div class="date-field">
          <span class="date-label">Até</span>
          <input type="date" class="date-input" v-model="dateTo" @change="load" />
        </div>
        <q-select v-model="filterSupervisor" :options="supervisoresList" label="Supervisor"
          outlined dense clearable style="min-width:170px; background: transparent;" />
        <q-select v-model="filterCoordenador" :options="coordenadoresList" label="Coordenador"
          outlined dense clearable style="min-width:155px; background: transparent;" />
        <button class="export-btn" :disabled="!filteredServices.length" @click="exportCsv">
          <q-icon name="download" size="16px" />
          Exportar CSV
        </button>
      </div>
    </div>

    <!-- ── KPI tiles ──────────────────────────────────────── -->
    <div class="kpi-row">
      <div class="kpi-card" v-for="k in kpis" :key="k.label" :style="`--accent: ${k.accent}`">
        <div class="kpi-top">
          <span class="kpi-label">{{ k.label }}</span>
          <span class="kpi-icon" :style="`color: ${k.accent}`">
            <q-icon :name="k.icon" size="22px" />
          </span>
        </div>
        <div class="kpi-value" :style="`color: ${k.accent}`">{{ k.value }}</div>
        <div class="kpi-bar" />
      </div>
    </div>

    <!-- ── Charts row ─────────────────────────────────────── -->
    <div class="charts-row">

      <!-- Serviços por equipe -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">Serviços por equipe</div>
          <div class="chart-badge">{{ byTeam.length }} equipes</div>
        </div>

        <div class="chart-body" v-if="byTeam.length">
          <div class="bar-row" v-for="item in byTeam.slice(0, 10)" :key="item.prefixo">
            <div class="bar-avatar" :style="`background: ${strColor(item.prefixo)}`">
              {{ item.prefixo.charAt(0) }}
            </div>
            <div class="bar-info">
              <div class="bar-name">{{ item.prefixo }}</div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="`width: ${(item.count / maxTeam) * 100}%; background: ${strColor(item.prefixo)}`"
                />
              </div>
            </div>
            <div class="bar-meta">
              <span class="bar-count">{{ item.count }}</span>
              <span class="bar-photos">{{ item.photos }} foto{{ item.photos !== 1 ? 's' : '' }}</span>
            </div>
          </div>
        </div>
        <div class="chart-empty" v-else>
          <q-icon name="bar_chart" size="40px" class="q-mb-sm" style="opacity:0.2" />
          <div>Sem dados no período</div>
        </div>
      </div>

      <!-- Serviços por atividade -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">Serviços por atividade</div>
          <div class="chart-badge">{{ byActivity.length }} tipos</div>
        </div>

        <div class="chart-body" v-if="byActivity.length">
          <div
            class="act-row act-row--clickable"
            v-for="(item, i) in byActivity"
            :key="item.name"
            @click="openActivityDetail(item)"
          >
            <div class="act-rank">{{ i + 1 }}</div>
            <div class="act-info">
              <div class="act-name">{{ item.name }}</div>
              <div class="bar-track">
                <div
                  class="bar-fill act-fill"
                  :style="`width: ${(item.count / maxActivity) * 100}%`"
                />
              </div>
            </div>
            <div class="act-count">
              {{ item.count }}
              <q-icon name="chevron_right" size="14px" color="grey-7" class="q-ml-xs" />
            </div>
          </div>
        </div>
        <div class="chart-empty" v-else>
          <q-icon name="task_alt" size="40px" class="q-mb-sm" style="opacity:0.2" />
          <div>Sem dados no período</div>
        </div>
      </div>

    </div>

    <!-- ── Dialog: detalhe da atividade ─────────────────── -->
    <q-dialog v-model="showActivityDetail" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card style="background:#0d1117; color:#e6edf3; display:flex; flex-direction:column;">
        <q-bar style="background:#161b2e; border-bottom:1px solid #1e2640; padding:12px 24px;">
          <q-icon name="task" color="primary" class="q-mr-sm" />
          <span class="text-weight-bold" style="font-size:1rem;">
            {{ selectedActivity?.name }}
          </span>
          <q-chip dense color="primary" text-color="white" class="q-ml-md">
            {{ selectedActivity?.count }} serviço{{ selectedActivity?.count !== 1 ? 's' : '' }}
          </q-chip>
          <q-chip dense color="teal" text-color="white" class="q-ml-xs">
            {{ activityTeams.length }} equipe{{ activityTeams.length !== 1 ? 's' : '' }}
          </q-chip>
          <q-space />
          <q-btn dense flat icon="close" color="grey-4" v-close-popup />
        </q-bar>

        <q-card-section class="q-pa-lg" style="overflow:auto; flex:1;">
          <div class="act-detail-grid">

            <!-- Tabela por equipe -->
            <q-card flat style="background:#161b2e; border:1px solid #1e2640; border-radius:14px;">
              <q-card-section>
                <div style="font-size:0.85rem; font-weight:700; color:#c9d3e8; margin-bottom:16px;">
                  Equipes que realizaram esta atividade
                </div>
                <q-table
                  :rows="activityTeams"
                  :columns="activityTeamCols"
                  row-key="prefixo"
                  flat dark
                  dense
                  :pagination="{ rowsPerPage: 20 }"
                  style="background:transparent;"
                >
                  <template #body-cell-prefixo="{ row }">
                    <q-td>
                      <q-chip dense :style="`background:${strColor(row.prefixo)}22; color:${strColor(row.prefixo)};`">
                        {{ row.prefixo }}
                      </q-chip>
                    </q-td>
                  </template>
                  <template #body-cell-datas="{ row }">
                    <q-td>
                      <div style="display:flex; flex-wrap:wrap; gap:4px;">
                        <q-badge
                          v-for="d in row.datas.slice(0,5)" :key="d"
                          color="blue-grey-9" text-color="blue-grey-3"
                          :label="d"
                          style="font-size:0.7rem;"
                        />
                        <q-badge v-if="row.datas.length > 5" color="blue-grey-10"
                          :label="`+${row.datas.length - 5}`" />
                      </div>
                    </q-td>
                  </template>
                </q-table>
              </q-card-section>
            </q-card>

            <!-- Linha do tempo -->
            <q-card flat style="background:#161b2e; border:1px solid #1e2640; border-radius:14px;">
              <q-card-section>
                <div style="font-size:0.85rem; font-weight:700; color:#c9d3e8; margin-bottom:16px;">
                  Registros individuais
                </div>
                <q-list dense separator style="max-height:60vh; overflow:auto;">
                  <q-item
                    v-for="svc in selectedActivity?.services || []"
                    :key="svc.id"
                    style="padding:10px 4px;"
                  >
                    <q-item-section avatar>
                      <q-chip dense :style="`background:${strColor(svc.teams?.prefixo || '')}22; color:${strColor(svc.teams?.prefixo || '')};`" style="font-size:0.7rem;">
                        {{ svc.teams?.prefixo || '—' }}
                      </q-chip>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label style="font-size:0.82rem; color:#a0aec0;">
                        {{ svc.teams?.nome || '' }}
                      </q-item-label>
                      <q-item-label caption style="color:#5a6a8c;">
                        {{ formatDateTime(svc.created_at) }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div style="display:flex; gap:6px; align-items:center;">
                        <q-badge color="teal" :label="`${epiCount(svc)} EPI`" />
                        <q-badge color="blue" :label="`${atividadeCount(svc)} Ativ.`" />
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEvidenceStore } from 'src/stores/evidence'
import { useTeamsStore } from 'src/stores/teams'
import { useQuasar } from 'quasar'
import { COORDENADORES } from 'src/data/equipes-filtro'

const evidenceStore = useEvidenceStore()
const $q = useQuasar()

const services = ref([])
const filterSupervisor = ref(null)
const filterCoordenador = ref(null)
const teamsStore = useTeamsStore()
const supervisoresList = computed(() => {
  const s = new Set(teamsStore.teams.map(t => t.supervisor).filter(Boolean))
  return [...s].sort()
})
const coordenadoresList = computed(() => {
  const fromDB = new Set(teamsStore.teams.map(t => t.coordenador).filter(Boolean))
  if (fromDB.size > 0) return [...fromDB].sort()
  return COORDENADORES
})

const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const dateFrom = ref(monthStart)
const dateTo = ref(today.toISOString().split('T')[0])

const filteredServices = computed(() => {
  return services.value.filter(s => {
    const prefixo = s.teams?.prefixo
    if (filterSupervisor.value && s.teams?.supervisor !== filterSupervisor.value) return false
    if (filterCoordenador.value) {
      const team = teamsStore.teams.find(t => t.id === s.team_id)
      if (team?.coordenador !== filterCoordenador.value) return false
    }
    return true
  })
})

onMounted(() => {
  teamsStore.fetchTeams()
  load()
})

async function load () {
  try {
    const all = await evidenceStore.fetchEvidences({ date: dateFrom.value }) || []
    const to = dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null
    services.value = all.filter(s => {
      const d = new Date(s.created_at)
      return !to || d <= to
    })
  } catch {
    services.value = []
  }
}

const kpis = computed(() => {
  const photos = filteredServices.value.reduce((s, r) => s + (r.evidence_photos?.length || 0), 0)
  const epi = filteredServices.value.reduce((s, r) => s + (r.evidence_photos || []).filter(p => p.tipo === 'epi').length, 0)
  const teams = new Set(filteredServices.value.map(s => s.team_id || s.teams?.prefixo)).size
  return [
    { label: 'Serviços',   value: filteredServices.value.length, icon: 'task',          accent: '#3b82f6' },
    { label: 'Fotos',      value: photos,                        icon: 'photo_library', accent: '#06b6d4' },
    { label: 'Fotos EPI',  value: epi,                          icon: 'safety_check',  accent: '#14b8a6' },
    { label: 'Equipes',    value: teams,                         icon: 'groups',        accent: '#22c55e' }
  ]
})

const byTeam = computed(() => {
  const map = {}
  for (const s of filteredServices.value) {
    const key = s.teams?.prefixo || s.team_id || 'N/A'
    if (!map[key]) map[key] = { prefixo: s.teams?.prefixo || key, nome: s.teams?.nome || '', count: 0, photos: 0 }
    map[key].count++
    map[key].photos += s.evidence_photos?.length || 0
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
})

const byActivity = computed(() => {
  const map = {}
  for (const s of filteredServices.value) {
    const name = s.activity_name || 'Sem atividade'
    if (!map[name]) map[name] = { name, count: 0, services: [] }
    map[name].count++
    map[name].services.push(s)
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
})

// ── Drill-down de atividade ──────────────────────────────
const showActivityDetail = ref(false)
const selectedActivity = ref(null)

const activityTeams = computed(() => {
  if (!selectedActivity.value) return []
  const map = {}
  for (const s of selectedActivity.value.services) {
    const key = s.teams?.prefixo || s.team_id || 'N/A'
    if (!map[key]) map[key] = { prefixo: key, nome: s.teams?.nome || '', count: 0, datas: [], fotos: 0 }
    map[key].count++
    map[key].fotos += s.evidence_photos?.length || 0
    const d = formatDate(s.created_at)
    if (!map[key].datas.includes(d)) map[key].datas.push(d)
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
})

const activityTeamCols = [
  { name: 'prefixo', label: 'Equipe',    field: 'prefixo', align: 'left',  sortable: true },
  { name: 'nome',    label: 'Nome',      field: 'nome',    align: 'left' },
  { name: 'count',   label: 'Serviços',  field: 'count',   align: 'center', sortable: true },
  { name: 'fotos',   label: 'Fotos',     field: 'fotos',   align: 'center', sortable: true },
  { name: 'datas',   label: 'Datas',     field: 'datas',   align: 'left' }
]

function openActivityDetail (item) {
  selectedActivity.value = item
  showActivityDetail.value = true
}

function epiCount (svc) {
  return (svc.evidence_photos || []).filter(p => p.tipo === 'epi').length
}
function atividadeCount (svc) {
  return (svc.evidence_photos || []).filter(p => p.tipo === 'atividade').length
}
function formatDate (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}
function formatDateTime (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const maxTeam     = computed(() => Math.max(1, ...byTeam.value.map(t => t.count)))
const maxActivity = computed(() => Math.max(1, ...byActivity.value.map(a => a.count)))

function strColor (str = '') {
  const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}

function exportCsv () {
  const header = ['Data', 'Equipe', 'Atividade', 'Fotos EPI', 'Fotos Atividade', 'Total Fotos', 'Status']
  const lines = filteredServices.value.map(s => {
    const epi  = (s.evidence_photos || []).filter(p => p.tipo === 'epi').length
    const ativ = (s.evidence_photos || []).filter(p => p.tipo === 'atividade').length
    return [
      new Date(s.created_at).toLocaleString('pt-BR'),
      s.teams?.prefixo || '',
      s.activity_name || '',
      epi, ativ, epi + ativ,
      s.sync_status || ''
    ].join(';')
  })
  const csv = [header.join(';'), ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `relatorio-${dateFrom.value}-${dateTo.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: 'CSV exportado!' })
}
</script>

<style scoped>
/* ── Page ───────────────────────────────────────────────── */
.rp-page {
  padding: 32px 36px;
  min-height: 100vh;
  background: #0d1117;
  color: #e6edf3;
}

/* ── Header ─────────────────────────────────────────────── */
.rp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 36px;
  flex-wrap: wrap;
  gap: 20px;
}

.rp-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #f0f6ff;
}

.rp-subtitle {
  font-size: 0.83rem;
  color: #6b7a99;
  margin-top: 3px;
  letter-spacing: 0.02em;
}

/* ── Filters ─────────────────────────────────────────────── */
.rp-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.date-label {
  font-size: 0.68rem;
  color: #6b7a99;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding-left: 2px;
}

.date-input {
  background: #161b2e;
  border: 1px solid #21283d;
  border-radius: 8px;
  color: #c9d3e8;
  font-family: inherit;
  font-size: 0.875rem;
  padding: 7px 12px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  color-scheme: dark;
}
.date-input:focus { border-color: #3b82f6; }

.date-sep {
  color: #3b4a6b;
  font-size: 1.1rem;
  margin-top: 18px;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: transparent;
  border: 1.5px solid #21283d;
  border-radius: 8px;
  color: #7b91bf;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 9px 18px;
  cursor: pointer;
  margin-top: 18px;
  transition: border-color 0.2s, color 0.2s;
}
.export-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #93c5fd;
}
.export-btn:disabled { opacity: 0.35; cursor: default; }

/* ── KPI tiles ───────────────────────────────────────────── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 28px;
}

.kpi-card {
  background: #161b2e;
  border: 1px solid #1e2640;
  border-radius: 14px;
  padding: 22px 24px 18px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s;
}
.kpi-card::before {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: var(--accent);
  opacity: 0.7;
  border-radius: 0 0 14px 14px;
}
.kpi-card:hover { border-color: var(--accent); }

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.kpi-label {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5a6a8c;
  font-weight: 700;
}

.kpi-icon {
  opacity: 0.85;
}

.kpi-value {
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}

.kpi-bar { display: none; }

/* ── Charts row ──────────────────────────────────────────── */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.chart-card {
  background: #161b2e;
  border: 1px solid #1e2640;
  border-radius: 14px;
  padding: 24px 28px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.chart-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #c9d3e8;
  letter-spacing: 0.01em;
}

.chart-badge {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: #5a6a8c;
  background: #1e2640;
  border-radius: 100px;
  padding: 3px 10px;
  font-weight: 600;
}

.chart-body { display: flex; flex-direction: column; gap: 14px; flex: 1; }

/* ── Team bar rows ───────────────────────────────────────── */
.bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0;
  opacity: 0.9;
}

.bar-info {
  flex: 1;
  min-width: 0;
}

.bar-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: #a0aec0;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-track {
  height: 6px;
  background: #1e2640;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.85;
}

.bar-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.bar-count {
  font-size: 1rem;
  font-weight: 800;
  color: #c9d3e8;
  line-height: 1;
}

.bar-photos {
  font-size: 0.68rem;
  color: #5a6a8c;
  margin-top: 1px;
}

/* ── Activity rows ───────────────────────────────────────── */
.act-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.act-rank {
  width: 22px;
  text-align: right;
  font-size: 0.72rem;
  font-weight: 700;
  color: #3b4a6b;
  flex-shrink: 0;
}

.act-info { flex: 1; min-width: 0; }

.act-name {
  font-size: 0.78rem;
  color: #a0aec0;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.act-fill { background: #f59e0b; opacity: 0.75; }

.act-row--clickable {
  cursor: pointer;
  border-radius: 8px;
  padding: 4px 6px;
  margin: 0 -6px;
  transition: background 0.15s;
}
.act-row--clickable:hover { background: rgba(245, 158, 11, 0.08); }
.act-row--clickable:hover .act-name { color: #f59e0b; }

.act-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
@media (max-width: 900px) {
  .act-detail-grid { grid-template-columns: 1fr; }
}

.act-count {
  font-size: 0.95rem;
  font-weight: 800;
  color: #c9d3e8;
  flex-shrink: 0;
  min-width: 28px;
  text-align: right;
}

/* ── Empty state ─────────────────────────────────────────── */
.chart-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #3b4a6b;
  font-size: 0.85rem;
  gap: 4px;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 900px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .charts-row { grid-template-columns: 1fr; }
  .rp-header { flex-direction: column; }
}
</style>
