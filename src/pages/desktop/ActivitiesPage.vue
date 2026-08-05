<template>
  <q-page class="q-pa-lg">
    <div class="flex items-center justify-between q-mb-md">
      <div class="text-h5 text-weight-bold">Atividades</div>
    </div>

    <q-tabs
      v-model="tab"
      dense
      align="left"
      class="q-mb-lg"
      active-color="primary"
      indicator-color="primary"
    >
      <q-tab name="atividades" icon="bar_chart" label="Atividades" />
      <q-tab name="servicos"   icon="build"     label="Serviços"   />
    </q-tabs>

    <!-- ══════════════════════════════════════════════════════
         TAB ATIVIDADES — Resumo de serviços por equipe/dia
    ══════════════════════════════════════════════════════ -->
    <q-tab-panels v-model="tab" animated keep-alive>
      <q-tab-panel name="atividades" class="q-pa-none">

        <!-- Filtros -->
        <div class="row q-gutter-md q-mb-lg items-end">
          <q-input
            v-model="atividadesDate"
            type="date"
            label="Data"
            outlined dense
            style="min-width: 180px;"
            @update:model-value="loadAtividades"
          />
          <q-select
            v-model="atividadesTeam"
            :options="teamOptions"
            label="Equipe"
            outlined dense clearable
            emit-value map-options
            style="min-width: 220px;"
            @update:model-value="loadAtividades"
          />
          <q-btn outline rounded color="primary" icon="refresh" label="Atualizar"
            :loading="loadingAtividades" @click="loadAtividades" />
          <q-space />
          <q-chip color="primary" text-color="white" icon="receipt_long" size="md">
            {{ totalServicos }} serviço(s) no dia
          </q-chip>
        </div>

        <!-- Tabela de resumo por equipe -->
        <q-card flat bordered style="border-radius: 16px;" class="q-mb-lg">
          <q-table
            :rows="resumoEquipes"
            :columns="colsResumo"
            row-key="teamId"
            flat
            :loading="loadingAtividades"
            no-data-label="Nenhum serviço registrado nesta data"
          >
            <template #body-cell-equipe="{ row }">
              <q-td>
                <q-chip dense color="primary" text-color="white">{{ row.prefixo }}</q-chip>
                <span class="q-ml-xs text-caption text-grey-5">{{ row.nomeEquipe }}</span>
              </q-td>
            </template>

            <template #body-cell-total="{ row }">
              <q-td>
                <q-badge color="positive" :label="row.total" style="font-size:1rem; padding: 4px 12px;" />
              </q-td>
            </template>

            <template #body-cell-atividades="{ row }">
              <q-td>
                <q-chip
                  v-for="(nome, idx) in row.atividadeNomes"
                  :key="idx"
                  dense
                  color="blue-grey-8"
                  text-color="white"
                  size="sm"
                  class="q-mr-xs q-mb-xs"
                >{{ nome }}</q-chip>
              </q-td>
            </template>

            <template #body-cell-colaboradores="{ row }">
              <q-td>
                <div class="flex flex-wrap gap-xs">
                  <q-chip
                    v-for="(nome, idx) in row.colaboradores"
                    :key="idx"
                    dense icon="person"
                    color="primary" text-color="white"
                    size="sm" class="q-mb-xs"
                  >{{ nome }}</q-chip>
                </div>
              </q-td>
            </template>

            <!-- Expansão: detalhes de cada serviço -->
            <template #body="{ row }">
              <tr class="cursor-pointer" @click="toggleExpand(row.teamId)">
                <q-td>
                  <q-chip dense color="primary" text-color="white">{{ row.prefixo }}</q-chip>
                  <span class="q-ml-xs text-caption text-grey-5">{{ row.nomeEquipe }}</span>
                </q-td>
                <q-td class="text-center">
                  <q-badge color="positive" :label="row.total"
                    style="font-size: 0.95rem; padding: 4px 14px;" />
                </q-td>
                <q-td>
                  <q-chip
                    v-for="(nome, idx) in row.atividadeNomes"
                    :key="idx"
                    dense color="blue-grey-8" text-color="white"
                    size="sm" class="q-mr-xs q-mb-xs"
                  >{{ nome }}</q-chip>
                </q-td>
                <q-td>
                  <q-chip
                    v-for="(nome, idx) in row.colaboradores"
                    :key="idx"
                    dense icon="person" color="primary" text-color="white"
                    size="sm" class="q-mb-xs q-mr-xs"
                  >{{ nome }}</q-chip>
                </q-td>
                <q-td class="text-center">
                  <q-icon
                    :name="expanded.includes(row.teamId) ? 'expand_less' : 'expand_more'"
                    color="grey" size="20px"
                  />
                </q-td>
              </tr>

              <!-- Linhas de detalhe por serviço -->
              <template v-if="expanded.includes(row.teamId)">
                <tr
                  v-for="svc in row.servicos"
                  :key="svc.id"
                  class="bg-grey-10 detail-row"
                >
                  <q-td colspan="2" class="q-pl-xl text-caption text-grey-4">
                    <q-icon name="chevron_right" size="14px" />
                    {{ formatTime(svc.created_at) }}
                  </q-td>
                  <q-td class="text-caption">{{ svc.activity_name }}</q-td>
                  <q-td class="text-caption text-grey-4">
                    {{ (svc.colaboradores || []).join(', ') }}
                  </q-td>
                  <q-td />
                </tr>
              </template>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- ══════════════════════════════════════════════════════
           TAB SERVIÇOS — CRUD de tipos de serviço
      ══════════════════════════════════════════════════════ -->
      <q-tab-panel name="servicos" class="q-pa-none">
        <div class="flex items-center justify-between q-mb-md">
          <q-input
            v-model="search"
            outlined dense
            placeholder="Buscar serviço..."
            clearable
            style="max-width: 360px;"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
          <q-btn unelevated rounded color="primary" icon="add" label="Novo Serviço" @click="openForm()" />
        </div>

        <q-card flat bordered style="border-radius: 16px;">
          <q-table
            :rows="filtered"
            :columns="colsServicos"
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
      </q-tab-panel>
    </q-tab-panels>

    <!-- Dialog CRUD serviço -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 420px; border-radius: 16px;">
        <q-card-section class="text-h6 text-weight-bold">
          {{ editing ? 'Editar serviço' : 'Novo serviço' }}
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-lg">
          <q-input v-model="form.nome" label="Nome *" outlined dense class="q-mb-md"
            :rules="[v => !!v || 'Obrigatório']" />
          <q-input v-model="form.descricao" label="Descrição" outlined dense
            type="textarea" rows="2" class="q-mb-md" />
          <q-select v-model="form.tipo" :options="tipoOptions" label="Tipo *"
            outlined dense emit-value map-options class="q-mb-md" />
          <q-select v-model="form.status" :options="['ativo', 'inativo']"
            label="Status" outlined dense />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated rounded color="primary"
            :label="editing ? 'Salvar' : 'Criar'"
            :loading="saving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useActivitiesStore } from 'src/stores/activities'
import { useTeamsStore } from 'src/stores/teams'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'

const activitiesStore = useActivitiesStore()
const teamsStore = useTeamsStore()
const $q = useQuasar()

const tab = ref('atividades')

// ── Aba ATIVIDADES ──────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]
const atividadesDate = ref(today)
const atividadesTeam = ref(null)
const loadingAtividades = ref(false)
const servicesData = ref([])
const expanded = ref([])

const teamOptions = computed(() =>
  teamsStore.teams.map(t => ({ label: `${t.prefixo} — ${t.nome}`, value: t.id }))
)

const totalServicos = computed(() => servicesData.value.length)

const resumoEquipes = computed(() => {
  const map = {}
  for (const svc of servicesData.value) {
    const tid = svc.team_id
    if (!map[tid]) {
      map[tid] = {
        teamId: tid,
        prefixo: svc.teams?.prefixo || '—',
        nomeEquipe: svc.teams?.nome || '',
        total: 0,
        atividadeNomes: [],
        colaboradores: [],
        servicos: []
      }
    }
    map[tid].total++
    map[tid].servicos.push(svc)
    if (svc.activity_name && !map[tid].atividadeNomes.includes(svc.activity_name)) {
      map[tid].atividadeNomes.push(svc.activity_name)
    }
    for (const c of (svc.colaboradores || [])) {
      if (!map[tid].colaboradores.includes(c)) map[tid].colaboradores.push(c)
    }
  }
  return Object.values(map).sort((a, b) => a.prefixo.localeCompare(b.prefixo))
})

const colsResumo = [
  { name: 'equipe',        label: 'Equipe',        field: 'prefixo',       align: 'left',   sortable: true },
  { name: 'total',         label: 'Serviços',      field: 'total',         align: 'center', sortable: true },
  { name: 'atividades',    label: 'Atividades',    field: 'atividadeNomes', align: 'left'  },
  { name: 'colaboradores', label: 'Colaboradores', field: 'colaboradores', align: 'left'  },
  { name: 'expand',        label: '',              field: 'expand',        align: 'center' }
]

function toggleExpand (teamId) {
  const idx = expanded.value.indexOf(teamId)
  if (idx === -1) expanded.value.push(teamId)
  else expanded.value.splice(idx, 1)
}

async function loadAtividades () {
  loadingAtividades.value = true
  try {
    let query = supabase
      .from('services')
      .select('id, team_id, activity_name, colaboradores, created_at, teams(prefixo, nome)')
      .order('created_at', { ascending: false })

    if (atividadesDate.value) {
      const start = atividadesDate.value + 'T00:00:00'
      const end   = atividadesDate.value + 'T23:59:59'
      query = query.gte('created_at', start).lte('created_at', end)
    }
    if (atividadesTeam.value) {
      query = query.eq('team_id', atividadesTeam.value)
    }

    const { data, error } = await query
    if (error) throw error
    servicesData.value = data || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar atividades: ' + e.message })
  } finally {
    loadingAtividades.value = false
  }
}

function formatTime (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── Aba SERVIÇOS ────────────────────────────────────────────────
const search = ref('')
const showForm = ref(false)
const saving = ref(false)
const editing = ref(null)
const form = ref({ nome: '', descricao: '', tipo: 'servico', status: 'ativo' })

const tipoOptions = [
  { label: 'Serviço',    value: 'servico'    },
  { label: 'Manutenção', value: 'manutencao' },
  { label: 'Inspeção',   value: 'inspecao'   },
  { label: 'Emergência', value: 'emergencia' }
]

const colsServicos = [
  { name: 'nome',    label: 'Nome',      field: 'nome',    align: 'left',   sortable: true },
  { name: 'tipo',    label: 'Tipo',      field: 'tipo',    align: 'left',   sortable: true },
  { name: 'descricao', label: 'Descrição', field: 'descricao', align: 'left' },
  { name: 'status',  label: 'Status',    field: 'status',  align: 'center', sortable: true },
  { name: 'acoes',   label: 'Ações',     field: 'acoes',   align: 'right'  }
]

const filtered = computed(() =>
  activitiesStore.activities.filter(a =>
    !search.value ||
    a.nome?.toLowerCase().includes(search.value.toLowerCase()) ||
    a.descricao?.toLowerCase().includes(search.value.toLowerCase())
  )
)

function tipoLabel (tipo) {
  return tipoOptions.find(t => t.value === tipo)?.label || tipo
}

function tipoColor (tipo) {
  return { servico: 'primary', manutencao: 'orange', inspecao: 'teal', emergencia: 'negative' }[tipo] || 'grey'
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
      await activitiesStore.fetchActivities()
      search.value = nome
    }
    showForm.value = false
    $q.notify({ type: 'positive', message: 'Serviço salvo com sucesso!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + (e.message || JSON.stringify(e)) })
  } finally {
    saving.value = false
  }
}

function confirmDelete (activity) {
  $q.dialog({
    title: 'Excluir serviço',
    message: `Tem certeza que deseja excluir "${activity.nome}"?`,
    cancel: true,
    color: 'negative'
  }).onOk(async () => {
    try {
      await activitiesStore.deleteActivity(activity.id)
      $q.notify({ type: 'positive', message: 'Serviço excluído.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message })
    }
  })
}

// ── Init ────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    activitiesStore.fetchActivities(),
    teamsStore.fetchTeams(),
    loadAtividades()
  ])
})
</script>

<style scoped>
.detail-row td {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}
</style>
