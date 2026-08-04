<template>
  <q-page class="q-pa-lg">
    <div class="text-h5 text-weight-bold q-mb-lg">Dashboard</div>

    <!-- Stats row -->
    <div class="row q-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3" v-for="stat in stats" :key="stat.label">
        <q-card flat bordered style="border-radius: 16px;">
          <q-card-section class="q-pa-lg">
            <div class="flex items-center justify-between q-mb-sm">
              <div class="text-caption text-grey-6 text-uppercase text-weight-bold">{{ stat.label }}</div>
              <q-icon :name="stat.icon" :color="stat.color" size="28px" />
            </div>
            <div class="text-h4 text-weight-bold" :class="`text-${stat.color}`">{{ stat.value }}</div>
            <div class="text-caption text-grey-5 q-mt-xs">{{ stat.sub }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent evidences + Teams activity -->
    <div class="row q-gutter-md">
      <!-- Recent evidences -->
      <div class="col-12 col-md-7">
        <q-card flat bordered style="border-radius: 16px;">
          <q-card-section>
            <div class="flex items-center justify-between q-mb-md">
              <div class="text-subtitle1 text-weight-bold">Evidências Recentes</div>
              <q-btn flat dense label="Ver todas" to="/evidencias" color="primary" />
            </div>

            <q-table
              :rows="recentEvidences"
              :columns="evidenceColumns"
              row-key="id"
              flat
              dense
              :loading="loading"
              hide-bottom
              :rows-per-page-options="[5]"
            >
              <template #body-cell-status="{ row }">
                <q-td>
                  <q-badge
                    :color="row.sync_status === 'synced' ? 'positive' : 'orange'"
                    :label="row.sync_status === 'synced' ? 'Sincronizado' : 'Pendente'"
                  />
                </q-td>
              </template>
              <template #body-cell-fotos="{ row }">
                <q-td class="text-center">{{ row.evidence_photos?.length || 0 }}</q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <!-- Teams status -->
      <div class="col-12 col-md-4">
        <q-card flat bordered style="border-radius: 16px;">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Equipes Ativas</div>
            <q-list separator>
              <q-item v-for="team in activeTeams" :key="team.id" dense>
                <q-item-section avatar>
                  <q-avatar size="32px" :color="team.color || 'primary'" text-color="white">
                    {{ team.prefixo?.charAt(0) }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ team.prefixo }}</q-item-label>
                  <q-item-label caption>{{ team.nome }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge color="positive" :label="`${team.servicos_hoje || 0} svc`" />
                </q-item-section>
              </q-item>
            </q-list>
            <div v-if="!activeTeams.length" class="text-grey text-center q-py-md">
              Nenhuma equipe ativa hoje
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTeamsStore } from 'src/stores/teams'
import { useEvidenceStore } from 'src/stores/evidence'

const teamsStore = useTeamsStore()
const evidenceStore = useEvidenceStore()

const loading = ref(false)
const recentEvidences = ref([])
const today = new Date().toISOString().split('T')[0]

onMounted(async () => {
  loading.value = true
  await teamsStore.fetchTeams()
  try {
    recentEvidences.value = await evidenceStore.fetchEvidences({ date: today })
  } catch {
    recentEvidences.value = []
  } finally {
    loading.value = false
  }
})

const stats = computed(() => [
  {
    label: 'Equipes',
    value: teamsStore.teams.length,
    icon: 'groups',
    color: 'primary',
    sub: 'cadastradas'
  },
  {
    label: 'Serviços Hoje',
    value: recentEvidences.value.length,
    icon: 'task',
    color: 'positive',
    sub: 'registrados hoje'
  },
  {
    label: 'Fotos Hoje',
    value: recentEvidences.value.reduce((sum, e) => sum + (e.evidence_photos?.length || 0), 0),
    icon: 'photo_library',
    color: 'secondary',
    sub: 'evidências coletadas'
  },
  {
    label: 'Pendentes',
    value: recentEvidences.value.filter(e => e.sync_status !== 'synced').length,
    icon: 'pending',
    color: 'orange',
    sub: 'aguardando sync'
  }
])

const activeTeams = computed(() => teamsStore.teams.slice(0, 6))

const evidenceColumns = [
  { name: 'team', label: 'Equipe', field: r => r.teams?.prefixo, align: 'left', sortable: true },
  { name: 'activity', label: 'Atividade', field: 'activity_id', align: 'left' },
  { name: 'fotos', label: 'Fotos', field: 'fotos', align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
]
</script>
