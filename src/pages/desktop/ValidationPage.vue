<template>
  <q-page class="val-page q-pa-lg">

    <!-- ══ TELA 1: Seleção de grupo ══ -->
    <template v-if="!selectedGroup">
      <div class="screen1-wrap">
        <div class="val-header q-mb-xl">
          <div class="val-eyebrow">Inspeções · SIDI-E</div>
          <div class="val-title">Validação</div>
          <div class="val-sub">Selecione o grupo para revisar e validar os serviços</div>
        </div>

        <div class="group-grid">
          <div
            v-for="(g, i) in grupos"
            :key="g.key"
            class="group-card"
            :class="`group-card--${g.key.toLowerCase()}`"
            :style="{ '--i': i }"
            @click="selectGroup(g.key)"
          >
            <!-- Reflexo superior (efeito carta) -->
            <div class="card-shine" />
            <div class="card-top-bar" />

            <!-- Monograma de fundo -->
            <div class="card-monogram">{{ g.key }}</div>

            <div class="group-icon-wrap">
              <q-icon :name="g.icon" size="32px" class="group-icon-el" />
            </div>
            <div class="group-name">{{ g.key }}</div>
            <div class="group-desc">{{ g.desc }}</div>

            <div class="card-divider" />

            <div class="group-badges">
              <span class="gbadge gbadge--pending">
                <q-spinner-dots v-if="loadingCounts" size="10px" />
                <template v-else>
                  <span class="badge-count">{{ counts[g.key]?.pendente ?? 0 }}</span>
                  <span class="badge-label">pendentes</span>
                </template>
              </span>
            </div>

            <div class="card-footer">
              <span class="card-cta">Validar agora</span>
              <q-icon name="arrow_forward" size="16px" class="card-arrow-icon" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ TELA 2: Validação do grupo ══ -->
    <template v-else>
      <!-- Header -->
      <div class="screen2-header q-mb-md">
        <div class="flex items-center gap-3">
          <q-btn flat round icon="arrow_back" @click="selectedGroup = null" class="back-btn" />
          <div>
            <div class="val-title screen2-title">{{ selectedGroup }}</div>
            <div class="val-sub">{{ activeTab === 'historico' ? 'Histórico de validações' : 'Revise e valide os serviços registrados' }}</div>
          </div>
        </div>
        <div class="header-controls">
          <template v-if="activeTab === 'validacao'">
            <q-input v-model="filterDate" type="date" outlined dense label="Data"
              bg-color="surface" style="min-width:170px;" clearable
              @update:model-value="loadServices" class="ctrl-input" />
            <q-btn unelevated icon="refresh" label="Atualizar" color="primary"
              :loading="loading" @click="loadServices" class="refresh-btn" />
          </template>
          <template v-else>
            <q-input v-model="histFilterStart" type="date" outlined dense label="De"
              bg-color="surface" style="min-width:150px;" clearable class="ctrl-input" />
            <q-input v-model="histFilterEnd" type="date" outlined dense label="Até"
              bg-color="surface" style="min-width:150px;" clearable class="ctrl-input" />
            <q-btn unelevated icon="refresh" label="Atualizar" color="primary"
              :loading="loadingHistory" @click="loadHistory" class="refresh-btn" />
          </template>
        </div>
      </div>

      <!-- Abas -->
      <div class="tab-bar q-mb-lg">
        <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'validacao' }"
          @click="switchTab('validacao')">
          <q-icon name="verified" size="17px" />Validação
        </button>
        <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'resumo' }"
          @click="switchTab('resumo')">
          <q-icon name="donut_large" size="17px" />Resumo
        </button>
        <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'historico' }"
          @click="switchTab('historico')">
          <q-icon name="history" size="17px" />Histórico
        </button>
      </div>

      <!-- ══ ABA: VALIDAÇÃO ══ -->
      <template v-if="activeTab === 'validacao'">
        <!-- Barra de filtros -->
        <div class="filter-bar q-mb-lg">
          <div class="search-wrap">
            <q-icon name="search" size="18px" class="search-icon" />
            <input v-model="search" class="search-input" placeholder="Buscar equipe, atividade, colaborador…" />
          </div>
          <q-select v-model="filterSupervisor" :options="supervisoresList" label="Supervisor"
            outlined dense clearable bg-color="surface" style="min-width:180px;" class="filter-select" />
          <q-select v-model="filterResponsavel" :options="responsaveisList" label="Responsável"
            outlined dense clearable bg-color="surface" style="min-width:180px;" class="filter-select" />
          <q-btn v-if="search || filterSupervisor || filterResponsavel"
            flat icon="close" label="Limpar" size="sm" no-caps color="grey"
            @click="search = ''; filterSupervisor = null; filterResponsavel = null" />
        </div>

        <!-- KPIs -->
        <div class="kpi-row q-mb-xl">
          <div class="kpi-tile" v-for="(k, ki) in kpis" :key="k.label"
            :class="{ 'kpi-active': filterStatus === k.value }"
            :style="{ '--ki': ki }"
            @click="filterStatus = filterStatus === k.value ? null : k.value">
            <div class="kpi-icon-wrap" :style="`--kc:${k.color}`">
              <q-icon :name="k.icon" size="20px" />
            </div>
            <div class="kpi-body">
              <div class="kpi-value" :style="`color:${k.color}`">{{ k.count }}</div>
              <div class="kpi-label">{{ k.label }}</div>
            </div>
          </div>
        </div>

        <!-- Lista de serviços -->
        <div v-if="loading" class="flex justify-center q-pa-xl">
          <q-spinner-dots size="48px" color="primary" />
        </div>

        <div v-else-if="filteredServices.length === 0" class="empty-state">
          <q-icon name="verified" size="56px" class="empty-icon" />
          <div class="empty-text">Nenhum serviço {{ filterStatus ? 'neste status' : 'encontrado' }}</div>
        </div>

        <div v-else class="svc-list">
          <div
            v-for="(svc, si) in filteredServices"
            :key="svc.id"
            class="svc-card"
            :class="`svc-card--${svc.validation_status || 'pendente'}`"
            :style="{ '--si': si }"
          >
            <div class="svc-head">
              <div class="svc-team">
                <span class="svc-prefix">{{ svc.teams?.prefixo || '—' }}</span>
                <span class="svc-nome">{{ svc.teams?.nome || '' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <q-chip dense :color="statusColor(svc.validation_status)" text-color="white" size="sm">
                  {{ statusLabel(svc.validation_status) }}
                </q-chip>
                <span class="svc-date">{{ formatDate(svc.created_at) }}</span>
              </div>
            </div>

            <div class="svc-info">
              <q-chip dense color="blue-grey-8" text-color="white" size="sm" icon="build">
                {{ svc.activity_name || 'Sem atividade' }}
              </q-chip>
              <span v-if="svc.colaboradores?.length" class="svc-colab">
                <q-icon name="people" size="14px" /> {{ svc.colaboradores.join(', ') }}
              </span>
            </div>

            <div v-if="svc.evidence_photos?.length" class="fotos-row">
              <div
                v-for="foto in svc.evidence_photos"
                :key="foto.id"
                class="foto-thumb"
                @click="openPhoto(foto, svc.evidence_photos)"
              >
                <img :src="photoUrl(foto.file_path)" :alt="foto.tipo" />
                <span class="foto-tipo">{{ foto.tipo }}</span>
              </div>
            </div>
            <div v-else class="no-fotos">
              <q-icon name="no_photography" size="18px" class="q-mr-xs" /> Sem fotos registradas
            </div>

            <div v-if="editingObs === svc.id" class="obs-area">
              <q-input v-model="obsText" outlined dense label="Motivo da reprovação" autogrow bg-color="surface" />
            </div>

            <div v-if="svc.validation_obs" class="val-obs">
              <q-icon name="info" size="14px" class="q-mr-xs" />{{ svc.validation_obs }}
            </div>

            <div class="svc-actions">
              <template v-if="svc.validation_status === 'pendente' || !svc.validation_status">
                <q-btn unelevated color="positive" icon="check_circle" label="Aprovar"
                  size="sm" no-caps @click="aprovar(svc)" :loading="savingId === svc.id" class="action-btn" />
                <q-btn v-if="editingObs !== svc.id"
                  unelevated color="negative" icon="cancel" label="Reprovar"
                  size="sm" no-caps @click="iniciarReprovar(svc)" class="action-btn" />
                <template v-else>
                  <q-btn unelevated color="negative" icon="send" label="Confirmar reprovação"
                    size="sm" no-caps @click="reprovar(svc)" :loading="savingId === svc.id" class="action-btn" />
                  <q-btn flat label="Cancelar" size="sm" no-caps @click="editingObs = null; obsText = ''" />
                </template>
              </template>
              <template v-else>
                <q-btn flat color="grey" icon="undo" label="Reabrir" size="sm" no-caps @click="reabrir(svc)" />
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- ══ ABA: RESUMO ══ -->
      <template v-if="activeTab === 'resumo'">
        <div v-if="loading" class="flex justify-center q-pa-xl">
          <q-spinner-dots size="48px" color="primary" />
        </div>
        <div v-else-if="services.length === 0" class="empty-state">
          <q-icon name="donut_large" size="56px" class="empty-icon" style="color:#60a5fa" />
          <div class="empty-text">Nenhum serviço encontrado para a data selecionada</div>
        </div>
        <div v-else class="resumo-wrap">
          <!-- Donut central -->
          <div class="resumo-donut-card">
            <div class="resumo-donut-header">
              <div class="resumo-eyebrow">Resumo do dia · {{ selectedGroup }}</div>
              <div class="resumo-date">{{ filterDate ? new Date(filterDate + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : '—' }}</div>
            </div>
            <div class="resumo-body">
              <div class="resumo-chart-wrap">
                <svg class="donut-svg-lg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <!-- Glow filter -->
                  <defs>
                    <filter id="glow-g"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <filter id="glow-r"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <filter id="glow-a"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <!-- Trilha de fundo -->
                  <circle r="76" cx="100" cy="100" fill="none" stroke="#1a2d4a" stroke-width="20" />
                  <!-- Segmentos -->
                  <circle v-for="seg in donutSegments" :key="seg.label"
                    r="76" cx="100" cy="100" fill="none"
                    :stroke="seg.color" stroke-width="20" stroke-linecap="butt"
                    :stroke-dasharray="`${seg.len} ${donutC}`"
                    :stroke-dashoffset="-seg.offset"
                    transform="rotate(-90 100 100)"
                    style="transition: stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)"
                  />
                  <!-- Centro -->
                  <text x="100" y="90" text-anchor="middle" fill="#f1f5f9"
                    font-size="36" font-weight="800" font-family="sans-serif">{{ services.length }}</text>
                  <text x="100" y="114" text-anchor="middle" fill="#475569"
                    font-size="13" font-family="sans-serif">serviços</text>
                </svg>
              </div>
              <div class="resumo-legend-col">
                <div class="resumo-legend-item" v-for="item in donutLegend" :key="item.label">
                  <div class="resumo-item-top">
                    <div class="resumo-dot" :style="`background:${item.color};box-shadow:0 0 8px ${item.color}80`" />
                    <span class="resumo-item-label">{{ item.label }}</span>
                    <span class="resumo-item-pct" :style="`color:${item.color}`">{{ item.pct }}%</span>
                  </div>
                  <div class="resumo-item-count">{{ item.count }} serviço{{ item.count !== 1 ? 's' : '' }}</div>
                  <div class="resumo-bar-track">
                    <div class="resumo-bar-fill" :style="`width:${item.pct}%;background:${item.color}`" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ══ ABA: HISTÓRICO ══ -->
      <template v-else-if="activeTab === 'historico'">
        <div class="filter-bar q-mb-lg">
          <div class="search-wrap">
            <q-icon name="search" size="18px" class="search-icon" />
            <input v-model="histSearch" class="search-input" placeholder="Buscar equipe, atividade, validador…" />
          </div>
          <q-select v-model="histFilterStatus" label="Status"
            :options="[{label:'Aprovadas', value:'aprovada'},{label:'Reprovadas', value:'reprovada'}]"
            option-value="value" option-label="label" emit-value map-options
            outlined dense clearable bg-color="surface" style="min-width:160px;" class="filter-select" />
          <q-btn v-if="histSearch || histFilterStatus"
            flat icon="close" label="Limpar" size="sm" no-caps color="grey"
            @click="histSearch = ''; histFilterStatus = null" />
          <div class="q-ml-auto hist-count">
            {{ filteredHistory.length }} registro{{ filteredHistory.length !== 1 ? 's' : '' }}
          </div>
        </div>

        <div v-if="loadingHistory" class="flex justify-center q-pa-xl">
          <q-spinner-dots size="48px" color="primary" />
        </div>

        <div v-else-if="filteredHistory.length === 0" class="empty-state">
          <q-icon name="history" size="56px" class="empty-icon" style="color:#60a5fa" />
          <div class="empty-text">Nenhum registro encontrado</div>
          <div class="empty-hint">Ajuste as datas ou valide alguns serviços primeiro</div>
        </div>

        <div v-else class="svc-list">
          <div
            v-for="(item, hi) in filteredHistory"
            :key="item.id"
            class="svc-card hist-card"
            :class="`svc-card--${item.validation_status}`"
            :style="{ '--si': hi }"
          >
            <div class="hist-validator-row">
              <div class="hist-status-badge" :class="`hist-badge--${item.validation_status}`">
                <q-icon :name="item.validation_status === 'aprovada' ? 'check_circle' : 'cancel'" size="15px" />
                {{ item.validation_status === 'aprovada' ? 'Aprovado' : 'Reprovado' }}
              </div>
              <div class="hist-meta">
                <q-icon name="person" size="13px" style="color:#60a5fa;flex-shrink:0" />
                <span class="hist-validator">{{ item.validated_by || 'Desconhecido' }}</span>
                <span class="hist-sep">·</span>
                <q-icon name="schedule" size="13px" style="color:#475569;flex-shrink:0" />
                <span class="hist-datetime">{{ formatDatetime(item.validated_at) }}</span>
              </div>
            </div>
            <div class="hist-divider" />

            <div class="svc-head">
              <div class="svc-team">
                <span class="svc-prefix">{{ item.teams?.prefixo || '—' }}</span>
                <span class="svc-nome">{{ item.teams?.nome || '' }}</span>
              </div>
              <span class="svc-date">Criado em {{ formatDate(item.created_at) }}</span>
            </div>

            <div class="svc-info">
              <q-chip dense color="blue-grey-8" text-color="white" size="sm" icon="build">
                {{ item.activity_name || 'Sem atividade' }}
              </q-chip>
              <span v-if="item.colaboradores?.length" class="svc-colab">
                <q-icon name="people" size="14px" /> {{ item.colaboradores.join(', ') }}
              </span>
            </div>

            <div v-if="item.evidence_photos?.length" class="fotos-row">
              <div v-for="foto in item.evidence_photos" :key="foto.id" class="foto-thumb"
                @click="openPhoto(foto, item.evidence_photos)">
                <img :src="photoUrl(foto.file_path)" :alt="foto.tipo" />
                <span class="foto-tipo">{{ foto.tipo }}</span>
              </div>
            </div>
            <div v-else class="no-fotos">
              <q-icon name="no_photography" size="18px" class="q-mr-xs" /> Sem fotos
            </div>

            <div v-if="item.validation_obs" class="val-obs">
              <q-icon name="info" size="14px" class="q-mr-xs" />{{ item.validation_obs }}
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Lightbox de foto -->
    <q-dialog v-model="showPhoto" maximized>
      <div class="photo-dialog" @click="showPhoto = false">
        <q-btn flat round icon="close" color="white" class="photo-close" @click.stop="showPhoto = false" />
        <q-btn v-if="currentPhotoList.length > 1"
          flat round icon="chevron_left" color="white" size="lg"
          class="photo-nav photo-nav--left" @click.stop="navPhoto(-1)" />
        <div class="photo-center" @click.stop>
          <img :src="currentPhotoUrl" class="photo-full" />
          <div class="photo-counter">{{ currentPhotoIndex + 1 }} / {{ currentPhotoList.length }}</div>
        </div>
        <q-btn v-if="currentPhotoList.length > 1"
          flat round icon="chevron_right" color="white" size="lg"
          class="photo-nav photo-nav--right" @click.stop="navPhoto(1)" />
      </div>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, storage } from 'src/services/supabase'
import { useAuthStore } from 'src/stores/auth'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const authStore = useAuthStore()

const grupos = [
  { key: 'GSTC', icon: 'electrical_services', desc: 'Gestão de Serviços Técnicos Comerciais' },
  { key: 'GOMAN', icon: 'construction', desc: 'Gestão de Obras e Manutenção' },
  { key: 'GERE', icon: 'bolt', desc: 'Gestão de Emergências e Redes' }
]

const selectedGroup     = ref(null)
const activeTab         = ref('validacao')

const filterDate        = ref(new Date().toISOString().split('T')[0])
const filterStatus      = ref(null)
const filterSupervisor  = ref(null)
const filterResponsavel = ref(null)
const search            = ref('')
const loading           = ref(false)
const savingId          = ref(null)
const editingObs        = ref(null)
const obsText           = ref('')
const services          = ref([])

const histFilterStart   = ref('')
const histFilterEnd     = ref(new Date().toISOString().split('T')[0])
const histFilterStatus  = ref(null)
const histSearch        = ref('')
const loadingHistory    = ref(false)
const historyServices   = ref([])

const loadingCounts = ref(false)
const counts        = ref({})

const showPhoto         = ref(false)
const currentPhotoUrl   = ref('')
const currentPhotoList  = ref([])
const currentPhotoIndex = ref(0)

const kpis = computed(() => [
  { label: 'ANALISADAS', value: 'analisadas', icon: 'analytics',     color: '#60a5fa',
    count: services.value.filter(s => s.validation_status === 'aprovada' || s.validation_status === 'reprovada').length },
  { label: 'PENDENTES',  value: 'pendente',   icon: 'hourglass_top', color: '#f59e0b',
    count: services.value.filter(s => !s.validation_status || s.validation_status === 'pendente').length },
  { label: 'APROVADAS',  value: 'aprovada',   icon: 'check_circle',  color: '#4ade80',
    count: services.value.filter(s => s.validation_status === 'aprovada').length },
  { label: 'REPROVADAS', value: 'reprovada',  icon: 'cancel',        color: '#f87171',
    count: services.value.filter(s => s.validation_status === 'reprovada').length }
])

const supervisoresList = computed(() => {
  const s = new Set(services.value.map(s => s.teams?.supervisor).filter(Boolean))
  return [...s].sort()
})
const responsaveisList = computed(() => {
  const s = new Set(services.value.map(s => s.teams?.responsavel).filter(Boolean))
  return [...s].sort()
})

const filteredServices = computed(() => {
  let list = services.value
  const v = filterStatus.value
  if (v === 'pendente')   list = list.filter(s => !s.validation_status || s.validation_status === 'pendente')
  else if (v === 'analisadas') list = list.filter(s => s.validation_status === 'aprovada' || s.validation_status === 'reprovada')
  else if (v)             list = list.filter(s => s.validation_status === v)
  if (filterSupervisor.value)  list = list.filter(s => s.teams?.supervisor === filterSupervisor.value)
  if (filterResponsavel.value) list = list.filter(s => s.teams?.responsavel === filterResponsavel.value)
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(s =>
    (s.teams?.prefixo || '').toLowerCase().includes(q) ||
    (s.teams?.nome || '').toLowerCase().includes(q) ||
    (s.activity_name || '').toLowerCase().includes(q) ||
    (s.colaboradores || []).some(c => c.toLowerCase().includes(q))
  )
  return list
})

// ── Donut chart ───────────────────────────────────────────────
const donutC = 2 * Math.PI * 76

const donutSegments = computed(() => {
  const total = services.value.length
  if (!total) return []
  const approved = services.value.filter(s => s.validation_status === 'aprovada').length
  const rejected = services.value.filter(s => s.validation_status === 'reprovada').length
  const pending  = total - approved - rejected
  const aLen = (approved / total) * donutC
  const rLen = (rejected / total) * donutC
  const pLen = (pending  / total) * donutC
  return [
    { label: 'Aprovados',  color: '#4ade80', len: aLen, offset: 0 },
    { label: 'Reprovados', color: '#f87171', len: rLen, offset: aLen },
    { label: 'Pendentes',  color: '#f59e0b', len: pLen, offset: aLen + rLen }
  ]
})

const donutLegend = computed(() => {
  const total = services.value.length
  if (!total) return []
  const approved = services.value.filter(s => s.validation_status === 'aprovada').length
  const rejected = services.value.filter(s => s.validation_status === 'reprovada').length
  const pending  = total - approved - rejected
  return [
    { label: 'Aprovados',  color: '#4ade80', count: approved, pct: Math.round(approved / total * 100) },
    { label: 'Reprovados', color: '#f87171', count: rejected, pct: Math.round(rejected / total * 100) },
    { label: 'Pendentes',  color: '#f59e0b', count: pending,  pct: Math.round(pending  / total * 100) }
  ]
})

const filteredHistory = computed(() => {
  let list = historyServices.value
  if (histFilterStatus.value) list = list.filter(s => s.validation_status === histFilterStatus.value)
  const q = histSearch.value.trim().toLowerCase()
  if (q) list = list.filter(s =>
    (s.teams?.prefixo || '').toLowerCase().includes(q) ||
    (s.teams?.nome || '').toLowerCase().includes(q) ||
    (s.activity_name || '').toLowerCase().includes(q) ||
    (s.validated_by || '').toLowerCase().includes(q) ||
    (s.colaboradores || []).some(c => c.toLowerCase().includes(q))
  )
  return list
})

async function selectGroup (g) {
  selectedGroup.value = g
  activeTab.value = 'validacao'
  filterStatus.value = null
  historyServices.value = []
  await loadServices()
}

function switchTab (tab) {
  activeTab.value = tab
  if (tab === 'historico' && historyServices.value.length === 0) loadHistory()
  if (tab === 'resumo' && services.value.length === 0) loadServices()
}

async function loadCounts () {
  loadingCounts.value = true
  try {
    for (const g of grupos) {
      const { count } = await supabase
        .from('services')
        .select('id, teams!inner(processo)', { count: 'exact', head: true })
        .eq('teams.processo', g.key)
        .or('validation_status.eq.pendente,validation_status.is.null')
      counts.value[g.key] = { pendente: count || 0 }
    }
  } catch (e) { console.warn('loadCounts:', e.message) }
  finally { loadingCounts.value = false }
}

async function loadServices () {
  loading.value = true
  try {
    let query = supabase
      .from('services')
      .select('id, team_id, activity_name, colaboradores, created_at, validation_status, validation_obs, validated_at, validated_by, evidence_photos(*), teams!inner(prefixo, nome, supervisor, responsavel, processo)')
      .eq('teams.processo', selectedGroup.value)
      .order('created_at', { ascending: false })
    if (filterDate.value) {
      query = query
        .gte('created_at', filterDate.value + 'T00:00:00')
        .lte('created_at', filterDate.value + 'T23:59:59')
    }
    const { data, error } = await query
    if (error) throw error
    services.value = data || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar: ' + e.message })
  } finally { loading.value = false }
}

async function loadHistory () {
  loadingHistory.value = true
  try {
    let query = supabase
      .from('services')
      .select('id, team_id, activity_name, colaboradores, created_at, validation_status, validation_obs, validated_at, validated_by, evidence_photos(*), teams!inner(prefixo, nome, supervisor, responsavel, processo)')
      .eq('teams.processo', selectedGroup.value)
      .in('validation_status', ['aprovada', 'reprovada'])
      .order('validated_at', { ascending: false })
    if (histFilterStart.value) query = query.gte('validated_at', histFilterStart.value + 'T00:00:00')
    if (histFilterEnd.value)   query = query.lte('validated_at', histFilterEnd.value + 'T23:59:59')
    const { data, error } = await query
    if (error) throw error
    historyServices.value = data || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar histórico: ' + e.message })
  } finally { loadingHistory.value = false }
}

async function aprovar (svc) {
  savingId.value = svc.id
  try {
    const { error } = await supabase.from('services').update({
      validation_status: 'aprovada', validation_obs: '',
      validated_at: new Date().toISOString(),
      validated_by: authStore.desktopUser?.email
    }).eq('id', svc.id)
    if (error) throw error
    svc.validation_status = 'aprovada'
    svc.validation_obs = ''
    $q.notify({ type: 'positive', message: 'Serviço aprovado!' })
    await loadCounts()
  } catch (e) { $q.notify({ type: 'negative', message: e.message }) }
  finally { savingId.value = null }
}

function iniciarReprovar (svc) { editingObs.value = svc.id; obsText.value = svc.validation_obs || '' }

async function reprovar (svc) {
  savingId.value = svc.id
  try {
    const { error } = await supabase.from('services').update({
      validation_status: 'reprovada', validation_obs: obsText.value,
      validated_at: new Date().toISOString(),
      validated_by: authStore.desktopUser?.email
    }).eq('id', svc.id)
    if (error) throw error
    svc.validation_status = 'reprovada'
    svc.validation_obs = obsText.value
    editingObs.value = null; obsText.value = ''
    $q.notify({ type: 'negative', message: 'Serviço reprovado.' })
    await loadCounts()
  } catch (e) { $q.notify({ type: 'negative', message: e.message }) }
  finally { savingId.value = null }
}

async function reabrir (svc) {
  savingId.value = svc.id
  try {
    const { error } = await supabase.from('services').update({
      validation_status: 'pendente', validation_obs: '',
      validated_at: null, validated_by: null
    }).eq('id', svc.id)
    if (error) throw error
    svc.validation_status = 'pendente'; svc.validation_obs = ''
    $q.notify({ type: 'info', message: 'Serviço reaberto para validação.' })
    await loadCounts()
  } catch (e) { $q.notify({ type: 'negative', message: e.message }) }
  finally { savingId.value = null }
}

function photoUrl (filePath) {
  if (!filePath) return ''
  try { return storage.getPublicUrl('evidencias', filePath) || '' } catch { return '' }
}

function openPhoto (foto, allPhotos) {
  currentPhotoList.value = allPhotos || [foto]
  currentPhotoIndex.value = currentPhotoList.value.findIndex(p => p.id === foto.id)
  if (currentPhotoIndex.value < 0) currentPhotoIndex.value = 0
  currentPhotoUrl.value = photoUrl(currentPhotoList.value[currentPhotoIndex.value].file_path)
  showPhoto.value = true
}

function navPhoto (dir) {
  const list = currentPhotoList.value
  if (list.length <= 1) return
  currentPhotoIndex.value = (currentPhotoIndex.value + dir + list.length) % list.length
  currentPhotoUrl.value = photoUrl(list[currentPhotoIndex.value].file_path)
}

function onKeydown (e) {
  if (!showPhoto.value) return
  if (e.key === 'ArrowRight') navPhoto(1)
  if (e.key === 'ArrowLeft')  navPhoto(-1)
  if (e.key === 'Escape')     showPhoto.value = false
}

function formatDate (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function formatDatetime (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function statusLabel (s) { return { aprovada: 'Aprovada', reprovada: 'Reprovada', pendente: 'Pendente' }[s] || 'Pendente' }
function statusColor (s) { return { aprovada: 'positive', reprovada: 'negative', pendente: 'warning' }[s] || 'warning' }

onMounted(() => { loadCounts(); window.addEventListener('keydown', onKeydown) })
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
/* ─── Keyframes ─────────────────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes headerIn {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes kpiIn {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes badgePulse {
  0%, 100% { box-shadow: 0 0 0 0 #f59e0b30; }
  50%       { box-shadow: 0 0 0 6px transparent; }
}
@keyframes countGlow {
  0%, 100% { text-shadow: none; }
  50%       { text-shadow: 0 0 14px currentColor; }
}
@keyframes svcIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ─── Page ──────────────────────────────────────────────────── */
.val-page {
  background:
    radial-gradient(ellipse 70% 45% at 50% 0%, #0f2a5520 0%, transparent 65%),
    #070d1a;
  min-height: 100vh;
}

/* ─── Header (screen 1) ─────────────────────────────────────── */
.val-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #3b82f6;
  margin-bottom: 10px;
  animation: headerIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
}
.val-title {
  font-size: 2rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -0.02em;
  text-wrap: balance;
  animation: headerIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s both;
}
.val-sub {
  font-size: 0.9rem;
  color: #475569;
  margin-top: 6px;
  animation: headerIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.1s both;
}

/* ─── Screen 1 centering ────────────────────────────────────── */
.screen1-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 80vh;
  justify-content: center;
  text-align: center;
}
.val-header { text-align: center; }

/* ─── Group cards ───────────────────────────────────────────── */
.group-grid {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 22px;
}

.group-card {
  position: relative;
  width: 240px;
  background: linear-gradient(160deg, #111e35 0%, #0a1220 100%);
  border: 1px solid #1e304f;
  border-radius: 22px;
  padding: 32px 26px 24px;
  cursor: pointer;
  overflow: hidden;
  text-align: center;
  box-shadow:
    0 2px 0 #ffffff08 inset,
    0 -1px 0 #00000060 inset,
    0 8px 32px #00000050;
  transition:
    transform 0.32s cubic-bezier(0.16,1,0.3,1),
    border-color 0.25s ease,
    box-shadow 0.32s ease;
  animation: fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both;
  animation-delay: calc(var(--i, 0) * 110ms + 150ms);
}

/* Reflexo tipo vidro no topo */
.card-shine {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 50%;
  border-radius: 22px 22px 60% 60% / 22px 22px 40px 40px;
  background: linear-gradient(180deg, #ffffff07 0%, transparent 100%);
  pointer-events: none;
}

/* Top accent bar */
.card-top-bar {
  position: absolute;
  top: 0; left: 10%; right: 10%;
  height: 2px;
  border-radius: 0 0 4px 4px;
  background: var(--g-accent, #3b82f6);
  box-shadow: 0 0 12px var(--g-accent, #3b82f6);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.38s cubic-bezier(0.16,1,0.3,1);
}

/* Monograma decorativo de fundo */
.card-monogram {
  position: absolute;
  bottom: -10px; right: -8px;
  font-size: 5rem; font-weight: 900;
  color: var(--g-accent, #3b82f6);
  opacity: 0.04;
  letter-spacing: -0.05em;
  line-height: 1;
  pointer-events: none;
  user-select: none;
  transition: opacity 0.3s;
}
.group-card:hover .card-monogram { opacity: 0.07; }

.group-card--gstc  { --g-accent: #3b82f6; }
.group-card--goman { --g-accent: #f59e0b; }
.group-card--gere  { --g-accent: #10b981; }

.group-card:hover .card-top-bar { transform: scaleX(1); }

.group-card--gstc:hover  {
  border-color: #3b82f650;
  box-shadow:
    0 2px 0 #ffffff08 inset, 0 -1px 0 #00000060 inset,
    0 0 0 1px #3b82f615,
    0 20px 60px #3b82f618,
    0 8px 32px #00000060;
  transform: translateY(-8px) rotate(-0.5deg);
}
.group-card--goman:hover {
  border-color: #f59e0b50;
  box-shadow:
    0 2px 0 #ffffff08 inset, 0 -1px 0 #00000060 inset,
    0 0 0 1px #f59e0b15,
    0 20px 60px #f59e0b15,
    0 8px 32px #00000060;
  transform: translateY(-8px) rotate(-0.5deg);
}
.group-card--gere:hover  {
  border-color: #10b98150;
  box-shadow:
    0 2px 0 #ffffff08 inset, 0 -1px 0 #00000060 inset,
    0 0 0 1px #10b98115,
    0 20px 60px #10b98115,
    0 8px 32px #00000060;
  transform: translateY(-8px) rotate(-0.5deg);
}

/* Icon container */
.group-icon-wrap {
  width: 66px; height: 66px;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
  background: color-mix(in srgb, var(--g-accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--g-accent) 22%, transparent);
  transition: background 0.3s, box-shadow 0.3s, transform 0.32s cubic-bezier(0.16,1,0.3,1);
}
.group-icon-el { color: var(--g-accent); }

.group-card:hover .group-icon-wrap {
  background: color-mix(in srgb, var(--g-accent) 20%, transparent);
  box-shadow: 0 0 24px color-mix(in srgb, var(--g-accent) 35%, transparent);
  transform: scale(1.1) translateY(-2px);
}

.group-name {
  font-size: 1.6rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}
.group-desc {
  font-size: 0.74rem;
  color: #3d5270;
  line-height: 1.5;
  margin-bottom: 0;
}

/* Divisor */
.card-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #1e304f, transparent);
  margin: 18px 0;
}

/* Badge */
.gbadge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 0.78rem; font-weight: 600;
}
.gbadge--pending {
  background: #f59e0b0e;
  border: 1px solid #f59e0b28;
  color: #f59e0b;
  animation: badgePulse 3.5s ease-in-out infinite;
}
.badge-count { font-size: 0.92rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.badge-label { font-size: 0.74rem; opacity: 0.75; }

/* Footer do card */
.card-footer {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 16px;
  color: #2a4166;
  font-size: 0.78rem; font-weight: 600;
  transition: color 0.25s, gap 0.25s;
}
.card-cta { letter-spacing: .02em; }
.card-arrow-icon { transition: transform 0.25s; }
.group-card:hover .card-footer { color: var(--g-accent); gap: 10px; }
.group-card:hover .card-arrow-icon { transform: translateX(3px); }

/* ─── Screen 2 Header ───────────────────────────────────────── */
.screen2-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.screen2-title { font-size: 1.5rem; }
.header-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ctrl-input { }
.refresh-btn { height: 40px; border-radius: 10px; }
.back-btn { color: #475569; }

/* ─── Tabs ──────────────────────────────────────────────────── */
.tab-bar {
  display: inline-flex; gap: 3px;
  background: #0d1829;
  border: 1px solid #1a2d4a;
  border-radius: 12px;
  padding: 4px;
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: transparent; border: none; outline: none;
  color: #475569;
  font-size: 0.85rem; font-weight: 600;
  padding: 8px 20px; border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  letter-spacing: .01em;
}
.tab-btn:hover:not(.tab-btn--active) { color: #94a3b8; background: #ffffff06; }
.tab-btn--active {
  background: #1e3a6e;
  color: #93c5fd;
  box-shadow: inset 0 1px 0 #3b82f620, 0 1px 3px #00000030;
}

/* ─── Filter bar ────────────────────────────────────────────── */
.filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.search-wrap {
  display: flex; align-items: center; gap: 8px;
  background: #0d1829;
  border: 1px solid #1a2d4a;
  border-radius: 10px; padding: 0 14px;
  flex: 1; min-width: 220px; height: 40px;
  transition: border-color 0.2s;
}
.search-wrap:focus-within { border-color: #3b82f650; }
.search-icon { color: #334155; flex-shrink: 0; }
.search-input {
  background: transparent; border: none; outline: none;
  color: #e2e8f0; font-size: 0.88rem; width: 100%;
}
.search-input::placeholder { color: #334155; }

.hist-count { color: #475569; font-size: 0.8rem; white-space: nowrap; }

/* ─── KPI tiles ─────────────────────────────────────────────── */
.kpi-row { display: flex; gap: 12px; flex-wrap: wrap; }

.kpi-tile {
  flex: 1; min-width: 150px;
  background: #0d1829;
  border: 1px solid #1a2d4a;
  border-radius: 16px;
  padding: 18px 20px;
  display: flex; align-items: center; gap: 14px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  animation: kpiIn 0.45s cubic-bezier(0.16,1,0.3,1) both;
  animation-delay: calc(var(--ki, 0) * 60ms + 50ms);
}
.kpi-tile:hover { transform: translateY(-2px); }
.kpi-tile.kpi-active {
  border-color: #3b82f640;
  background: #0f1f38;
  box-shadow: 0 0 0 1px #3b82f620;
}

.kpi-icon-wrap {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--kc, #60a5fa) 14%, transparent);
  color: var(--kc, #60a5fa);
  border: 1px solid color-mix(in srgb, var(--kc, #60a5fa) 20%, transparent);
}
.kpi-value {
  font-size: 1.9rem; font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}
.kpi-label {
  font-size: 0.68rem; color: #475569;
  text-transform: uppercase; letter-spacing: .07em;
  margin-top: 4px; font-weight: 600;
}

/* ─── Service cards ─────────────────────────────────────────── */
.svc-list { display: flex; flex-direction: column; gap: 12px; }

.svc-card {
  background: #0d1829;
  border: 1px solid #1a2d4a;
  border-radius: 16px;
  padding: 18px 22px;
  border-left: 3px solid #1a2d4a;
  transition: border-color 0.2s, box-shadow 0.2s;
  animation: svcIn 0.4s cubic-bezier(0.16,1,0.3,1) both;
  animation-delay: calc(var(--si, 0) * 40ms);
}
.svc-card:hover { box-shadow: 0 4px 20px #00000030; }
.svc-card--aprovada  { border-left-color: #4ade80; }
.svc-card--reprovada { border-left-color: #f87171; }
.svc-card--pendente  { border-left-color: #f59e0b; }

.svc-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; flex-wrap: wrap; gap: 8px;
}
.svc-team { display: flex; align-items: center; gap: 10px; }
.svc-prefix {
  background: #1d3a7a; color: #93c5fd;
  border-radius: 7px; padding: 3px 10px;
  font-size: 0.78rem; font-weight: 700; letter-spacing: .02em;
}
.svc-nome { color: #64748b; font-size: 0.83rem; }
.svc-date { color: #334155; font-size: 0.78rem; }

.svc-info { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.svc-colab { color: #475569; font-size: 0.78rem; }

.fotos-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.foto-thumb {
  position: relative; width: 88px; height: 88px;
  border-radius: 10px; overflow: hidden; cursor: pointer;
  border: 1.5px solid #1a2d4a;
  transition: border-color 0.2s, transform 0.2s;
}
.foto-thumb:hover { border-color: #3b82f660; transform: scale(1.04); }
.foto-thumb img { width: 100%; height: 100%; object-fit: cover; }
.foto-tipo {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, #000a);
  color: #fff; font-size: 0.62rem;
  text-align: center; padding: 4px 0 2px;
  text-transform: uppercase; letter-spacing: .04em;
}
.no-fotos { color: #334155; font-size: 0.8rem; display: flex; align-items: center; margin-bottom: 12px; }
.obs-area { margin-bottom: 12px; }
.val-obs {
  display: flex; align-items: flex-start; gap: 6px;
  background: #f8717112; color: #fca5a5;
  border: 1px solid #f8717120;
  border-radius: 8px; padding: 8px 12px;
  font-size: 0.8rem; margin-bottom: 12px;
}
.svc-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ─── Histórico ─────────────────────────────────────────────── */
.hist-card { padding-top: 16px; }

.hist-validator-row {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 12px; flex-wrap: wrap;
}
.hist-status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 14px; border-radius: 999px;
  font-size: 0.78rem; font-weight: 700; flex-shrink: 0;
}
.hist-badge--aprovada  { background: #4ade8018; color: #86efac; border: 1px solid #4ade8030; }
.hist-badge--reprovada { background: #f8717118; color: #fca5a5; border: 1px solid #f8717130; }

.hist-meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.82rem; flex-wrap: wrap;
}
.hist-validator { color: #93c5fd; font-weight: 600; }
.hist-sep { color: #1d2e4a; margin: 0 2px; }
.hist-datetime { color: #475569; }

.hist-divider { height: 1px; background: #131f35; margin-bottom: 14px; }

/* ─── Empty state ───────────────────────────────────────────── */
.empty-state { text-align: center; padding: 70px 0; }
.empty-icon { color: #4ade80; opacity: 0.35; display: block; margin: 0 auto 16px; }
.empty-text { color: #475569; font-size: 0.95rem; font-weight: 500; }
.empty-hint { color: #334155; font-size: 0.8rem; margin-top: 6px; }

/* ─── Lightbox ──────────────────────────────────────────────── */
.photo-dialog {
  background: #000c;
  backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%; position: relative;
}
.photo-close { position: absolute; top: 16px; right: 16px; z-index: 10; }
.photo-center { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.photo-full { max-width: 88vw; max-height: 84vh; object-fit: contain; border-radius: 14px; box-shadow: 0 0 80px #000a; }
.photo-counter {
  color: #94a3b8; font-size: 0.82rem;
  background: #0d1829cc;
  border: 1px solid #1a2d4a;
  padding: 4px 16px; border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
.photo-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: #0d1829bb !important;
  border: 1px solid #1a2d4a !important;
  border-radius: 50% !important;
  transition: background 0.2s, transform 0.2s;
}
.photo-nav:hover { background: #162444bb !important; transform: translateY(-50%) scale(1.08) !important; }
.photo-nav--left  { left: 20px; }
.photo-nav--right { right: 20px; }

/* ─── Aba Resumo ────────────────────────────────────────────── */
.resumo-wrap {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.resumo-donut-card {
  background: #0d1829;
  border: 1px solid #1a2d4a;
  border-radius: 24px;
  padding: 36px 48px;
  width: 100%;
  max-width: 780px;
  animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;
}

.resumo-donut-header {
  margin-bottom: 36px;
  display: flex; align-items: baseline; justify-content: space-between;
}
.resumo-eyebrow {
  font-size: 0.72rem; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #3b82f6;
}
.resumo-date { font-size: 0.82rem; color: #334155; }

.resumo-body {
  display: flex; align-items: center; gap: 56px;
}

.resumo-chart-wrap { flex-shrink: 0; }

.donut-svg-lg {
  width: 200px; height: 200px;
  display: block;
  filter: drop-shadow(0 8px 32px #00000050);
}

.resumo-legend-col {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 22px;
}

.resumo-legend-item { display: flex; flex-direction: column; gap: 6px; }

.resumo-item-top {
  display: flex; align-items: center; gap: 10px;
}
.resumo-dot {
  width: 12px; height: 12px;
  border-radius: 4px; flex-shrink: 0;
}
.resumo-item-label {
  flex: 1;
  font-size: 0.9rem; font-weight: 600; color: #94a3b8;
}
.resumo-item-pct {
  font-size: 1.4rem; font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.resumo-item-count {
  font-size: 0.75rem; color: #334155;
  padding-left: 22px;
}
.resumo-bar-track {
  height: 6px;
  background: #1a2d4a;
  border-radius: 999px;
  overflow: hidden;
}
.resumo-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
  opacity: 0.9;
}

/* ─── Reduced motion ────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .group-card, .val-eyebrow, .val-title, .val-sub,
  .kpi-tile, .svc-card { animation: none; }
  .group-card, .group-icon-wrap, .card-top-bar,
  .foto-thumb, .photo-nav { transition: none; }
}
</style>
