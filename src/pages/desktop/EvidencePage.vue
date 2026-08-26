<template>
  <q-page class="q-pa-lg">
    <div class="flex items-center justify-between q-mb-lg">
      <div class="text-h5 text-weight-bold">Evidências</div>
      <q-btn outline rounded color="primary" icon="refresh" label="Atualizar" :loading="loading" @click="load" />
    </div>

    <!-- Filtros -->
    <div class="row q-gutter-md q-mb-lg">
      <q-select
        v-model="filters.teamId"
        :options="teamOptions"
        label="Todas as equipes"
        outlined dense clearable emit-value map-options
        style="min-width: 220px;"
        @update:model-value="load"
      />
      <q-input
        v-model="filters.date"
        type="date" label="Todas as datas" outlined dense clearable
        style="min-width: 190px;"
        @update:model-value="load"
      />
      <q-select
        v-model="filters.status"
        :options="statusOptions"
        label="Status sync" outlined dense clearable emit-value map-options
        style="min-width: 160px;"
      />
      <q-select
        v-model="filters.supervisor"
        :options="supervisoresList"
        label="Supervisor" outlined dense clearable
        style="min-width: 180px;"
      />
      <q-select
        v-model="filters.coordenador"
        :options="coordenadoresList"
        label="Coordenador" outlined dense clearable
        style="min-width: 160px;"
      />
    </div>

    <q-card flat bordered style="border-radius: 16px;">
      <q-table
        :rows="groupedRows"
        :columns="columns"
        row-key="key"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 20 }"
        class="clickable-rows"
        @row-click="(_, row) => openDetail(row)"
      >
        <template #body-cell-equipe="{ row }">
          <q-td>
            <q-chip dense color="primary" text-color="white">
              {{ row.prefixo }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-atividades="{ row }">
          <q-td>
            <span v-if="row.atividadeNomes.length">
              {{ row.atividadeNomes.join(' · ') }}
            </span>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <template #body-cell-fotos="{ row }">
          <q-td>
            <div class="flex items-center gap-xs">
              <q-icon name="photo_library" size="16px" color="grey-6" />
              <span>{{ row.totalFotos }}</span>
              <q-badge v-if="row.epiTotal" color="teal" :label="`${row.epiTotal} EPI`" class="q-ml-xs" />
              <q-badge v-if="row.atividadeTotal" color="blue" :label="`${row.atividadeTotal} Ativ.`" class="q-ml-xs" />
            </div>
          </q-td>
        </template>

        <template #body-cell-servicos="{ row }">
          <q-td>
            <q-badge color="grey-7" :label="`${row.servicos.length} serviço${row.servicos.length !== 1 ? 's' : ''}`" />
          </q-td>
        </template>

        <template #body-cell-status="{ row }">
          <q-td>
            <q-badge
              :color="row.allSynced ? 'positive' : 'orange'"
              :label="row.allSynced ? 'Sincronizado' : 'Pendente'"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="{ row }">
          <q-td class="text-right" @click.stop>
            <q-btn flat round dense icon="visibility" color="primary" @click="openDetail(row)">
              <q-tooltip>Ver detalhes</q-tooltip>
            </q-btn>
            <q-btn
              v-if="authStore.isAdmin"
              flat round dense icon="delete"
              color="negative"
              @click="confirmDeleteGroup(row)"
            >
              <q-tooltip>Excluir todos os registros do dia</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog de detalhe do grupo -->
    <q-dialog v-model="showDetail" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="detail-card" v-if="selected">
        <q-bar class="bg-primary text-white q-py-sm">
          <q-icon name="photo_library" class="q-mr-sm" />
          <span class="text-weight-bold">
            {{ selected.prefixo }} · {{ selected.nomeEquipe }} · {{ formatDateStr(selected.dateStr) }}
          </span>
          <q-space />
          <q-btn
            v-if="authStore.isAdmin"
            dense flat icon="delete" color="negative"
            class="q-mr-sm"
            @click="confirmDeleteGroup(selected)"
          >
            <q-tooltip>Excluir todos os registros do dia</q-tooltip>
          </q-btn>
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>

        <q-card-section class="q-pa-lg">
          <div class="row q-col-gutter-lg">

            <!-- Painel esquerdo: resumo -->
            <div class="col-12 col-md-3">
              <q-list bordered separator style="border-radius: 12px;" class="q-mb-md">
                <q-item>
                  <q-item-section avatar><q-icon name="groups" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Equipe</q-item-label>
                    <q-item-label class="text-weight-bold">{{ selected.prefixo }}</q-item-label>
                    <q-item-label caption>{{ selected.nomeEquipe }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar><q-icon name="today" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Data</q-item-label>
                    <q-item-label>{{ formatDateStr(selected.dateStr) }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar><q-icon name="task" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Atividades</q-item-label>
                    <div class="q-mt-xs">
                      <q-chip
                        v-for="nome in selected.atividadeNomes" :key="nome"
                        dense size="sm" color="blue-grey-8" text-color="white"
                        class="q-mb-xs"
                      >{{ nome }}</q-chip>
                      <span v-if="!selected.atividadeNomes.length" class="text-grey-5">—</span>
                    </div>
                  </q-item-section>
                </q-item>

                <q-item v-if="selected.allColaboradores.length">
                  <q-item-section avatar><q-icon name="people" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Colaboradores</q-item-label>
                    <div class="q-mt-xs">
                      <q-chip
                        v-for="nome in selected.allColaboradores" :key="nome"
                        dense size="sm" color="primary" text-color="white" icon="person"
                        class="q-mb-xs"
                      >{{ nome }}</q-chip>
                    </div>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar><q-icon name="photo_library" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Total de fotos</q-item-label>
                    <div class="flex items-center q-gutter-xs q-mt-xs">
                      <q-badge color="teal" :label="`${selected.epiTotal} EPI`" />
                      <q-badge color="blue" :label="`${selected.atividadeTotal} Ativ.`" />
                    </div>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar><q-icon name="sync" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Status</q-item-label>
                    <q-badge
                      :color="selected.allSynced ? 'positive' : 'orange'"
                      :label="selected.allSynced ? 'Sincronizado' : 'Pendente'"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Painel direito: serviços com fotos -->
            <div class="col-12 col-md-9">
              <div
                v-for="svc in selected.servicos"
                :key="svc.id"
                class="svc-block q-mb-xl"
              >
                <!-- Cabeçalho do serviço -->
                <div class="svc-header q-mb-md">
                  <div class="flex items-center q-gutter-sm">
                    <q-chip dense color="blue-grey-8" text-color="white" icon="schedule" size="sm">
                      {{ formatTime(svc.created_at) }}
                    </q-chip>
                    <span class="text-weight-bold">{{ svc.activity_name || '—' }}</span>
                    <q-btn
                      v-if="authStore.isAdmin"
                      flat round dense icon="delete" color="negative" size="sm"
                      @click="confirmDeleteSingle(svc)"
                    >
                      <q-tooltip>Excluir este serviço</q-tooltip>
                    </q-btn>
                  </div>
                  <div v-if="svc.descricao" class="text-caption text-grey-5 q-mt-xs">{{ svc.descricao }}</div>
                </div>

                <!-- Fotos EPI do serviço -->
                <div v-if="epiPhotos(svc).length" class="q-mb-md">
                  <div class="text-caption text-teal text-weight-bold q-mb-sm">
                    <q-icon name="safety_check" /> EPI ({{ epiPhotos(svc).length }})
                  </div>
                  <div class="photo-grid">
                    <div
                      v-for="photo in epiPhotos(svc)"
                      :key="photo.id"
                      class="photo-item cursor-pointer"
                      @click="openLightbox(photo)"
                    >
                      <img :src="getPhotoUrl(photo)" class="photo-thumb" />
                      <div class="photo-overlay"><q-icon name="zoom_in" size="32px" color="white" /></div>
                    </div>
                  </div>
                </div>

                <!-- Fotos Atividade do serviço -->
                <div v-if="atividadePhotos(svc).length">
                  <div class="text-caption text-blue text-weight-bold q-mb-sm">
                    <q-icon name="task" /> Atividade ({{ atividadePhotos(svc).length }})
                  </div>
                  <div class="photo-grid">
                    <div
                      v-for="photo in atividadePhotos(svc)"
                      :key="photo.id"
                      class="photo-item cursor-pointer"
                      @click="openLightbox(photo)"
                    >
                      <img :src="getPhotoUrl(photo)" class="photo-thumb" />
                      <div class="photo-overlay"><q-icon name="zoom_in" size="32px" color="white" /></div>
                    </div>
                  </div>
                </div>

                <div v-if="!epiPhotos(svc).length && !atividadePhotos(svc).length" class="text-grey-5 text-caption">
                  Nenhuma foto neste serviço.
                </div>

                <q-separator class="q-mt-lg" v-if="selected.servicos.indexOf(svc) < selected.servicos.length - 1" />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Lightbox -->
    <q-dialog v-model="showLightbox" seamless>
      <div class="lightbox-wrap" @click.self="showLightbox = false">
        <q-card class="lightbox-card">
          <q-bar dark class="bg-black">
            <q-badge
              :color="lightboxPhoto?.tipo === 'epi' ? 'teal' : 'blue'"
              :label="lightboxPhoto?.tipo === 'epi' ? 'EPI' : 'Atividade'"
            />
            <q-space />
            <q-btn dense flat icon="close" color="white" @click="showLightbox = false" />
          </q-bar>
          <img :src="lightboxUrl" class="lightbox-img" />
        </q-card>
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useEvidenceStore } from 'src/stores/evidence'
import { useTeamsStore } from 'src/stores/teams'
import { useAuthStore } from 'src/stores/auth'
import { storage } from 'src/services/supabase'
import { EQUIPES_FILTRO, SUPERVISORES, COORDENADORES } from 'src/data/equipes-filtro'

const evidenceStore = useEvidenceStore()
const teamsStore = useTeamsStore()
const authStore = useAuthStore()
const $q = useQuasar()

const loading = ref(false)
const rows = ref([])
const showDetail = ref(false)
const selected = ref(null)
const showLightbox = ref(false)
const lightboxPhoto = ref(null)
const lightboxUrl = ref('')

const filters = ref({
  teamId: null,
  date: null,
  status: null,
  supervisor: null,
  coordenador: null
})

const supervisoresList = computed(() => {
  const s = new Set(teamsStore.teams.map(t => t.supervisor).filter(Boolean))
  return [...s].sort()
})
const coordenadoresList = COORDENADORES

const statusOptions = [
  { label: 'Sincronizado', value: 'synced' },
  { label: 'Pendente', value: 'pending' }
]

const teamOptions = computed(() =>
  teamsStore.teams.map(t => ({ label: `${t.prefixo} — ${t.nome}`, value: t.id }))
)

// Filtra linhas individualmente antes de agrupar
const filteredRows = computed(() => {
  return rows.value.filter(r => {
    if (filters.value.status && r.sync_status !== filters.value.status) return false
    const prefixo = r.teams?.prefixo
    if (filters.value.supervisor && r.teams?.supervisor !== filters.value.supervisor) return false
    if (filters.value.coordenador && EQUIPES_FILTRO[prefixo]?.coordenador !== filters.value.coordenador) return false
    return true
  })
})

// Agrupa por equipe + dia
const groupedRows = computed(() => {
  const map = {}
  for (const svc of filteredRows.value) {
    const dateStr = (svc.created_at || '').split('T')[0]
    const key = `${svc.team_id}_${dateStr}`
    if (!map[key]) {
      map[key] = {
        key,
        team_id: svc.team_id,
        prefixo: svc.teams?.prefixo || '—',
        nomeEquipe: svc.teams?.nome || '',
        dateStr,
        servicos: [],
        atividadeNomes: [],
        allColaboradores: [],
        totalFotos: 0,
        epiTotal: 0,
        atividadeTotal: 0,
        allSynced: true
      }
    }
    const g = map[key]
    g.servicos.push(svc)
    if (svc.activity_name && !g.atividadeNomes.includes(svc.activity_name))
      g.atividadeNomes.push(svc.activity_name)
    for (const c of (svc.colaboradores || []))
      if (!g.allColaboradores.includes(c)) g.allColaboradores.push(c)
    const fotos = svc.evidence_photos || []
    g.totalFotos += fotos.length
    g.epiTotal += fotos.filter(p => p.tipo === 'epi').length
    g.atividadeTotal += fotos.filter(p => p.tipo === 'atividade').length
    if (svc.sync_status !== 'synced') g.allSynced = false
  }
  return Object.values(map).sort((a, b) => b.dateStr.localeCompare(a.dateStr) || a.prefixo.localeCompare(b.prefixo))
})

const columns = [
  { name: 'equipe',     label: 'Equipe',     field: 'prefixo',   align: 'left',   sortable: true },
  { name: 'atividades', label: 'Atividades', field: 'atividades', align: 'left' },
  { name: 'servicos',   label: 'Serviços',   field: 'servicos',   align: 'left' },
  { name: 'fotos',      label: 'Fotos',      field: 'totalFotos', align: 'left' },
  { name: 'created',    label: 'Data',       field: r => formatDateStr(r.dateStr), align: 'left', sortable: true },
  { name: 'status',     label: 'Status',     field: 'status',     align: 'center' },
  { name: 'acoes',      label: '',           field: 'acoes',      align: 'right' }
]

onMounted(async () => {
  await teamsStore.fetchTeams()
  await load()
})

async function load () {
  loading.value = true
  try {
    rows.value = await evidenceStore.fetchEvidences({
      teamId: filters.value.teamId || undefined,
      date: filters.value.date || undefined
    }) || []
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function epiPhotos (svc) {
  return (svc.evidence_photos || []).filter(p => p.tipo === 'epi')
}

function atividadePhotos (svc) {
  return (svc.evidence_photos || []).filter(p => p.tipo === 'atividade')
}

function openDetail (group) {
  selected.value = group
  showDetail.value = true
}

function confirmDeleteGroup (group) {
  if (!authStore.isAdmin) {
    $q.notify({ type: 'negative', message: 'Sem permissão para excluir.' })
    return
  }
  $q.dialog({
    title: 'Excluir registros do dia',
    message: `Excluir <strong>${group.servicos.length} serviço(s)</strong> de <strong>${group.prefixo}</strong> em ${formatDateStr(group.dateStr)} e todas as fotos?`,
    html: true,
    cancel: true,
    ok: { label: 'Excluir tudo', color: 'negative', unelevated: true }
  }).onOk(async () => {
    try {
      for (const svc of group.servicos) {
        await evidenceStore.deleteService(svc.id)
        rows.value = rows.value.filter(r => r.id !== svc.id)
      }
      showDetail.value = false
      selected.value = null
      $q.notify({ type: 'positive', message: 'Registros excluídos.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro ao excluir: ' + (e.message || e) })
    }
  })
}

function confirmDeleteSingle (svc) {
  if (!authStore.isAdmin) return
  $q.dialog({
    title: 'Excluir serviço',
    message: `Excluir o serviço de <strong>${svc.activity_name || 'sem atividade'}</strong> registrado às ${formatTime(svc.created_at)}?`,
    html: true,
    cancel: true,
    ok: { label: 'Excluir', color: 'negative', unelevated: true }
  }).onOk(async () => {
    try {
      await evidenceStore.deleteService(svc.id)
      rows.value = rows.value.filter(r => r.id !== svc.id)
      // Atualiza o grupo selecionado removendo o serviço
      if (selected.value) {
        selected.value = { ...selected.value, servicos: selected.value.servicos.filter(s => s.id !== svc.id) }
        if (selected.value.servicos.length === 0) {
          showDetail.value = false
          selected.value = null
        }
      }
      $q.notify({ type: 'positive', message: 'Serviço excluído.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro ao excluir: ' + (e.message || e) })
    }
  })
}

function openLightbox (photo) {
  lightboxPhoto.value = photo
  lightboxUrl.value = getPhotoUrl(photo)
  showLightbox.value = true
}

function getPhotoUrl (photo) {
  if (photo.public_url) return photo.public_url
  if (photo.file_path) return storage.getPublicUrl('evidencias', photo.file_path)
  return ''
}

function formatDateStr (dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function formatTime (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
:deep(.clickable-rows tbody tr) {
  cursor: pointer;
  transition: background 0.15s;
}
:deep(.clickable-rows tbody tr:hover) {
  background: rgba(var(--q-primary-rgb, 25, 118, 210), 0.08) !important;
}

.svc-block {
  padding: 0;
}

.svc-header {
  border-left: 3px solid var(--q-primary, #1E88E5);
  padding-left: 12px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}

.photo-item {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1;
  background: #111;
}

.photo-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s;
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.photo-item:hover .photo-thumb  { transform: scale(1.04); }
.photo-item:hover .photo-overlay { opacity: 1; }

.lightbox-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-width: 100vw;
  background: rgba(0, 0, 0, 0.85);
}

.lightbox-card {
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  max-width: 92vw;
}

.lightbox-img {
  display: block;
  max-width: 88vw;
  max-height: 82vh;
  object-fit: contain;
}

.detail-card {
  display: flex;
  flex-direction: column;
  overflow: auto;
}
</style>
