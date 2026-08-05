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
        label="Equipe"
        outlined dense clearable emit-value map-options
        style="min-width: 200px;"
        @update:model-value="load"
      />
      <q-input
        v-model="filters.date"
        type="date" label="Data" outlined dense clearable
        style="min-width: 180px;"
        @update:model-value="load"
      />
      <q-select
        v-model="filters.status"
        :options="statusOptions"
        label="Status sync" outlined dense clearable emit-value map-options
        style="min-width: 160px;"
      />
    </div>

    <q-card flat bordered style="border-radius: 16px;">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 15 }"
        class="clickable-rows"
        @row-click="(_, row) => openDetail(row)"
      >
        <template #body-cell-equipe="{ row }">
          <q-td>
            <q-chip dense color="primary" text-color="white">
              {{ row.teams?.prefixo || '—' }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-fotos="{ row }">
          <q-td>
            <div class="flex items-center gap-xs">
              <q-icon name="photo_library" size="16px" color="grey-6" />
              <span>{{ row.evidence_photos?.length || 0 }}</span>
              <q-badge v-if="epiCount(row)" color="teal" :label="`${epiCount(row)} EPI`" class="q-ml-xs" />
              <q-badge v-if="atividadeCount(row)" color="blue" :label="`${atividadeCount(row)} Ativ.`" class="q-ml-xs" />
            </div>
          </q-td>
        </template>

        <template #body-cell-status="{ row }">
          <q-td>
            <q-badge
              :color="row.sync_status === 'synced' ? 'positive' : 'orange'"
              :label="row.sync_status === 'synced' ? 'Sincronizado' : 'Pendente'"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="{ row }">
          <q-td class="text-right">
            <q-btn flat round dense icon="visibility" color="primary" @click.stop="openDetail(row)">
              <q-tooltip>Ver detalhes</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog de detalhe -->
    <q-dialog v-model="showDetail" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="detail-card">
        <q-bar class="bg-primary text-white q-py-sm">
          <q-icon name="photo_library" class="q-mr-sm" />
          <span class="text-weight-bold">
            {{ selected?.teams?.prefixo }} · {{ selected?.activity_name || '—' }} · {{ formatDate(selected?.created_at) }}
          </span>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>

        <q-card-section v-if="selected" class="q-pa-lg">
          <div class="row q-col-gutter-lg">

            <!-- Info lateral -->
            <div class="col-12 col-md-4">
              <q-list bordered separator style="border-radius: 12px;" class="q-mb-md">
                <q-item>
                  <q-item-section avatar><q-icon name="groups" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Equipe</q-item-label>
                    <q-item-label class="text-weight-bold">{{ selected.teams?.prefixo }}</q-item-label>
                    <q-item-label caption>{{ selected.teams?.nome }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar><q-icon name="task" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Atividade</q-item-label>
                    <q-item-label>{{ selected.activity_name || selected.activity_id || '—' }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selected.colaboradores?.length">
                  <q-item-section avatar><q-icon name="people" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Colaboradores</q-item-label>
                    <div class="q-mt-xs">
                      <q-chip
                        v-for="nome in selected.colaboradores"
                        :key="nome"
                        dense
                        color="primary"
                        text-color="white"
                        icon="person"
                        size="sm"
                        class="q-mb-xs"
                      >{{ nome }}</q-chip>
                    </div>
                  </q-item-section>
                </q-item>

                <q-item v-if="selected.descricao">
                  <q-item-section avatar><q-icon name="notes" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Observações</q-item-label>
                    <q-item-label>{{ selected.descricao }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar><q-icon name="schedule" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Registrado em</q-item-label>
                    <q-item-label>{{ formatDateTime(selected.created_at) }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar><q-icon name="sync" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Status</q-item-label>
                    <q-badge
                      :color="selected.sync_status === 'synced' ? 'positive' : 'orange'"
                      :label="selected.sync_status === 'synced' ? 'Sincronizado' : 'Pendente'"
                    />
                  </q-item-section>
                </q-item>
              </q-list>

              <div class="text-caption text-grey-5 q-px-xs">
                {{ selected.evidence_photos?.length || 0 }} foto(s) —
                {{ epiCount(selected) }} EPI · {{ atividadeCount(selected) }} atividade
              </div>
            </div>

            <!-- Fotos -->
            <div class="col-12 col-md-8">
              <div class="text-subtitle1 text-weight-bold q-mb-md flex items-center gap-sm">
                <q-icon name="photo_library" color="primary" />
                Fotos do registro
              </div>

              <div v-if="selected.evidence_photos?.length">
                <!-- Fotos EPI -->
                <div v-if="epiCount(selected)" class="q-mb-md">
                  <div class="text-caption text-teal text-weight-bold q-mb-sm">
                    <q-icon name="safety_check" /> EPI ({{ epiCount(selected) }})
                  </div>
                  <div class="photo-grid">
                    <div
                      v-for="photo in epiPhotos(selected)"
                      :key="photo.id"
                      class="photo-item cursor-pointer"
                      @click="openLightbox(photo)"
                    >
                      <img :src="getPhotoUrl(photo)" class="photo-thumb" />
                      <div class="photo-overlay">
                        <q-icon name="zoom_in" size="32px" color="white" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Fotos Atividade -->
                <div v-if="atividadeCount(selected)">
                  <div class="text-caption text-blue text-weight-bold q-mb-sm">
                    <q-icon name="task" /> Atividade ({{ atividadeCount(selected) }})
                  </div>
                  <div class="photo-grid">
                    <div
                      v-for="photo in atividadePhotos(selected)"
                      :key="photo.id"
                      class="photo-item cursor-pointer"
                      @click="openLightbox(photo)"
                    >
                      <img :src="getPhotoUrl(photo)" class="photo-thumb" />
                      <div class="photo-overlay">
                        <q-icon name="zoom_in" size="32px" color="white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="text-grey text-center q-py-xl">
                <q-icon name="no_photography" size="48px" />
                <div class="q-mt-sm">Nenhuma foto registrada</div>
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
import { useEvidenceStore } from 'src/stores/evidence'
import { useTeamsStore } from 'src/stores/teams'
import { storage } from 'src/services/supabase'

const evidenceStore = useEvidenceStore()
const teamsStore = useTeamsStore()

const loading = ref(false)
const rows = ref([])
const showDetail = ref(false)
const selected = ref(null)
const showLightbox = ref(false)
const lightboxPhoto = ref(null)
const lightboxUrl = ref('')

const filters = ref({
  teamId: null,
  date: new Date().toISOString().split('T')[0],
  status: null
})

const statusOptions = [
  { label: 'Sincronizado', value: 'synced' },
  { label: 'Pendente', value: 'pending' }
]

const teamOptions = computed(() =>
  teamsStore.teams.map(t => ({ label: `${t.prefixo} — ${t.nome}`, value: t.id }))
)

const filteredRows = computed(() => {
  if (!filters.value.status) return rows.value
  return rows.value.filter(r => r.sync_status === filters.value.status)
})

const columns = [
  { name: 'equipe',    label: 'Equipe',    field: 'equipe',  align: 'left',   sortable: true },
  { name: 'activity', label: 'Atividade', field: r => r.activity_name || r.activity_id, align: 'left' },
  { name: 'fotos',    label: 'Fotos',     field: 'fotos',   align: 'left' },
  { name: 'created',  label: 'Data',      field: r => formatDateTime(r.created_at), align: 'left', sortable: true },
  { name: 'status',   label: 'Status',    field: 'status',  align: 'center' },
  { name: 'acoes',    label: '',          field: 'acoes',   align: 'right' }
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

function epiCount (row) {
  return (row.evidence_photos || []).filter(p => p.tipo === 'epi').length
}

function atividadeCount (row) {
  return (row.evidence_photos || []).filter(p => p.tipo === 'atividade').length
}

function epiPhotos (row) {
  return (row.evidence_photos || []).filter(p => p.tipo === 'epi')
}

function atividadePhotos (row) {
  return (row.evidence_photos || []).filter(p => p.tipo === 'atividade')
}

function openDetail (row) {
  selected.value = row
  showDetail.value = true
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

function formatDate (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatDateTime (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
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

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
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

/* Lightbox */
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
