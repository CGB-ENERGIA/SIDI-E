<template>
  <q-page class="q-pa-lg">
    <div class="flex items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Solicitações de Cadastro</div>
        <div class="text-caption text-grey-5">Gerenciamento de equipes e colaboradores registrados</div>
      </div>
      <q-btn flat icon="refresh" label="Atualizar" color="primary" @click="fetchAll" :loading="loading" />
    </div>

    <!-- Abas -->
    <q-tabs v-model="tab" class="q-mb-md" align="left" indicator-color="primary" active-color="primary">
      <q-tab name="pending" label="Pendentes">
        <q-badge v-if="pendentes.length" color="orange" floating>{{ pendentes.length }}</q-badge>
      </q-tab>
      <q-tab name="approved" label="Aprovadas" />
      <q-tab name="rejected" label="Rejeitadas" />
      <q-tab name="collaborators" label="Colaboradores">
        <q-badge v-if="collaborators.length" color="primary" floating>{{ collaborators.length }}</q-badge>
      </q-tab>
    </q-tabs>

    <!-- PENDENTES -->
    <div v-if="tab === 'pending'">
      <div v-if="!pendentes.length && !loading" class="text-center text-grey q-py-xl">
        <q-icon name="check_circle" size="48px" color="positive" />
        <div class="q-mt-sm">Nenhuma solicitação pendente</div>
      </div>

      <div class="row q-gutter-md">
        <div v-for="req in pendentes" :key="req.id" class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered style="border-radius: 14px; border: 2px solid #ff9800;">
            <q-card-section class="q-pb-sm">
              <div class="flex items-center gap-sm q-mb-xs">
                <q-avatar color="orange" text-color="white" size="42px" class="text-weight-bold">
                  {{ req.prefixo.charAt(0) }}
                </q-avatar>
                <div>
                  <div class="text-subtitle1 text-weight-bold">{{ req.prefixo }}</div>
                  <div class="text-caption text-grey-5">{{ formatDate(req.requested_at) }}</div>
                </div>
                <q-space />
                <q-badge color="orange" label="Pendente" />
              </div>
            </q-card-section>

            <q-separator />

            <q-card-actions class="q-px-md q-py-sm">
              <q-btn unelevated rounded color="positive" icon="check" label="Aprovar" size="sm" class="col" @click="openApprove(req)" />
              <q-btn flat rounded color="negative" icon="close" label="Rejeitar" size="sm" class="col" @click="rejeitar(req)" />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>

    <!-- APROVADAS -->
    <div v-if="tab === 'approved'">
      <div v-if="!aprovadas.length && !loading" class="text-center text-grey q-py-xl">
        <q-icon name="inbox" size="48px" />
        <div class="q-mt-sm">Nenhuma solicitação aprovada</div>
      </div>
      <q-list bordered separator style="border-radius: 14px;" v-else>
        <q-item v-for="req in aprovadas" :key="req.id" dense>
          <q-item-section avatar>
            <q-avatar color="positive" text-color="white" size="36px">{{ req.prefixo.charAt(0) }}</q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold">{{ req.prefixo }}</q-item-label>
            <q-item-label caption>Solicitado: {{ formatDate(req.requested_at) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="text-right">
              <q-badge color="positive" label="Aprovado" />
              <div class="text-caption text-grey-5 q-mt-xs">{{ formatDate(req.reviewed_at) }}</div>
              <div class="text-caption text-grey-5">por {{ req.reviewed_by }}</div>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- REJEITADAS -->
    <div v-if="tab === 'rejected'">
      <div v-if="!rejeitadas.length && !loading" class="text-center text-grey q-py-xl">
        <q-icon name="inbox" size="48px" />
        <div class="q-mt-sm">Nenhuma solicitação rejeitada</div>
      </div>
      <q-list bordered separator style="border-radius: 14px;" v-else>
        <q-item v-for="req in rejeitadas" :key="req.id" dense>
          <q-item-section avatar>
            <q-avatar color="negative" text-color="white" size="36px">{{ req.prefixo.charAt(0) }}</q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold">{{ req.prefixo }}</q-item-label>
            <q-item-label caption>Solicitado: {{ formatDate(req.requested_at) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="text-right">
              <q-badge color="negative" label="Rejeitado" />
              <div class="text-caption text-grey-5 q-mt-xs">{{ formatDate(req.reviewed_at) }}</div>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- COLABORADORES -->
    <div v-if="tab === 'collaborators'">
      <!-- Barra de busca + resumo -->
      <div class="flex items-center q-mb-md gap-sm">
        <q-input
          v-model="collabSearch"
          outlined
          dense
          placeholder="Buscar por nome ou equipe..."
          clearable
          style="max-width: 380px;"
          class="col"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-space />
        <div class="text-caption text-grey-5">
          {{ filteredCollaborators.length }} colaborador(es) encontrado(s)
        </div>
      </div>

      <div v-if="!collaborators.length && !loading" class="text-center text-grey q-py-xl">
        <q-icon name="group_off" size="48px" />
        <div class="q-mt-sm">Nenhum colaborador cadastrado ainda</div>
      </div>

      <div v-else>
        <q-table
          :rows="filteredCollaborators"
          :columns="collabColumns"
          row-key="id"
          flat
          bordered
          style="border-radius: 14px;"
          :rows-per-page-options="[20, 50, 100, 0]"
          rows-per-page-label="Por página"
          no-data-label="Nenhum resultado encontrado"
          :loading="loading"
        >
          <!-- Avatar + nome -->
          <template #body-cell-nome="{ row }">
            <q-td>
              <div class="flex items-center gap-sm">
                <q-avatar color="primary" text-color="white" size="34px" style="font-size: 0.75rem; font-weight: 700;">
                  {{ initials(row.nome) }}
                </q-avatar>
                <span class="text-weight-bold">{{ row.nome }}</span>
              </div>
            </q-td>
          </template>

          <!-- Equipe -->
          <template #body-cell-equipe="{ row }">
            <q-td>
              <div>
                <span class="text-weight-bold text-primary">{{ row.teams?.prefixo || '—' }}</span>
                <div class="text-caption text-grey-5">{{ row.teams?.nome || '' }}</div>
              </div>
            </q-td>
          </template>

          <!-- Data de cadastro -->
          <template #body-cell-created_at="{ row }">
            <q-td class="text-caption text-grey-5">
              {{ formatDate(row.created_at) }}
            </q-td>
          </template>

          <!-- Ações -->
          <template #body-cell-acoes="{ row }">
            <q-td class="text-center">
              <q-btn
                flat round dense icon="delete" color="negative" size="sm"
                @click="excluirColaborador(row)"
              >
                <q-tooltip>Remover colaborador</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- Dialog de aprovação -->
    <q-dialog v-model="approveDialog" persistent>
      <q-card style="min-width: 380px; border-radius: 16px;">
        <q-card-section class="q-pb-sm">
          <div class="text-h6">Aprovar Equipe</div>
          <div class="text-caption text-grey-6">
            Prefixo: <strong class="text-primary">{{ selectedReq?.prefixo }}</strong>
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input v-model="form.nome" label="Nome da equipe *" outlined dense autofocus :rules="[v => !!v || 'Obrigatório']" hint="Ex: Equipe Elétrica Norte" />
          <q-input v-model="form.responsavel" label="Responsável" outlined dense />
          <div class="row q-gutter-sm">
            <q-select v-model="form.base" :options="bases" label="Base" outlined dense class="col" clearable />
            <q-select v-model="form.processo" :options="processos" label="Processo" outlined dense class="col" clearable />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-px-md">
          <q-btn flat rounded label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated rounded label="Confirmar Aprovação" color="positive" icon="check" :loading="saving" :disable="!form.nome" @click="confirmarAprovacao" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const tab = ref('pending')
const loading = ref(false)
const saving = ref(false)
const requests = ref([])
const collaborators = ref([])
const collabSearch = ref('')
const approveDialog = ref(false)
const selectedReq = ref(null)

const bases = ['PDS', 'BCB', 'PDT', 'ITM', 'BDC', 'STI', 'N/A']
const processos = ['GSTC', 'GERE', 'SPOT']

const form = ref({ nome: '', responsavel: '', base: null, processo: null })

const pendentes  = computed(() => requests.value.filter(r => r.status === 'pending'))
const aprovadas  = computed(() => requests.value.filter(r => r.status === 'approved'))
const rejeitadas = computed(() => requests.value.filter(r => r.status === 'rejected'))

const collabColumns = [
  { name: 'nome',       label: 'Colaborador', field: 'nome',       align: 'left',   sortable: true },
  { name: 'equipe',     label: 'Equipe',      field: 'equipe',     align: 'left',   sortable: false },
  { name: 'created_at', label: 'Cadastrado em', field: 'created_at', align: 'left', sortable: true },
  { name: 'acoes',      label: 'Ações',       field: 'acoes',      align: 'center', sortable: false }
]

const filteredCollaborators = computed(() => {
  const q = collabSearch.value?.trim().toUpperCase() || ''
  if (!q) return collaborators.value
  return collaborators.value.filter(c =>
    c.nome?.toUpperCase().includes(q) ||
    c.teams?.prefixo?.toUpperCase().includes(q) ||
    c.teams?.nome?.toUpperCase().includes(q)
  )
})

onMounted(fetchAll)

async function fetchAll () {
  loading.value = true
  try {
    const [reqRes, collabRes] = await Promise.all([
      supabase.from('team_requests').select('*').order('requested_at', { ascending: false }),
      supabase.from('collaborators').select('id, nome, created_at, team_id, teams(prefixo, nome)').order('nome')
    ])
    if (reqRes.error) throw reqRes.error
    if (collabRes.error) throw collabRes.error
    requests.value = reqRes.data || []
    collaborators.value = collabRes.data || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar: ' + e.message })
  } finally {
    loading.value = false
  }
}

function openApprove (req) {
  selectedReq.value = req
  form.value = { nome: '', responsavel: '', base: null, processo: null }
  approveDialog.value = true
}

async function confirmarAprovacao () {
  if (!form.value.nome || !selectedReq.value) return
  saving.value = true
  try {
    const { error: teamErr } = await supabase.from('teams').insert({
      prefixo:     selectedReq.value.prefixo,
      nome:        form.value.nome,
      responsavel: form.value.responsavel || null,
      base:        form.value.base || null,
      processo:    form.value.processo || null
    })
    if (teamErr) throw teamErr

    const { error: reqErr } = await supabase
      .from('team_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: 'italo.fontes@cgbengenharia.com.br' })
      .eq('id', selectedReq.value.id)
    if (reqErr) throw reqErr

    approveDialog.value = false
    await fetchAll()
    $q.notify({ type: 'positive', message: `Equipe ${selectedReq.value.prefixo} aprovada e cadastrada!` })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + e.message })
  } finally {
    saving.value = false
  }
}

async function rejeitar (req) {
  $q.dialog({
    title: 'Rejeitar solicitação',
    message: `Confirma a rejeição do prefixo <strong>${req.prefixo}</strong>?`,
    html: true,
    cancel: true,
    ok: { label: 'Rejeitar', color: 'negative', unelevated: true }
  }).onOk(async () => {
    try {
      const { error } = await supabase
        .from('team_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: 'italo.fontes@cgbengenharia.com.br' })
        .eq('id', req.id)
      if (error) throw error
      await fetchAll()
      $q.notify({ type: 'info', message: `Solicitação de ${req.prefixo} rejeitada.` })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro: ' + e.message })
    }
  })
}

async function excluirColaborador (row) {
  $q.dialog({
    title: 'Remover colaborador',
    message: `Remover <strong>${row.nome}</strong> da equipe <strong>${row.teams?.prefixo || ''}</strong>?`,
    html: true,
    cancel: true,
    ok: { label: 'Remover', color: 'negative', unelevated: true }
  }).onOk(async () => {
    try {
      const { error } = await supabase.from('collaborators').delete().eq('id', row.id)
      if (error) throw error
      collaborators.value = collaborators.value.filter(c => c.id !== row.id)
      $q.notify({ type: 'positive', message: `${row.nome} removido com sucesso.` })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Erro ao remover: ' + e.message })
    }
  })
}

function initials (nome) {
  if (!nome) return '?'
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].charAt(0)
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
}

function formatDate (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>
