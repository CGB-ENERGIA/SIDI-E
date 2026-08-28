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
      <div class="flex items-center q-mb-lg gap-3">
        <q-btn flat round icon="arrow_back" @click="selectedGroup = null" />
        <div>
          <div class="val-title">Validação — {{ selectedGroup }}</div>
          <div class="val-sub">Revise e valide os serviços registrados</div>
        </div>
        <q-space />
        <q-input v-model="filterDate" type="date" outlined dense label="Data"
          bg-color="surface" style="min-width:170px;" clearable
          @update:model-value="loadServices" />
        <q-btn unelevated icon="refresh" label="Atualizar" color="primary"
          :loading="loading" @click="loadServices" style="height:40px;border-radius:8px;" />
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
              @click="openPhoto(foto)"
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

    <!-- Lightbox de foto -->
    <q-dialog v-model="showPhoto" maximized>
      <div class="photo-dialog" @click="showPhoto = false">
        <q-btn flat round icon="close" color="white" class="photo-close" @click.stop="showPhoto = false" />
        <img :src="currentPhotoUrl" class="photo-full" @click.stop />
      </div>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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

const selectedGroup = ref(null)
const filterDate    = ref(new Date().toISOString().split('T')[0])
const filterStatus  = ref(null)
const loading       = ref(false)
const loadingCounts = ref(false)
const savingId      = ref(null)
const editingObs    = ref(null)
const obsText       = ref('')
const services      = ref([])
const counts        = ref({})
const showPhoto     = ref(false)
const currentPhotoUrl = ref('')

// ── KPIs ────────────────────────────────────────────────
const kpis = computed(() => [
  { label: 'ANALISADAS',  value: null,         icon: 'analytics',     color: '#60a5fa', count: services.value.length },
  { label: 'PENDENTES',   value: 'pendente',   icon: 'hourglass_top', color: '#f59e0b', count: services.value.filter(s => !s.validation_status || s.validation_status === 'pendente').length },
  { label: 'APROVADAS',   value: 'aprovada',   icon: 'check_circle',  color: '#4ade80', count: services.value.filter(s => s.validation_status === 'aprovada').length },
  { label: 'REPROVADAS',  value: 'reprovada',  icon: 'cancel',        color: '#f87171', count: services.value.filter(s => s.validation_status === 'reprovada').length }
])

const filteredServices = computed(() => {
  if (!filterStatus.value) return services.value
  if (filterStatus.value === 'pendente')
    return services.value.filter(s => !s.validation_status || s.validation_status === 'pendente')
  return services.value.filter(s => s.validation_status === filterStatus.value)
})

// ── Selecionar grupo ─────────────────────────────────────
async function selectGroup (g) {
  selectedGroup.value = g
  filterStatus.value = null
  await loadServices()
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
      .select('id, team_id, activity_name, colaboradores, created_at, validation_status, validation_obs, validated_at, validated_by, evidence_photos(*), teams!inner(prefixo, nome, supervisor, processo)')
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
    const { data } = storage.getPublicUrl('evidencias', filePath)
    return data?.publicUrl || ''
  } catch { return '' }
}

function openPhoto (foto) {
  currentPhotoUrl.value = photoUrl(foto.file_path)
  showPhoto.value = true
}

// ── Utils ─────────────────────────────────────────────────
function formatDate (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function statusLabel (s) {
  const map = { aprovada: 'Aprovada', reprovada: 'Reprovada', pendente: 'Pendente' }
  return map[s] || 'Pendente'
}

function statusColor (s) {
  const map = { aprovada: 'positive', reprovada: 'negative', pendente: 'warning' }
  return map[s] || 'warning'
}

onMounted(loadCounts)
</script>

<style scoped>
.val-page { background: var(--bg-page, #0f1729); min-height: 100vh; }
.val-title { font-size: 1.6rem; font-weight: 700; color: #e2e8f0; }
.val-sub   { font-size: 0.9rem; color: #64748b; margin-top: 2px; }

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

/* Empty */
.empty-state { text-align: center; padding: 60px 0; color: #64748b; }

/* Lightbox */
.photo-dialog {
  background: #000d; display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%; position: relative;
}
.photo-close { position: absolute; top: 16px; right: 16px; }
.photo-full { max-width: 95vw; max-height: 90vh; object-fit: contain; border-radius: 12px; }
</style>
