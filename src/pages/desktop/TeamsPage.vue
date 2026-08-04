<template>
  <q-page class="q-pa-lg">
    <div class="flex items-center justify-between q-mb-lg">
      <div class="text-h5 text-weight-bold">Equipes</div>
      <q-btn unelevated rounded color="primary" icon="add" label="Nova equipe" @click="openForm()" />
    </div>

    <!-- Search -->
    <q-input
      v-model="search"
      outlined
      dense
      placeholder="Buscar equipe..."
      class="q-mb-md"
      style="max-width: 360px;"
      clearable
    >
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <!-- Teams table -->
    <q-card flat bordered style="border-radius: 16px;">
      <q-table
        :rows="filteredTeams"
        :columns="columns"
        row-key="id"
        flat
        :loading="teamsStore.loading"
        :filter="search"
      >
        <template #body-cell-prefixo="{ row }">
          <q-td>
            <q-chip dense color="primary" text-color="white">{{ row.prefixo }}</q-chip>
          </q-td>
        </template>

        <template #body-cell-colaboradores="{ row }">
          <q-td>
            <q-chip
              v-for="c in (row.collaborators || []).slice(0, 3)"
              :key="c.id"
              dense
              size="sm"
              icon="person"
            >{{ c.nome }}</q-chip>
            <q-chip v-if="(row.collaborators?.length || 0) > 3" dense size="sm" color="grey-3">
              +{{ row.collaborators.length - 3 }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-status="{ row }">
          <q-td>
            <q-badge
              :color="row.status === 'ativo' ? 'positive' : 'grey'"
              :label="row.status === 'ativo' ? 'Ativo' : 'Inativo'"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="{ row }">
          <q-td class="text-right">
            <q-btn flat round dense icon="edit" color="primary" @click="openForm(row)" />
            <q-btn flat round dense icon="people" color="secondary" @click="openCollaborators(row)" />
            <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Team form dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 400px; border-radius: 16px;">
        <q-card-section class="text-h6 text-weight-bold">
          {{ editingTeam ? 'Editar equipe' : 'Nova equipe' }}
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-lg">
          <q-input v-model="form.prefixo" label="Prefixo *" outlined dense class="q-mb-md"
            hint="Ex: EQ-01, A-03" :rules="[v => !!v || 'Obrigatório']" />
          <q-input v-model="form.nome" label="Nome da equipe *" outlined dense class="q-mb-md"
            :rules="[v => !!v || 'Obrigatório']" />
          <q-input v-model="form.descricao" label="Descrição" outlined dense type="textarea" rows="2" class="q-mb-md" />
          <q-select v-model="form.status" :options="['ativo', 'inativo']" label="Status" outlined dense />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated rounded color="primary" :label="editingTeam ? 'Salvar' : 'Criar'"
            :loading="saving" @click="saveTeam" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Collaborators dialog -->
    <q-dialog v-model="showCollaborators" persistent>
      <q-card style="min-width: 440px; max-width: 600px; border-radius: 16px;">
        <q-card-section>
          <div class="text-h6 text-weight-bold">
            Colaboradores — {{ selectedTeam?.prefixo }}
          </div>
          <div class="text-caption text-grey-6">{{ selectedTeam?.nome }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-list separator>
            <q-item v-for="c in selectedTeam?.collaborators || []" :key="c.id" dense>
              <q-item-section avatar>
                <q-avatar size="28px" color="blue-2" text-color="primary">
                  {{ c.nome?.charAt(0) }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ c.nome }}</q-item-label>
                <q-item-label caption>{{ c.funcao || 'Eletricista' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat round dense icon="delete" color="negative" size="sm"
                  @click="removeColaborador(c)" />
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Add collaborator form -->
          <q-separator class="q-my-md" />
          <div class="text-subtitle2 q-mb-sm">Adicionar colaborador</div>
          <div class="row q-gutter-sm">
            <q-input v-model="newColaborador.nome" label="Nome" outlined dense class="col" />
            <q-input v-model="newColaborador.funcao" label="Função" outlined dense class="col" />
          </div>
          <q-btn class="q-mt-sm" unelevated rounded color="primary" icon="add" label="Adicionar"
            :loading="addingColaborador" @click="addColaborador" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fechar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTeamsStore } from 'src/stores/teams'
import { useQuasar } from 'quasar'

const teamsStore = useTeamsStore()
const $q = useQuasar()

const search = ref('')
const showForm = ref(false)
const showCollaborators = ref(false)
const saving = ref(false)
const addingColaborador = ref(false)
const editingTeam = ref(null)
const selectedTeam = ref(null)
const newColaborador = ref({ nome: '', funcao: 'Eletricista' })

const form = ref({ prefixo: '', nome: '', descricao: '', status: 'ativo' })

onMounted(() => teamsStore.fetchTeams())

const filteredTeams = computed(() =>
  teamsStore.teams.filter(t =>
    !search.value ||
    t.prefixo?.toLowerCase().includes(search.value.toLowerCase()) ||
    t.nome?.toLowerCase().includes(search.value.toLowerCase())
  )
)

const columns = [
  { name: 'prefixo', label: 'Prefixo', field: 'prefixo', align: 'left', sortable: true },
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
  { name: 'colaboradores', label: 'Colaboradores', field: 'colaboradores', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' }
]

function openForm (team = null) {
  editingTeam.value = team
  form.value = team
    ? { prefixo: team.prefixo, nome: team.nome, descricao: team.descricao, status: team.status }
    : { prefixo: '', nome: '', descricao: '', status: 'ativo' }
  showForm.value = true
}

function openCollaborators (team) {
  selectedTeam.value = team
  newColaborador.value = { nome: '', funcao: 'Eletricista' }
  showCollaborators.value = true
}

async function saveTeam () {
  saving.value = true
  try {
    if (editingTeam.value) {
      await teamsStore.updateTeam(editingTeam.value.id, form.value)
    } else {
      await teamsStore.createTeam(form.value)
    }
    showForm.value = false
    $q.notify({ type: 'positive', message: 'Equipe salva com sucesso!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    saving.value = false
  }
}

async function addColaborador () {
  if (!newColaborador.value.nome) return
  addingColaborador.value = true
  try {
    const result = await teamsStore.addCollaborator(selectedTeam.value.id, newColaborador.value)
    selectedTeam.value = teamsStore.teams.find(t => t.id === selectedTeam.value.id)
    newColaborador.value = { nome: '', funcao: 'Eletricista' }
    $q.notify({ type: 'positive', message: 'Colaborador adicionado!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    addingColaborador.value = false
  }
}

async function removeColaborador (c) {
  try {
    await teamsStore.removeCollaborator(c.id, selectedTeam.value.id)
    selectedTeam.value = teamsStore.teams.find(t => t.id === selectedTeam.value.id)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  }
}

function confirmDelete (team) {
  $q.dialog({
    title: 'Excluir equipe',
    message: `Tem certeza que deseja excluir a equipe ${team.prefixo}?`,
    cancel: true,
    color: 'negative'
  }).onOk(async () => {
    try {
      await teamsStore.deleteTeam(team.id)
      $q.notify({ type: 'positive', message: 'Equipe excluída.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message })
    }
  })
}
</script>
