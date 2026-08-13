<template>
  <q-page class="q-pa-lg">
    <div class="flex items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Colaboradores Cadastrados</div>
        <div class="text-caption text-grey-5">Usuários registrados e suas equipes</div>
      </div>
      <q-btn flat icon="refresh" label="Atualizar" color="primary" @click="fetchAll" :loading="loading" />
    </div>

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

    <q-table
      v-else
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
          <span class="text-weight-bold text-primary">{{ row.teams?.prefixo || '—' }}</span>
          <div class="text-caption text-grey-5">{{ row.teams?.nome || '' }}</div>
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
          <template v-if="authStore.isAdmin">
            <q-btn
              flat round dense icon="edit" color="primary" size="sm"
              @click="openEdit(row)"
            >
              <q-tooltip>Editar / trocar equipe</q-tooltip>
            </q-btn>
            <q-btn
              flat round dense icon="delete" color="negative" size="sm"
              @click="excluirColaborador(row)"
            >
              <q-tooltip>Remover colaborador</q-tooltip>
            </q-btn>
          </template>
          <span v-else class="text-caption text-grey-6">—</span>
        </q-td>
      </template>
    </q-table>

    <!-- Dialog editar colaborador -->
    <q-dialog v-model="showEdit" persistent>
      <q-card style="min-width: 420px; max-width: 480px; border-radius: 16px;">
        <q-card-section class="text-h6 text-weight-bold">
          Editar colaborador
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-lg">
          <q-input
            v-model="editForm.nome"
            label="Nome *"
            outlined
            dense
            class="q-mb-md"
            :rules="[v => !!v?.trim() || 'Obrigatório']"
          />
          <q-select
            v-model="editForm.teamId"
            :options="teamOptions"
            label="Equipe *"
            outlined
            dense
            emit-value
            map-options
            use-input
            input-debounce="200"
            @filter="filterTeams"
            :rules="[v => !!v || 'Selecione a equipe']"
          >
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ scope.opt.prefixo }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.nome }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
            <template #selected-item="scope">
              <span>{{ scope.opt?.label || scope.opt }}</span>
            </template>
          </q-select>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated rounded color="primary" label="Salvar"
            :loading="saving"
            :disable="!editForm.nome?.trim() || !editForm.teamId"
            @click="saveEdit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { useTeamsStore } from 'src/stores/teams'

const $q = useQuasar()
const authStore = useAuthStore()
const teamsStore = useTeamsStore()

const loading = ref(false)
const saving = ref(false)
const collaborators = ref([])
const collabSearch = ref('')
const showEdit = ref(false)
const editingId = ref(null)
const editForm = ref({ nome: '', teamId: null })
const teamFilter = ref('')

const collabColumns = [
  { name: 'nome',       label: 'Colaborador',   field: 'nome',       align: 'left',   sortable: true  },
  { name: 'equipe',     label: 'Equipe',         field: 'equipe',     align: 'left',   sortable: false },
  { name: 'created_at', label: 'Cadastrado em',  field: 'created_at', align: 'left',   sortable: true  },
  { name: 'acoes',      label: 'Ações',          field: 'acoes',      align: 'center', sortable: false }
]

const allTeamOptions = computed(() =>
  (teamsStore.teams || []).map(t => ({
    label: `${t.prefixo} — ${t.nome || t.responsavel || ''}`.trim(),
    value: t.id,
    prefixo: t.prefixo,
    nome: t.nome || t.responsavel || ''
  })).sort((a, b) => a.prefixo.localeCompare(b.prefixo))
)

const teamOptions = computed(() => {
  const q = teamFilter.value.trim().toUpperCase()
  if (!q) return allTeamOptions.value
  return allTeamOptions.value.filter(t =>
    t.prefixo?.toUpperCase().includes(q) ||
    t.nome?.toUpperCase().includes(q) ||
    t.label?.toUpperCase().includes(q)
  )
})

const filteredCollaborators = computed(() => {
  const q = collabSearch.value?.trim().toUpperCase() || ''
  if (!q) return collaborators.value
  return collaborators.value.filter(c =>
    c.nome?.toUpperCase().includes(q) ||
    c.teams?.prefixo?.toUpperCase().includes(q) ||
    c.teams?.nome?.toUpperCase().includes(q)
  )
})

onMounted(async () => {
  await teamsStore.fetchTeams()
  await fetchAll()
})

function filterTeams (val, update) {
  update(() => { teamFilter.value = val || '' })
}

async function fetchAll () {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('collaborators')
      .select('id, nome, created_at, team_id, teams(prefixo, nome)')
      .order('nome')
    if (error) throw error
    collaborators.value = data || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar: ' + e.message })
  } finally {
    loading.value = false
  }
}

function openEdit (row) {
  if (!authStore.isAdmin) {
    $q.notify({ type: 'negative', message: 'Sem permissão para editar.' })
    return
  }
  editingId.value = row.id
  editForm.value = {
    nome: row.nome || '',
    teamId: row.team_id || null
  }
  teamFilter.value = ''
  showEdit.value = true
}

async function saveEdit () {
  if (!authStore.isAdmin) {
    $q.notify({ type: 'negative', message: 'Sem permissão para editar.' })
    return
  }
  const nome = editForm.value.nome?.trim()
  const teamId = editForm.value.teamId
  if (!nome || !teamId) return

  saving.value = true
  try {
    const { data, error } = await supabase
      .from('collaborators')
      .update({ nome, team_id: teamId })
      .eq('id', editingId.value)
      .select('id, nome, created_at, team_id, teams(prefixo, nome)')
      .single()
    if (error) throw error

    const idx = collaborators.value.findIndex(c => c.id === editingId.value)
    if (idx !== -1) collaborators.value[idx] = data
    showEdit.value = false
    $q.notify({ type: 'positive', message: 'Colaborador atualizado.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar: ' + e.message })
  } finally {
    saving.value = false
  }
}

async function excluirColaborador (row) {
  if (!authStore.isAdmin) {
    $q.notify({ type: 'negative', message: 'Sem permissão para excluir.' })
    return
  }
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
