<template>
  <q-page class="val-page q-pa-lg">

    <!-- ══ TELA 1: Seleção de grupo ══ -->
    <template v-if="!selectedGroup">
      <div class="val-header q-mb-xl">
        <div class="val-title">Validação</div>
        <div class="val-sub">Selecione o grupo para validar os serviços</div>
      </div>

      <div class="group-grid">
        <div
          v-for="g in grupos"
          :key="g.key"
          class="group-card"
          :class="`group-card--${g.key.toLowerCase()}`"
          @click="selectGroup(g.key)"
        >
          <div class="group-icon"><q-icon :name="g.icon" size="48px" /></div>
          <div class="group-name">{{ g.key }}</div>
          <div class="group-desc">{{ g.desc }}</div>
          <div class="group-badges">
            <span class="gbadge gbadge--pending">
              <q-spinner-dots v-if="loadingCounts" size="12px" />
              <template v-else>{{ counts[g.key]?.pendente ?? 0 }} pendentes</template>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ TELA 2: Validação do grupo ══ -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center q-mb-md gap-3">
        <q-btn flat round icon="arrow_back" @click="selectedGroup = null" />
        <div>
          <div class="val-title">{{ selectedGroup }}</div>
          <div class="val-sub">{{ activeTab === 'historico' ? 'Histórico de validações' : 'Revise e valide os serviços registrados' }}</div>
        </div>
        <q-space />

        <!-- Controles da aba Validação -->
        <template v-if="activeTab === 'validacao'">
          <q-input v-model="filterDate" type="date" outlined dense label="Data"
            bg-color="surface" style="min-width:170px;" clearable
            @update:model-value="loadServices" />
          <q-btn unelevated icon="refresh" label="Atualizar" color="primary"
            :loading="loading" @click="loadServices" style="height:40px;border-radius:8px;" />
        </template>

        <!-- Controles da aba Histórico -->
        <template v-else>
          <q-input v-model="histFilterStart" type="date" outlined dense label="De"
            bg-color="surface" style="min-width:150px;" clearable />
          <q-input v-model="histFilterEnd" type="date" outlined dense label="Até"
            bg-color="surface" style="min-width:150px;" clearable />
          <q-btn unelevated icon="refresh" label="Atualizar" color="primary"
            :loading="loadingHistory" @click="loadHistory" style="height:40px;border-radius:8px;" />
        </template>
      </div>

      <!-- Abas -->
      <div class="tab-bar q-mb-lg">
        <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'validacao' }"
          @click="switchTab('validacao')">
          <q-icon name="verified" size="18px" class="q-mr-xs" />Validação
        </button>
        <button class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'historico' }"
          @click="switchTab('historico')">
          <q-icon name="history" size="18px" class="q-mr-xs" />Histórico
        </button>
      </div>

      <!-- ══ ABA: VALIDAÇÃO ══ -->
      <template v-if="activeTab === 'validacao'">
        <!-- Barra de filtros -->
        <div class="filter-bar q-mb-lg">
          <div class="search-wrap">
            <q-icon name="search" size="18px" style="color:#4b5680" />
            <input v-model="search" class="search-input" placeholder="Buscar equipe, atividade, colaborador…" />
          </div>
          <q-select v-model="filterSupervisor" :options="supervisoresList" label="Supervisor"
            outlined dense clearable bg-color="surface" style="min-width:180px;" />
          <q-select v-model="filterResponsavel" :options="responsaveisList" label="Responsável"
            outlined dense clearable bg-color="surface" style="min-width:180px;" />
          <q-btn v-if="search || filterSupervisor || filterResponsavel"
            flat icon="close" label="Limpar" size="sm" no-caps color="grey"
            @click="search = ''; filterSupervisor = null; filterResponsavel = null" />
        </div>

        <!-- KPIs -->
        <div class="kpi-row q-mb-xl">
          <div class="kpi-tile" v-for="k in kpis" :key="k.label"
            :class="{ 'kpi-active': filterStatus === k.value }"
            @click="filterStatus = filterStatus === k.value ? null : k.value"
            style="cursor:pointer;">
            <div class="kpi-icon" :style="`background:${k.color}22;color:${k.color}`">
              <q-icon :name="k.icon" size="22px" />
            </div>
            <div class="kpi-body">
              <div class="kpi-value">{{ k.count }}</div>
              <div class="kpi-label">{{ k.label }}</div>
            </div>
          </div>
        </div>

        <!-- Lista de serviços -->
        <div v-if="loading" class="flex justify-center q-pa-xl">
          <q-spinner-dots size="48px" color="primary" />
        </div>

        <div v-else-if="filteredServices.length === 0" class="empty-state">
          <q-icon name="verified" size="64px" style="color:#4ade80;opacity:.5" />
          <div class="q-mt-md text-grey-6">Nenhum serviço {{ filterStatus ? 'neste status' : 'encontrado' }}</div>
        </div>

        <div v-else class="svc-list">
          <div
            v-for="svc in filteredServices"
            :key="svc.id"
            class="svc-card"
            :class="`svc-card--${svc.validation_status || 'pendente'}`"
          >
            <!-- Card header -->
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

            <!-- Atividade + colaboradores -->
            <div class="svc-info">
              <q-chip dense color="blue-grey-8" text-color="white" size="sm" icon="build">
                {{ svc.activity_name || 'Sem atividade' }}
              </q-chip>
              <span v-if="svc.colaboradores?.length" class="svc-colab">
                <q-icon name="people" size="14px" /> {{ svc.colaboradores.join(', ') }}
              </span>
            </div>

            <!-- Fotos -->
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
              <q-icon name="no_photography" size="20px" class="q-mr-xs" /> Sem fotos registradas
            </div>

            <!-- Observação (reprovar) -->
            <div v-if="editingObs === svc.id" class="obs-area">
              <q-input
                v-model="obsText"
                outlined dense
                label="Motivo da reprovação"
                autogrow
                bg-color="surface"
              />
            </div>

            <div v-if="svc.validation_obs" class="val-obs">
              <q-icon name="info" size="14px" class="q-mr-xs" />{{ svc.validation_obs }}
            </div>

            <!-- Ações -->
            <div class="svc-actions">
              <template v-if="svc.validation_status === 'pendente' || !svc.validation_status">
                <q-btn unelevated color="positive" icon="check_circle" label="Aprovar"
                  size="sm" no-caps @click="aprovar(svc)" :loading="savingId === svc.id" />
                <q-btn v-if="editingObs !== svc.id"
                  unelevated color="negative" icon="cancel" label="Reprovar"
                  size="sm" no-caps @click="iniciarReprovar(svc)" />
                <template v-else>
                  <q-btn unelevated color="negative" icon="send" label="Confirmar reprovação"
                    size="sm" no-caps @click="reprovar(svc)" :loading="savingId === svc.id" />
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

      <!-- ══ ABA: HISTÓRICO ══ -->
      <template v-else>
        <!-- Filtro de status no histórico -->
        <div class="filter-bar q-mb-lg">
          <div class="search-wrap">
            <q-icon name="search" size="18px" style="color:#4b5680" />
            <input v-model="histSearch" class="search-input" placeholder="Buscar equipe, atividade, validador…" />
          </div>
          <q-select v-model="histFilterStatus" label="Status"
            :options="[{label:'Aprovadas', value:'aprovada'},{label:'Reprovadas', value:'reprovada'}]"
            option-value="value" option-label="label" emit-value map-options
            outlined dense clearable bg-color="surface" style="min-width:160px;" />
          <q-btn v-if="histSearch || histFilterStatus"
            flat icon="close" label="Limpar" size="sm" no-caps color="grey"
            @click="histSearch = ''; histFilterStatus = null" />
          <div class="q-ml-auto text-caption" style="color:#64748b">
            {{ filteredHistory.length }} registro{{ filteredHistory.length !== 1 ? 's' : '' }}
          </div>
        </div>

        <!-- Loading histórico -->
        <div v-if="loadingHistory" class="flex justify-center q-pa-xl">
          <q-spinner-dots size="48px" color="primary" />
        </div>

        <div v-else-if="filteredHistory.length === 0" class="empty-state">
          <q-icon name="history" size="64px" style="color:#60a5fa;opacity:.4" />
          <div class="q-mt-md text-grey-6">Nenhum registro de validação encontrado</div>
          <div class="q-mt-xs text-caption text-grey-7">Ajuste o filtro de datas ou valide alguns serviços primeiro</div>
        </div>

        <div v-else class="svc-list">
          <div
            v-for="item in filteredHistory"
            :key="item.id"
            class="svc-card hist-card"
            :class="`svc-card--${item.validation_status}`"
          >
            <!-- Linha de validação (quem + quando) -->
            <div class="hist-validator-row">
              <div class="hist-status-badge" :class="`hist-status-badge--${item.validation_status}`">
                <q-icon :name="item.validation_status === 'aprovada' ? 'check_circle' : 'cancel'" size="16px" />
                {{ item.validation_status === 'aprovada' ? 'Aprovado' : 'Reprovado' }}
              </div>
              <div class="hist-meta">
                <q-icon name="person" size="14px" class="q-mr-xs" style="color:#60a5fa" />
                <span class="hist-validator">{{ item.validated_by || 'Desconhecido' }}</span>
                <span class="hist-sep">·</span>
                <q-icon name="schedule" size="14px" class="q-mr-xs" style="color:#64748b" />
                <span class="hist-datetime">{{ formatDatetime(item.validated_at) }}</span>
              </div>
            </div>

            <!-- Separador -->
            <div class="hist-divider" />

            <!-- Card header (serviço) -->
            <div class="svc-head">
              <div class="svc-team">
                <span class="svc-prefix">{{ item.teams?.prefixo || '—' }}</span>
                <span class="svc-nome">{{ item.teams?.nome || '' }}</span>
              </div>
              <span class="svc-date">Criado em {{ formatDate(item.created_at) }}</span>
            </div>

            <!-- Atividade + colaboradores -->
            <div class="svc-info">
              <q-chip dense color="blue-grey-8" text-color="white" size="sm" icon="build">
                {{ item.activity_name || 'Sem atividade' }}
              </q-chip>
              <span v-if="item.colaboradores?.length" class="svc-colab">
                <q-icon name="people" size="14px" /> {{ item.colaboradores.join(', ') }}
              </span>
            </div>

            <!-- Fotos -->
            <div v-if="item.evidence_photos?.length" class="fotos-row">
              <div
                v-for="foto in item.evidence_photos"
                :key="foto.id"
                class="foto-thumb"
                @click="openPhoto(foto, item.evidence_photos)"
              >
                <img :src="photoUrl(foto.file_path)" :alt="foto.tipo" />
                <span class="foto-tipo">{{ foto.tipo }}</span>
              </div>
            </div>
            <div v-else class="no-fotos">
              <q-icon name="no_photography" size="20px" class="q-mr-xs" /> Sem fotos
            </div>

            <!-- Observação (se reprovado) -->
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

        <!-- Seta esquerda -->
        <q-btn v-if="currentPhotoList.length > 1"
          flat round icon="chevron_left" color="white" size="lg"
          class="photo-nav photo-nav--left"
          @click.stop="navPhoto(-1)" />

        <div class="photo-center" @click.stop>
          <img :src="currentPhotoUrl" class="photo-full" />
          <div class="photo-counter">{{ currentPhotoIndex + 1 }} / {{ currentPhotoList.length }}</div>
        </div>

        <!-- Seta direita -->
        <q-btn v-if="currentPhotoList.length > 1"
          flat round icon="chevron_right" color="white" size="lg"
          class="photo-nav photo-nav--right"
          @click.stop="navPhoto(1)" />
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

const selectedGroup    = ref(null)
const activeTab        = ref('validacao')

// ── Aba Validação ──────────────────────────────────────────
const filterDate       = ref(new Date().toISOString().split('T')[0])
const filterStatus     = ref(null)
const filterSupervisor = ref(null)
const filterResponsavel = ref(null)
const search           = ref('')
const loading          = ref(false)
const savingId         = ref(null)
const editingObs       = ref(null)
const obsText          = ref('')
const services         = ref([])

// ── Aba Histórico ──────────────────────────────────────────
const histFilterStart  = ref('')
const histFilterEnd    = ref(new Date().toISOString().split('T')[0])
const histFilterStatus = ref(null)
const histSearch       = ref('')
const loadingHistory   = ref(false)
const historyServices  = ref([])

// ── Grupos (contagens) ─────────────────────────────────────
const loadingCounts = ref(false)
const counts        = ref({})

// ── Lightbox ───────────────────────────────────────────────
const showPhoto        = ref(false)
const currentPhotoUrl  = ref('')
const currentPhotoList = ref([])
const currentPhotoIndex = ref(0)

// ── KPIs ────────────────────────────────────────────────
const kpis = computed(() => [
  { label: 'ANALISADAS',  value: 'analisadas', icon: 'analytics',     color: '#60a5fa', count: services.value.filter(s => s.validation_status === 'aprovada' || s.validation_status === 'reprovada').length },
  { label: 'PENDENTES',   value: 'pendente',   icon: 'hourglass_top', color: '#f59e0b', count: services.value.filter(s => !s.validation_status || s.validation_status === 'pendente').length },
  { label: 'APROVADAS',   value: 'aprovada',   icon: 'check_circle',  color: '#4ade80', count: services.value.filter(s => s.validation_status === 'aprovada').length },
  { label: 'REPROVADAS',  value: 'reprovada',  icon: 'cancel',        color: '#f87171', count: services.value.filter(s => s.validation_status === 'reprovada').length }
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
  if (v === 'pendente')
    list = list.filter(s => !s.validation_status || s.validation_status === 'pendente')
  else if (v === 'analisadas')
    list = list.filter(s => s.validation_status === 'aprovada' || s.validation_status === 'reprovada')
  else if (v)
    list = list.filter(s => s.validation_status === v)

  if (filterSupervisor.value)
    list = list.filter(s => s.teams?.supervisor === filterSupervisor.value)

  if (filterResponsavel.value)
    list = list.filter(s => s.teams?.responsavel === filterResponsavel.value)

  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(s =>
      (s.teams?.prefixo || '').toLowerCase().includes(q) ||
      (s.teams?.nome || '').toLowerCase().includes(q) ||
      (s.activity_name || '').toLowerCase().includes(q) ||
      (s.colaboradores || []).some(c => c.toLowerCase().includes(q))
    )
  }

  return list
})

const filteredHistory = computed(() => {
  let list = historyServices.value

  if (histFilterStatus.value)
    list = list.filter(s => s.validation_status === histFilterStatus.value)

  const q = histSearch.value.trim().toLowerCase()
  if (q) {
    list = list.filter(s =>
      (s.teams?.prefixo || '').toLowerCase().includes(q) ||
      (s.teams?.nome || '').toLowerCase().includes(q) ||
      (s.activity_name || '').toLowerCase().includes(q) ||
      (s.validated_by || '').toLowerCase().includes(q) ||
      (s.colaboradores || []).some(c => c.toLowerCase().includes(q))
    )
  }

  return list
})

// ── Selecionar grupo ─────────────────────────────────────
async function selectGroup (g) {
  selectedGroup.value = g
  activeTab.value = 'validacao'
  filterStatus.value = null
  await loadServices()
}

function switchTab (tab) {
  activeTab.value = tab
  if (tab === 'historico' && historyServices.value.length === 0) {
    loadHistory()
  }
}

// ── Carregar contagens para os cards de grupo ─────────────
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
  } catch (e) {
    console.warn('loadCounts:', e.message)
  } finally {
    loadingCounts.value = false
  }
}

// ── Carregar serviços do grupo ────────────────────────────
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
  } finally {
    loading.value = false
  }
}

// ── Carregar histórico de validações ─────────────────────
async function loadHistory () {
  loadingHistory.value = true
  try {
    let query = supabase
      .from('services')
      .select('id, team_id, activity_name, colaboradores, created_at, validation_status, validation_obs, validated_at, validated_by, evidence_photos(*), teams!inner(prefixo, nome, supervisor, responsavel, processo)')
      .eq('teams.processo', selectedGroup.value)
      .in('validation_status', ['aprovada', 'reprovada'])
      .order('validated_at', { ascending: false })

    if (histFilterStart.value) {
      query = query.gte('validated_at', histFilterStart.value + 'T00:00:00')
    }
    if (histFilterEnd.value) {
      query = query.lte('validated_at', histFilterEnd.value + 'T23:59:59')
    }

    const { data, error } = await query
    if (error) throw error
    historyServices.value = data || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar histórico: ' + e.message })
  } finally {
    loadingHistory.value = false
  }
}

// ── Aprovar ───────────────────────────────────────────────
async function aprovar (svc) {
  savingId.value = svc.id
  try {
    const { error } = await supabase.from('services').update({
      validation_status: 'aprovada',
      validation_obs: '',
      validated_at: new Date().toISOString(),
      validated_by: authStore.desktopUser?.email
    }).eq('id', svc.id)
    if (error) throw error
    svc.validation_status = 'aprovada'
    svc.validation_obs = ''
    $q.notify({ type: 'positive', message: 'Serviço aprovado!' })
    await loadCounts()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    savingId.value = null
  }
}

// ── Reprovar ─────────────────────────────────────────────
function iniciarReprovar (svc) {
  editingObs.value = svc.id
  obsText.value = svc.validation_obs || ''
}

async function reprovar (svc) {
  savingId.value = svc.id
  try {
    const { error } = await supabase.from('services').update({
      validation_status: 'reprovada',
      validation_obs: obsText.value,
      validated_at: new Date().toISOString(),
      validated_by: authStore.desktopUser?.email
    }).eq('id', svc.id)
    if (error) throw error
    svc.validation_status = 'reprovada'
    svc.validation_obs = obsText.value
    editingObs.value = null
    obsText.value = ''
    $q.notify({ type: 'negative', message: 'Serviço reprovado.' })
    await loadCounts()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    savingId.value = null
  }
}

// ── Reabrir ───────────────────────────────────────────────
async function reabrir (svc) {
  savingId.value = svc.id
  try {
    const { error } = await supabase.from('services').update({
      validation_status: 'pendente',
      validation_obs: '',
      validated_at: null,
      validated_by: null
    }).eq('id', svc.id)
    if (error) throw error
    svc.validation_status = 'pendente'
    svc.validation_obs = ''
    $q.notify({ type: 'info', message: 'Serviço reaberto para validação.' })
    await loadCounts()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    savingId.value = null
  }
}

// ── Foto ──────────────────────────────────────────────────
function photoUrl (filePath) {
  if (!filePath) return ''
  try {
    return storage.getPublicUrl('evidencias', filePath) || ''
  } catch { return '' }
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

// ── Utils ─────────────────────────────────────────────────
function formatDate (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDatetime (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function statusLabel (s) {
  const map = { aprovada: 'Aprovada', reprovada: 'Reprovada', pendente: 'Pendente' }
  return map[s] || 'Pendente'
}

function statusColor (s) {
  const map = { aprovada: 'positive', reprovada: 'negative', pendente: 'warning' }
  return map[s] || 'warning'
}

onMounted(() => {
  loadCounts()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.val-page { background: var(--bg-page, #0f1729); min-height: 100vh; }
.val-title { font-size: 1.6rem; font-weight: 700; color: #e2e8f0; }
.val-sub   { font-size: 0.9rem; color: #64748b; margin-top: 2px; }

/* ── Tabs ── */
.tab-bar {
  display: flex; gap: 4px;
  background: #1e2a45;
  border: 1.5px solid #2d3e5e;
  border-radius: 12px;
  padding: 4px;
  width: fit-content;
}
.tab-btn {
  display: flex; align-items: center;
  background: transparent; border: none; outline: none;
  color: #64748b; font-size: 0.88rem; font-weight: 600;
  padding: 8px 20px; border-radius: 8px; cursor: pointer;
  transition: background .15s, color .15s;
}
.tab-btn:hover { color: #94a3b8; background: #ffffff08; }
.tab-btn--active { background: #2563eb; color: #fff; }

/* ── Filter bar ── */
.filter-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.search-wrap {
  display: flex; align-items: center; gap: 8px;
  background: #1e2a45; border: 1.5px solid #2d3e5e;
  border-radius: 10px; padding: 0 14px; flex: 1; min-width: 220px; height: 40px;
}
.search-input {
  background: transparent; border: none; outline: none;
  color: #e2e8f0; font-size: 0.9rem; width: 100%;
}
.search-input::placeholder { color: #4b5680; }

/* ── Group cards ── */
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  max-width: 900px;
}
.group-card {
  background: #1e2a45;
  border: 1.5px solid #2d3e5e;
  border-radius: 20px;
  padding: 40px 32px;
  cursor: pointer;
  transition: transform .18s, border-color .18s, box-shadow .18s;
  text-align: center;
}
.group-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px #0008;
}
.group-card--gstc:hover  { border-color: #3b82f6; }
.group-card--goman:hover { border-color: #f59e0b; }
.group-card--gere:hover  { border-color: #4ade80; }
.group-icon { color: #60a5fa; margin-bottom: 16px; }
.group-card--goman .group-icon { color: #f59e0b; }
.group-card--gere  .group-icon { color: #4ade80; }
.group-name { font-size: 1.8rem; font-weight: 800; color: #e2e8f0; margin-bottom: 6px; }
.group-desc { font-size: 0.8rem; color: #64748b; margin-bottom: 20px; line-height: 1.4; }
.gbadge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.gbadge--pending { background: #f59e0b22; color: #f59e0b; }

/* ── KPIs ── */
.kpi-row { display: flex; gap: 16px; flex-wrap: wrap; }
.kpi-tile {
  flex: 1; min-width: 160px;
  background: #1e2a45;
  border: 1.5px solid #2d3e5e;
  border-radius: 16px;
  padding: 20px;
  display: flex; align-items: center; gap: 16px;
  transition: border-color .15s;
}
.kpi-tile.kpi-active { border-color: #3b82f6; }
.kpi-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.kpi-value { font-size: 1.8rem; font-weight: 800; color: #e2e8f0; line-height: 1; }
.kpi-label { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-top: 4px; }

/* ── Service cards ── */
.svc-list { display: flex; flex-direction: column; gap: 16px; }
.svc-card {
  background: #1e2a45;
  border: 1.5px solid #2d3e5e;
  border-radius: 16px;
  padding: 20px 24px;
  border-left: 4px solid #2d3e5e;
}
.svc-card--aprovada  { border-left-color: #4ade80; }
.svc-card--reprovada { border-left-color: #f87171; }
.svc-card--pendente  { border-left-color: #f59e0b; }

.svc-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; flex-wrap: wrap; gap: 8px;
}
.svc-team { display: flex; align-items: center; gap: 10px; }
.svc-prefix {
  background: #2563eb; color: #fff;
  border-radius: 8px; padding: 3px 10px;
  font-size: 0.8rem; font-weight: 700;
}
.svc-nome { color: #94a3b8; font-size: 0.85rem; }
.svc-date { color: #64748b; font-size: 0.8rem; }

.svc-info { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.svc-colab { color: #64748b; font-size: 0.8rem; }

/* Fotos */
.fotos-row {
  display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;
}
.foto-thumb {
  position: relative; width: 90px; height: 90px;
  border-radius: 10px; overflow: hidden; cursor: pointer;
  border: 2px solid #2d3e5e;
}
.foto-thumb img { width: 100%; height: 100%; object-fit: cover; }
.foto-tipo {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: #0008; color: #fff; font-size: 0.65rem;
  text-align: center; padding: 2px 0; text-transform: uppercase;
}
.no-fotos { color: #64748b; font-size: 0.82rem; display: flex; align-items: center; margin-bottom: 14px; }

.obs-area { margin-bottom: 12px; }
.val-obs {
  display: flex; align-items: flex-start; gap: 6px;
  background: #f8717122; color: #f87171;
  border-radius: 8px; padding: 8px 12px;
  font-size: 0.82rem; margin-bottom: 12px;
}

.svc-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* ── Histórico ── */
.hist-card { padding-top: 16px; }
.hist-validator-row {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 14px; flex-wrap: wrap;
}
.hist-status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 14px; border-radius: 999px;
  font-size: 0.82rem; font-weight: 700; flex-shrink: 0;
}
.hist-status-badge--aprovada  { background: #4ade8022; color: #4ade80; }
.hist-status-badge--reprovada { background: #f8717122; color: #f87171; }

.hist-meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.84rem; flex-wrap: wrap;
}
.hist-validator { color: #93c5fd; font-weight: 600; }
.hist-sep { color: #334155; }
.hist-datetime { color: #64748b; }

.hist-divider {
  height: 1px; background: #2d3e5e;
  margin-bottom: 14px;
}

/* Empty */
.empty-state { text-align: center; padding: 60px 0; color: #64748b; }

/* Lightbox */
.photo-dialog {
  background: #000d; display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%; position: relative;
}
.photo-close { position: absolute; top: 16px; right: 16px; z-index: 10; }
.photo-center { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.photo-full { max-width: 88vw; max-height: 85vh; object-fit: contain; border-radius: 12px; }
.photo-counter {
  color: #fff; font-size: 0.85rem; background: #0006;
  padding: 4px 14px; border-radius: 999px;
}
.photo-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: #0005 !important; border-radius: 50% !important;
}
.photo-nav--left  { left: 16px; }
.photo-nav--right { right: 16px; }
</style>
