<template>
  <q-page class="q-pa-lg">
    <div class="flex items-center justify-between q-mb-lg">
      <div class="text-h5 text-weight-bold">Atividades</div>
      <q-btn unelevated rounded color="primary" icon="add" label="Nova atividade" @click="openForm()" />
    </div>

    <q-input
      v-model="search"
      outlined
      dense
      placeholder="Buscar atividade..."
      class="q-mb-md"
      style="max-width: 360px;"
      clearable
    >
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <q-card flat bordered style="border-radius: 16px;">
      <q-table
        :rows="filtered"
        :columns="columns"
        row-key="id"
        flat
        :loading="activitiesStore.loading"
      >
        <template #body-cell-tipo="{ row }">
          <q-td>
            <q-chip dense :color="tipoColor(row.tipo)" text-color="white">
              {{ tipoLabel(row.tipo) }}
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
            <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 420px; border-radius: 16px;">
        <q-card-section class="text-h6 text-weight-bold">
          {{ editing ? 'Editar atividade' : 'Nova atividade' }}
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-lg">
          <q-input
            v-model="form.nome"
            label="Nome *"
            outlined
            dense
            class="q-mb-md"
            :rules="[v => !!v || 'Obrigatório']"
          />
          <q-input
            v-model="form.descricao"
            label="Descrição"
            outlined
            dense
            type="textarea"
            rows="2"
            class="q-mb-md"
          />
          <q-select
            v-model="form.tipo"
            :options="tipoOptions"
            label="Tipo *"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
          />
          <q-select
            v-model="form.status"
            :options="['ativo', 'inativo']"
            label="Status"
            outlined
            dense
          />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            rounded
            color="primary"
            :label="editing ? 'Salvar' : 'Criar'"
            :loading="saving"
            @click="save"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useActivitiesStore } from 'src/stores/activities'
import { useQuasar } from 'quasar'

const activitiesStore = useActivitiesStore()
const $q = useQuasar()

const search = ref('')
const showForm = ref(false)
const saving = ref(false)
const editing = ref(null)

const form = ref({ nome: '', descricao: '', tipo: 'servico', status: 'ativo' })

const tipoOptions = [
  { label: 'Serviço', value: 'servico' },
  { label: 'Manutenção', value: 'manutencao' },
  { label: 'Inspeção', value: 'inspecao' },
  { label: 'Emergência', value: 'emergencia' }
]

onMounted(() => activitiesStore.fetchActivities())

const filtered = computed(() =>
  activitiesStore.activities.filter(a =>
    !search.value ||
    a.nome?.toLowerCase().includes(search.value.toLowerCase()) ||
    a.descricao?.toLowerCase().includes(search.value.toLowerCase())
  )
)

const columns = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left', sortable: true },
  { name: 'descricao', label: 'Descrição', field: 'descricao', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' }
]

function tipoLabel (tipo) {
  return tipoOptions.find(t => t.value === tipo)?.label || tipo
}

function tipoColor (tipo) {
  const map = { servico: 'primary', manutencao: 'orange', inspecao: 'teal', emergencia: 'negative' }
  return map[tipo] || 'grey'
}

function openForm (activity = null) {
  editing.value = activity
  form.value = activity
    ? { nome: activity.nome, descricao: activity.descricao || '', tipo: activity.tipo || 'servico', status: activity.status || 'ativo' }
    : { nome: '', descricao: '', tipo: 'servico', status: 'ativo' }
  showForm.value = true
}

async function save () {
  if (!form.value.nome) return
  saving.value = true
  try {
    const nome = form.value.nome
    if (editing.value) {
      await activitiesStore.updateActivity(editing.value.id, { ...form.value })
    } else {
      await activitiesStore.createActivity({ ...form.value })
      // Recarrega do Supabase (ordenação correta) e destaca o novo item
      await activitiesStore.fetchActivities()
      search.value = nome
    }
    showForm.value = false
    $q.notify({ type: 'positive', message: 'Atividade salva com sucesso!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + (e.message || JSON.stringify(e)) })
  } finally {
    saving.value = false
  }
}

function confirmDelete (activity) {
  $q.dialog({
    title: 'Excluir atividade',
    message: `Tem certeza que deseja excluir "${activity.nome}"?`,
    cancel: true,
    color: 'negative'
  }).onOk(async () => {
    try {
      await activitiesStore.deleteActivity(activity.id)
      $q.notify({ type: 'positive', message: 'Atividade excluída.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message })
    }
  })
}
</script>
