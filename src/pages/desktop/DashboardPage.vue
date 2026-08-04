<template>
  <q-page class="q-pa-lg">
    <div class="text-h5 text-weight-bold q-mb-lg">Dashboard</div>

    <!-- Solicitações pendentes de cadastro de equipe -->
    <q-card
      v-if="pendingRequests.length"
      flat
      bordered
      class="q-mb-lg"
      style="border-radius: 16px; border: 2px solid #ff9800;"
    >
      <q-card-section>
        <div class="flex items-center justify-between q-mb-md">
          <div class="flex items-center gap-sm">
            <q-icon name="pending_actions" color="orange" size="24px" />
            <span class="text-subtitle1 text-weight-bold">Solicitações de Cadastro Pendentes</span>
            <q-badge color="orange" :label="pendingRequests.length" />
          </div>
        </div>

        <q-list separator>
          <q-item v-for="req in pendingRequests" :key="req.id" class="q-py-sm">
            <q-item-section avatar>
              <q-avatar color="orange" text-color="white" size="40px">
                {{ req.prefixo.charAt(0) }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">Prefixo: {{ req.prefixo }}</q-item-label>
              <q-item-label caption>
                Solicitado em {{ formatDate(req.requested_at) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="flex gap-sm">
                <q-btn
                  unelevated
                  rounded
                  color="positive"
                  icon="check"
                  label="Aprovar"
                  size="sm"
                  :loading="approvingId === req.id"
                  @click="openApproveDialog(req)"
                />
                <q-btn
                  flat
                  rounded
                  color="negative"
                  icon="close"
                  label="Rejeitar"
                  size="sm"
                  :loading="rejectingId === req.id"
                  @click="rejectRequest(req)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

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

    <!-- Dialog de aprovação -->
    <q-dialog v-model="approveDialog" persistent>
      <q-card style="min-width: 360px; border-radius: 16px;">
        <q-card-section>
          <div class="text-h6">Aprovar Equipe</div>
          <div class="text-caption text-grey-6">Prefixo: <strong>{{ selectedRequest?.prefixo }}</strong></div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="newTeam.nome"
            label="Nome da equipe *"
            outlined
            dense
            :rules="[v => !!v || 'Informe o nome']"
            autofocus
          />
          <q-input
            v-model="newTeam.descricao"
            label="Descrição (opcional)"
            outlined
            dense
            type="textarea"
            rows="2"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            unelevated
            rounded
            label="Criar Equipe"
            color="positive"
            :loading="approvingId !== null"
            :disable="!newTeam.nome"
            @click="approveRequest"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTeamsStore } from 'src/stores/teams'
import { useEvidenceStore } from 'src/stores/evidence'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'

const teamsStore = useTeamsStore()
const evidenceStore = useEvidenceStore()
const $q = useQuasar()

const loading = ref(false)
const recentEvidences = ref([])
const pendingRequests = ref([])
const approveDialog = ref(false)
const selectedRequest = ref(null)
const approvingId = ref(null)
const rejectingId = ref(null)
const newTeam = ref({ nome: '', descricao: '' })

const today = new Date().toISOString().split('T')[0]

onMounted(async () => {
  loading.value = true
  await Promise.all([
    teamsStore.fetchTeams(),
    fetchPendingRequests()
  ])
  try {
    recentEvidences.value = await evidenceStore.fetchEvidences({ date: today })
  } catch {
    recentEvidences.value = []
  } finally {
    loading.value = false
  }
})

async function fetchPendingRequests () {
  try {
    const { data, error } = await supabase
      .from('team_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
    if (error) throw error
    pendingRequests.value = data || []
  } catch {
    pendingRequests.value = []
  }
}

function openApproveDialog (req) {
  selectedRequest.value = req
  newTeam.value = { nome: '', descricao: '' }
  approveDialog.value = true
}

async function approveRequest () {
  if (!newTeam.value.nome || !selectedRequest.value) return
  approvingId.value = selectedRequest.value.id
  try {
    // Cria a equipe no banco
    const { error: teamError } = await supabase.from('teams').insert({
      prefixo: selectedRequest.value.prefixo,
      nome: newTeam.value.nome,
      descricao: newTeam.value.descricao || null
    })
    if (teamError) throw teamError

    // Marca solicitação como aprovada
    const { error: reqError } = await supabase
      .from('team_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'italo.fontes@cgbengenharia.com.br'
      })
      .eq('id', selectedRequest.value.id)
    if (reqError) throw reqError

    approveDialog.value = false
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== selectedRequest.value.id)
    await teamsStore.fetchTeams()
    $q.notify({ type: 'positive', message: `Equipe ${selectedRequest.value.prefixo} aprovada e cadastrada!` })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao aprovar: ' + e.message })
  } finally {
    approvingId.value = null
  }
}

async function rejectRequest (req) {
  rejectingId.value = req.id
  try {
    const { error } = await supabase
      .from('team_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'italo.fontes@cgbengenharia.com.br'
      })
      .eq('id', req.id)
    if (error) throw error

    pendingRequests.value = pendingRequests.value.filter(r => r.id !== req.id)
    $q.notify({ type: 'info', message: `Solicitação de ${req.prefixo} rejeitada.` })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao rejeitar: ' + e.message })
  } finally {
    rejectingId.value = null
  }
}

function formatDate (iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const stats = computed(() => [
  { label: 'Equipes', value: teamsStore.teams.length, icon: 'groups', color: 'primary', sub: 'cadastradas' },
  { label: 'Serviços Hoje', value: recentEvidences.value.length, icon: 'task', color: 'positive', sub: 'registrados hoje' },
  { label: 'Fotos Hoje', value: recentEvidences.value.reduce((s, e) => s + (e.evidence_photos?.length || 0), 0), icon: 'photo_library', color: 'secondary', sub: 'evidências coletadas' },
  { label: 'Pendentes', value: recentEvidences.value.filter(e => e.sync_status !== 'synced').length, icon: 'pending', color: 'orange', sub: 'aguardando sync' }
])

const activeTeams = computed(() => teamsStore.teams.slice(0, 6))

const evidenceColumns = [
  { name: 'team', label: 'Equipe', field: r => r.teams?.prefixo, align: 'left', sortable: true },
  { name: 'activity', label: 'Atividade', field: 'activity_id', align: 'left' },
  { name: 'fotos', label: 'Fotos', field: 'fotos', align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
]
</script>
