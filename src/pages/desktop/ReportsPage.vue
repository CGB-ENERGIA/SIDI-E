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
        <button class="export-btn" :disabled="!services.length" @click="exportCsv">
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
          <div class="act-row" v-for="(item, i) in byActivity" :key="item.name">
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
            <div class="act-count">{{ item.count }}</div>
          </div>
        </div>
        <div class="chart-empty" v-else>
          <q-icon name="task_alt" size="40px" class="q-mb-sm" style="opacity:0.2" />
          <div>Sem dados no período</div>
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEvidenceStore } from 'src/stores/evidence'
import { useQuasar } from 'quasar'

const evidenceStore = useEvidenceStore()
const $q = useQuasar()

const services = ref([])

const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const dateFrom = ref(monthStart)
const dateTo = ref(today.toISOString().split('T')[0])

onMounted(() => load())

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
  const photos = services.value.reduce((s, r) => s + (r.evidence_photos?.length || 0), 0)
  const epi = services.value.reduce((s, r) => s + (r.evidence_photos || []).filter(p => p.tipo === 'epi').length, 0)
  const teams = new Set(services.value.map(s => s.team_id || s.teams?.prefixo)).size
  return [
    { label: 'Serviços',   value: services.value.length, icon: 'task',          accent: '#3b82f6' },
    { label: 'Fotos',      value: photos,                 icon: 'photo_library', accent: '#06b6d4' },
    { label: 'Fotos EPI',  value: epi,                   icon: 'safety_check',  accent: '#14b8a6' },
    { label: 'Equipes',    value: teams,                  icon: 'groups',        accent: '#22c55e' }
  ]
})

const byTeam = computed(() => {
  const map = {}
  for (const s of services.value) {
    const key = s.teams?.prefixo || s.team_id || 'N/A'
    if (!map[key]) map[key] = { prefixo: s.teams?.prefixo || key, nome: s.teams?.nome || '', count: 0, photos: 0 }
    map[key].count++
    map[key].photos += s.evidence_photos?.length || 0
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
})

const byActivity = computed(() => {
  const map = {}
  for (const s of services.value) {
    const name = s.activity_name || s.activity_id || 'Sem atividade'
    map[name] = (map[name] || 0) + 1
  }
  return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})

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
  const lines = services.value.map(s => {
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
