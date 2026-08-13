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
          <q-btn
            v-if="authStore.isAdmin"
            flat round dense icon="delete" color="negative" size="sm"
            @click="excluirColaborador(row)"
          >
            <q-tooltip>Remover colaborador</q-tooltip>
          </q-btn>
          <span v-else class="text-caption text-grey-6">—</span>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const authStore = useAuthStore()

const loading = ref(false)
const collaborators = ref([])
const collabSearch = ref('')

const collabColumns = [
  { name: 'nome',       label: 'Colaborador',   field: 'nome',       align: 'left',   sortable: true  },
  { name: 'equipe',     label: 'Equipe',         field: 'equipe',     align: 'left',   sortable: false },
  { name: 'created_at', label: 'Cadastrado em',  field: 'created_at', align: 'left',   sortable: true  },
  { name: 'acoes',      label: 'Ações',          field: 'acoes',      align: 'center', sortable: false }
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
