<template>
  <q-page class="q-pa-lg">
    <div class="flex items-center justify-between q-mb-lg">
      <div class="text-h5 text-weight-bold">Relatórios</div>
      <div class="flex q-gutter-sm">
        <q-input
          v-model="dateFrom"
          type="date"
          label="De"
          outlined
          dense
          style="width: 160px;"
          @update:model-value="load"
        />
        <q-input
          v-model="dateTo"
          type="date"
          label="Até"
          outlined
          dense
          style="width: 160px;"
          @update:model-value="load"
        />
        <q-btn
          outline
          rounded
          color="primary"
          icon="download"
          label="Exportar CSV"
          :disable="!services.length"
          @click="exportCsv"
        />
      </div>
    </div>

    <!-- Summary cards -->
    <div class="row q-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3" v-for="card in summaryCards" :key="card.label">
        <q-card flat bordered style="border-radius: 16px;">
          <q-card-section class="q-pa-lg">
            <div class="flex items-center justify-between q-mb-sm">
              <div class="text-caption text-grey-6 text-uppercase text-weight-bold">{{ card.label }}</div>
              <q-icon :name="card.icon" :color="card.color" size="28px" />
            </div>
            <div class="text-h4 text-weight-bold" :class="`text-${card.color}`">{{ card.value }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-gutter-md">
      <!-- By team -->
      <div class="col-12 col-md-6">
        <q-card flat bordered style="border-radius: 16px;">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Serviços por equipe</div>
            <q-list separator>
              <q-item v-for="item in byTeam" :key="item.prefixo">
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white" size="36px">
                    {{ item.prefixo?.charAt(0) }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ item.prefixo }}</q-item-label>
                  <q-item-label caption>{{ item.nome }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="text-right">
                    <div class="text-h6 text-weight-bold text-primary">{{ item.count }}</div>
                    <div class="text-caption text-grey-6">{{ item.photos }} fotos</div>
                  </div>
                </q-item-section>
              </q-item>
              <div v-if="!byTeam.length" class="text-grey text-center q-py-lg">
                Sem dados no período
              </div>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- By activity -->
      <div class="col-12 col-md-5">
        <q-card flat bordered style="border-radius: 16px;">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Serviços por atividade</div>
            <q-list separator>
              <q-item v-for="item in byActivity" :key="item.name">
                <q-item-section>
                  <q-item-label>{{ item.name }}</q-item-label>
                  <q-linear-progress
                    :value="item.count / maxActivity"
                    color="primary"
                    class="q-mt-xs"
                    style="height: 6px; border-radius: 3px;"
                  />
                </q-item-section>
                <q-item-section side>
                  <q-badge color="primary" :label="String(item.count)" />
                </q-item-section>
              </q-item>
              <div v-if="!byActivity.length" class="text-grey text-center q-py-lg">
                Sem dados no período
              </div>
            </q-list>
          </q-card-section>
        </q-card>
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

const loading = ref(false)
const services = ref([])

const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const dateFrom = ref(monthStart)
const dateTo = ref(today.toISOString().split('T')[0])

onMounted(() => load())

async function load () {
  loading.value = true
  try {
    const all = await evidenceStore.fetchEvidences({ date: dateFrom.value }) || []
    const to = dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null
    services.value = all.filter(s => {
      const d = new Date(s.created_at)
      return !to || d <= to
    })
  } catch {
    services.value = []
  } finally {
    loading.value = false
  }
}

const summaryCards = computed(() => {
  const photos = services.value.reduce((sum, s) => sum + (s.evidence_photos?.length || 0), 0)
  const epi = services.value.reduce(
    (sum, s) => sum + (s.evidence_photos || []).filter(p => p.tipo === 'epi').length, 0
  )
  const teams = new Set(services.value.map(s => s.team_id || s.teams?.prefixo)).size
  return [
    { label: 'Serviços', value: services.value.length, icon: 'task', color: 'primary' },
    { label: 'Fotos', value: photos, icon: 'photo_library', color: 'secondary' },
    { label: 'Fotos EPI', value: epi, icon: 'safety_check', color: 'teal' },
    { label: 'Equipes', value: teams, icon: 'groups', color: 'positive' }
  ]
})

const byTeam = computed(() => {
  const map = {}
  for (const s of services.value) {
    const key = s.teams?.prefixo || s.team_id || 'N/A'
    if (!map[key]) {
      map[key] = {
        prefixo: s.teams?.prefixo || key,
        nome: s.teams?.nome || '',
        count: 0,
        photos: 0
      }
    }
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
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

const maxActivity = computed(() =>
  Math.max(1, ...byActivity.value.map(a => a.count))
)

function exportCsv () {
  const header = ['Data', 'Equipe', 'Atividade', 'Fotos EPI', 'Fotos Atividade', 'Total Fotos', 'Status', 'Observações']
  const lines = services.value.map(s => {
    const epi = (s.evidence_photos || []).filter(p => p.tipo === 'epi').length
    const ativ = (s.evidence_photos || []).filter(p => p.tipo === 'atividade').length
    return [
      new Date(s.created_at).toLocaleString('pt-BR'),
      s.teams?.prefixo || '',
      s.activity_name || s.activity_id || '',
      epi,
      ativ,
      epi + ativ,
      s.sync_status || '',
      `"${(s.descricao || '').replace(/"/g, '""')}"`
    ].join(';')
  })

  const csv = [header.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gstc-relatorio-${dateFrom.value}-${dateTo.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: 'CSV exportado!' })
}
</script>
