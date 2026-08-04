<template>
  <q-page class="q-pa-lg">
    <div class="flex items-center justify-between q-mb-lg">
      <div class="text-h5 text-weight-bold">Evidências</div>
      <q-btn
        outline
        rounded
        color="primary"
        icon="refresh"
        label="Atualizar"
        :loading="loading"
        @click="load"
      />
    </div>

    <!-- Filters -->
    <div class="row q-gutter-md q-mb-lg">
      <q-select
        v-model="filters.teamId"
        :options="teamOptions"
        label="Equipe"
        outlined
        dense
        clearable
        emit-value
        map-options
        style="min-width: 200px;"
        @update:model-value="load"
      />
      <q-input
        v-model="filters.date"
        type="date"
        label="Data"
        outlined
        dense
        clearable
        style="min-width: 180px;"
        @update:model-value="load"
      />
      <q-select
        v-model="filters.status"
        :options="statusOptions"
        label="Status sync"
        outlined
        dense
        clearable
        emit-value
        map-options
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
              <q-badge
                v-if="epiCount(row)"
                color="teal"
                :label="`${epiCount(row)} EPI`"
                class="q-ml-xs"
              />
              <q-badge
                v-if="atividadeCount(row)"
                color="blue"
                :label="`${atividadeCount(row)} Ativ.`"
                class="q-ml-xs"
              />
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
            <q-btn flat round dense icon="visibility" color="primary" @click="openDetail(row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Detail dialog -->
    <q-dialog v-model="showDetail" maximized>
      <q-card>
        <q-bar class="bg-primary text-white">
          <div class="text-weight-bold">
            Evidência — {{ selected?.teams?.prefixo }} · {{ formatDate(selected?.created_at) }}
          </div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>

        <q-card-section v-if="selected" class="q-pa-lg">
          <div class="row q-gutter-md q-mb-lg">
            <div class="col-12 col-md-4">
              <q-list bordered separator style="border-radius: 12px;">
                <q-item>
                  <q-item-section avatar><q-icon name="groups" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Equipe</q-item-label>
                    <q-item-label>{{ selected.teams?.prefixo }} — {{ selected.teams?.nome }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar><q-icon name="task" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Atividade</q-item-label>
                    <q-item-label>{{ selected.activity_name || selected.activity_id || '—' }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar><q-icon name="notes" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Observações</q-item-label>
                    <q-item-label>{{ selected.descricao || 'Sem observações' }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar><q-icon name="schedule" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Registrado em</q-item-label>
                    <q-item-label>{{ formatDateTime(selected.created_at) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <div class="col">
              <div class="text-subtitle1 text-weight-bold q-mb-md">Fotos</div>
              <div v-if="selected.evidence_photos?.length" class="photo-grid">
                <div
                  v-for="photo in selected.evidence_photos"
                  :key="photo.id"
                  class="relative-position cursor-pointer"
                  @click="previewUrl = getPhotoUrl(photo)"
                >
                  <img :src="getPhotoUrl(photo)" class="photo-thumb" />
                  <q-badge
                    :color="photo.tipo === 'epi' ? 'teal' : 'blue'"
                    :label="photo.tipo === 'epi' ? 'EPI' : 'Atividade'"
                    class="absolute-top-left q-ma-xs"
                  />
                </div>
              </div>
              <div v-else class="text-grey text-center q-py-xl">Nenhuma foto</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Image preview -->
    <q-dialog v-model="showPreview">
      <q-card style="max-width: 90vw; background: #000;">
        <q-bar dark class="bg-black">
          <q-space />
          <q-btn dense flat icon="close" color="white" v-close-popup />
        </q-bar>
        <img :src="previewUrl" style="max-width: 100%; max-height: 85vh; display: block;" />
      </q-card>
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
const previewUrl = ref(null)

const filters = ref({
  teamId: null,
  date: new Date().toISOString().split('T')[0],
  status: null
})

const statusOptions = [
  { label: 'Sincronizado', value: 'synced' },
  { label: 'Pendente', value: 'pending' }
]

const showPreview = computed({
  get: () => !!previewUrl.value,
  set: (v) => { if (!v) previewUrl.value = null }
})

const teamOptions = computed(() =>
  teamsStore.teams.map(t => ({ label: `${t.prefixo} — ${t.nome}`, value: t.id }))
)

const filteredRows = computed(() => {
  if (!filters.value.status) return rows.value
  return rows.value.filter(r => r.sync_status === filters.value.status)
})

const columns = [
  { name: 'equipe', label: 'Equipe', field: 'equipe', align: 'left', sortable: true },
  { name: 'activity', label: 'Atividade', field: r => r.activity_name || r.activity_id, align: 'left' },
  { name: 'fotos', label: 'Fotos', field: 'fotos', align: 'left' },
  { name: 'created', label: 'Data', field: r => formatDateTime(r.created_at), align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'acoes', label: '', field: 'acoes', align: 'right' }
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

function openDetail (row) {
  selected.value = row
  showDetail.value = true
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
