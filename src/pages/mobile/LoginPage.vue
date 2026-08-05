<template>
  <q-page class="mobile-page flex column items-center justify-center q-pa-lg">
    <!-- Logo -->
    <div class="text-center q-mb-xl">
      <img src="/favicon.ico" alt="CGB Energia" class="company-logo-mobile" />
      <div class="text-h5 text-weight-bold text-white q-mt-sm">SIDI-E</div>
      <div class="text-caption text-grey-4">Sistema de Inspeções</div>
    </div>

    <q-card class="full-width" style="max-width: 400px; border-radius: 16px;">
      <q-card-section class="q-pa-lg">
        <div class="text-h6 text-weight-bold q-mb-lg">Entrar como equipe</div>

        <!-- Prefixo com autocomplete das equipes -->
        <q-select
          v-model="equipeEncontrada"
          :options="filteredTeams"
          option-value="id"
          option-label="prefixo"
          label="Prefixo da equipe *"
          outlined
          dense
          use-input
          clearable
          class="q-mb-md"
          :rules="[v => !!v || 'Informe o prefixo']"
          input-debounce="200"
          :loading="teamsLoading"
          @filter="filterTeams"
          @update:model-value="onEquipeSelecionada"
          @blur="buscarEquipePorDigitacao"
        >
          <template #prepend>
            <q-icon name="badge" />
          </template>
          <template #append>
            <q-spinner-dots v-if="buscandoEquipe" size="18px" color="primary" />
          </template>
          <template #option="{ itemProps, opt }">
            <q-item v-bind="itemProps">
              <q-item-section avatar>
                <q-avatar size="32px" color="primary" text-color="white" style="font-size:0.75rem;font-weight:700;">
                  {{ opt.prefixo.charAt(0) }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ opt.prefixo }}</q-item-label>
                <q-item-label caption>{{ opt.nome }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
          <template #no-option="{ inputValue }">
            <q-item>
              <q-item-section class="text-grey">
                {{ inputValue ? `Nenhuma equipe encontrada para "${inputValue}"` : 'Digite o prefixo da equipe' }}
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <!-- Equipe selecionada -->
        <q-input
          v-if="equipeEncontrada"
          :model-value="equipeEncontrada.nome"
          label="Responsável"
          outlined
          dense
          readonly
          dark
          class="q-mb-md equipe-confirmada"
        >
          <template #prepend><q-icon name="check_circle" color="positive" /></template>
        </q-input>

        <!-- Equipe não encontrada -->
        <div v-if="equipeNaoEncontrada" class="q-mb-md">
          <div class="text-negative text-caption q-mb-sm">
            <q-icon name="error" /> Equipe "{{ form.prefixo }}" não encontrada.
          </div>
          <q-card flat class="bg-orange-1" style="border-radius: 10px; border: 1px solid #ff9800;">
            <q-card-section class="q-pa-sm">
              <div class="text-caption text-orange-9 q-mb-xs">
                <q-icon name="info" /> Equipe não cadastrada no sistema.
              </div>
              <q-btn
                v-if="!solicitacaoEnviada"
                unelevated rounded color="orange" icon="send"
                label="Solicitar Cadastro ao Admin"
                class="full-width q-mt-xs" size="sm"
                :loading="enviandoSolicitacao"
                @click="solicitarCadastro"
              />
              <div v-else class="text-positive text-caption text-center q-mt-xs">
                <q-icon name="check_circle" /> Solicitação enviada! Aguarde aprovação do administrador.
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Collaborators -->
        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-bold q-mb-sm">
            <q-icon name="people" class="q-mr-xs" />
            Colaboradores presentes *
          </div>

          <div v-for="(col, idx) in form.colaboradores" :key="idx" class="q-mb-sm">

            <!-- Estado: validado/cadastrado -->
            <div v-if="col.validated" class="collab-chip row items-center justify-between q-pa-sm q-mb-xs">
              <div class="row items-center gap-sm">
                <q-icon name="check_circle" color="positive" size="20px" />
                <span class="text-weight-bold text-white q-ml-xs">{{ col.nome }}</span>
                <q-badge
                  :color="col.isNew ? 'primary' : 'positive'"
                  :label="col.isNew ? 'Cadastrado' : 'Identificado'"
                  dense class="q-ml-xs"
                />
              </div>
              <div class="row items-center">
                <q-btn flat dense round icon="edit" size="xs" color="grey-4"
                  @click="editarColaborador(col)" title="Alterar nome" />
                <q-btn v-if="form.colaboradores.length > 1" flat dense round icon="close"
                  size="xs" color="negative" @click="removeColaborador(idx)" />
              </div>
            </div>

            <!-- Estado: carregando/validando -->
            <div v-else-if="col.validating"
              class="collab-loading row items-center justify-center q-pa-sm">
              <q-spinner-dots size="20px" color="primary" />
              <span class="text-caption text-grey-4 q-ml-sm">Cadastrando {{ col.nome }}...</span>
            </div>

            <!-- Estado: digitando -->
            <div v-else class="row items-center gap-sm">
              <q-select
                :model-value="col.nome"
                :options="filteredCollabs"
                :label="`Colaborador ${idx + 1}`"
                outlined dense use-input fill-input hide-selected
                new-value-mode="add-unique"
                input-debounce="0"
                behavior="menu"
                class="col input-upper"
                @filter="filterCollab"
                @update:model-value="v => onCollabSelected(col, v)"
                @blur="ev => onCollabBlur(col, ev)"
              >
                <template #prepend><q-icon name="person" /></template>
                <template #no-option="{ inputValue }">
                  <q-item v-if="inputValue" clickable @click="onCollabSelected(col, inputValue)">
                    <q-item-section class="text-caption text-primary">
                      <q-icon name="person_add" size="16px" class="q-mr-xs" />
                      Cadastrar "{{ inputValue.toUpperCase() }}"
                    </q-item-section>
                  </q-item>
                  <q-item v-else>
                    <q-item-section class="text-grey text-caption">
                      {{ equipeEncontrada ? 'Nenhum colaborador cadastrado ainda' : 'Selecione a equipe primeiro' }}
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-btn v-if="form.colaboradores.length > 1" flat round dense
                icon="remove_circle" color="negative" @click="removeColaborador(idx)" />
            </div>

          </div>

          <q-btn flat dense icon="add" label="Adicionar colaborador"
            color="primary" class="q-mt-xs" @click="addColaborador" />
        </div>

        <!-- Date -->
        <q-input
          v-model="form.data"
          label="Data *"
          outlined dense type="date"
          class="q-mb-lg"
        />

        <!-- Hint quando faltam colaboradores validados -->
        <div v-if="equipeEncontrada && colaboradoresPendentes > 0" class="text-caption text-orange q-mb-sm">
          <q-icon name="info" />
          {{ colaboradoresPendentes }} colaborador(es) aguardando validação
        </div>

        <!-- Login button -->
        <q-btn
          unelevated rounded color="primary"
          label="Iniciar Turno"
          icon="play_circle"
          class="full-width"
          size="lg"
          :loading="loading"
          :disable="!podeEntrar"
          @click="login"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { offlineDB } from 'src/services/localDB'
import { supabase } from 'src/services/supabase'
import { useQuasar } from 'quasar'
import { useOnlineStore } from 'src/stores/online'

const router = useRouter()
const authStore = useAuthStore()
const onlineStore = useOnlineStore()
const $q = useQuasar()

const loading = ref(false)
const buscandoEquipe = ref(false)
const equipeEncontrada = ref(null)
const equipeNaoEncontrada = ref(false)
const enviandoSolicitacao = ref(false)
const solicitacaoEnviada = ref(false)

const allTeams = ref([])
const teamsLoading = ref(false)
const teamInput = ref('')

const teamCollaborators = ref([])
const filteredCollabs = ref([])
const collabFilterInput = ref('')

// Re-aplica o filtro atual quando os colaboradores carregam (resolve race condition)
watch(teamCollaborators, (val) => {
  const needle = collabFilterInput.value.toUpperCase()
  filteredCollabs.value = needle ? val.filter(n => n.includes(needle)) : val
})

// ── Computed ──────────────────────────────────────────────────────────
const filteredTeams = computed(() => {
  if (!teamInput.value) return allTeams.value
  const needle = teamInput.value.toUpperCase()
  return allTeams.value.filter(t =>
    t.prefixo.includes(needle) || (t.nome || '').toUpperCase().includes(needle)
  )
})

const today = new Date().toISOString().split('T')[0]

const form = ref({
  prefixo: '',
  colaboradores: [{ nome: '', validated: false, validating: false, isNew: false }],
  data: today
})

const colaboradoresPendentes = computed(() =>
  form.value.colaboradores.filter(c => !c.validated && !c.validating).length
)

const podeEntrar = computed(() =>
  equipeEncontrada.value &&
  form.value.colaboradores.length > 0 &&
  form.value.colaboradores.every(c => c.validated)
)

// ── Teams ─────────────────────────────────────────────────────────────
onMounted(async () => {
  teamsLoading.value = true
  try {
    if (onlineStore.isOnline) {
      const { data, error } = await supabase.from('teams').select('*').order('prefixo')
      if (error) throw error
      allTeams.value = data || []
    } else {
      allTeams.value = await offlineDB.getTeams?.() || []
    }
    if (allTeams.value.length) {
      for (const t of allTeams.value) await offlineDB.saveTeam({ ...t })
    }
  } catch (e) {
    console.error('Erro ao carregar equipes:', e)
    allTeams.value = await offlineDB.getTeams?.() || []
  } finally {
    teamsLoading.value = false
  }
})

function filterTeams (val, update) {
  teamInput.value = val
  update()
}

function onEquipeSelecionada (equipe) {
  if (equipe) {
    form.value.prefixo = equipe.prefixo
    equipeNaoEncontrada.value = false
    solicitacaoEnviada.value = false
    // Reseta colaboradores ao trocar equipe
    form.value.colaboradores = [{ nome: '', validated: false, validating: false, isNew: false }]
    loadTeamCollaborators(equipe.id)
  } else {
    form.value.prefixo = ''
    equipeNaoEncontrada.value = false
    teamCollaborators.value = []
    filteredCollabs.value = []
    form.value.colaboradores = [{ nome: '', validated: false, validating: false, isNew: false }]
  }
}

async function buscarEquipePorDigitacao () {
  if (equipeEncontrada.value) return
  const prefixo = form.value.prefixo.trim().toUpperCase()
  if (!prefixo) return

  const local = allTeams.value.find(t => t.prefixo === prefixo)
  if (local) {
    equipeEncontrada.value = local
    equipeNaoEncontrada.value = false
    return
  }

  buscandoEquipe.value = true
  equipeNaoEncontrada.value = false
  solicitacaoEnviada.value = false
  try {
    if (onlineStore.isOnline) {
      const { data, error } = await supabase.from('teams').select('*').eq('prefixo', prefixo).single()
      if (error) throw error
      equipeEncontrada.value = data || null
    } else {
      equipeEncontrada.value = await offlineDB.getTeamByPrefixo(prefixo)
    }
    equipeNaoEncontrada.value = !equipeEncontrada.value
  } catch {
    equipeEncontrada.value = await offlineDB.getTeamByPrefixo(prefixo)
    equipeNaoEncontrada.value = !equipeEncontrada.value
  } finally {
    buscandoEquipe.value = false
  }
}

// ── Collaborators ─────────────────────────────────────────────────────
async function loadTeamCollaborators (teamId) {
  teamCollaborators.value = []
  filteredCollabs.value = []
  if (!teamId) return
  try {
    if (onlineStore.isOnline) {
      const { data } = await supabase
        .from('collaborators').select('nome').eq('team_id', teamId).order('nome')
      const unique = [...new Set((data || []).map(c => c.nome.trim().toUpperCase()))]
      teamCollaborators.value = unique
      filteredCollabs.value = unique
    } else {
      const local = await offlineDB.getCollaboratorsByTeam(teamId)
      const unique = [...new Set(local.map(c => c.nome.trim().toUpperCase()))]
      teamCollaborators.value = unique
      filteredCollabs.value = unique
    }
  } catch { /* silencioso */ }
}

function filterCollab (val, update) {
  collabFilterInput.value = val || ''
  update(() => {
    const needle = collabFilterInput.value.toUpperCase()
    filteredCollabs.value = needle
      ? teamCollaborators.value.filter(n => n.includes(needle))
      : teamCollaborators.value
  })
}

// Chamado ao selecionar do dropdown OU ao digitar e confirmar via new-value-mode
function onCollabSelected (col, v) {
  if (!v) return
  col.nome = (v || '').toUpperCase()
  validarColaborador(col)
}

// Chamado ao perder foco (blur) com texto digitado mas não confirmado
function onCollabBlur (col, ev) {
  const v = ev?.target?.value?.trim()
  if (v && !col.validated && !col.validating) {
    col.nome = v.toUpperCase()
    validarColaborador(col)
  }
}

// Valida e auto-cadastra o colaborador
async function validarColaborador (col) {
  const nome = col.nome.trim().toUpperCase()
  if (!nome || !equipeEncontrada.value?.id) return

  col.nome = nome
  col.validating = true
  col.validated = false

  try {
    if (onlineStore.isOnline) {
      // Verifica se já existe no banco
      const { data: existing } = await supabase
        .from('collaborators')
        .select('id')
        .eq('team_id', equipeEncontrada.value.id)
        .ilike('nome', nome)
        .maybeSingle()

      if (existing) {
        col.isNew = false
      } else {
        // Auto-cadastra
        await supabase.from('collaborators').insert({
          team_id: equipeEncontrada.value.id,
          nome
        })
        col.isNew = true
        // Adiciona às sugestões locais
        if (!teamCollaborators.value.includes(nome)) {
          teamCollaborators.value = [...teamCollaborators.value, nome].sort()
        }
        // Salva no IndexedDB para uso offline
        await offlineDB.saveCollaborator({ teamId: equipeEncontrada.value.id, nome })
      }
      col.validated = true
    } else {
      // Offline: valida localmente, sincroniza depois
      col.isNew = !teamCollaborators.value.includes(nome)
      col.validated = true
      if (col.isNew) {
        await offlineDB.saveCollaborator({ teamId: equipeEncontrada.value.id, nome })
      }
    }
  } catch (e) {
    col.validated = false
    $q.notify({ type: 'negative', message: 'Erro ao validar colaborador: ' + e.message })
  } finally {
    col.validating = false
  }
}

function editarColaborador (col) {
  col.validated = false
  col.isNew = false
  col.nome = ''
}

function addColaborador () {
  form.value.colaboradores.push({ nome: '', validated: false, validating: false, isNew: false })
}

function removeColaborador (idx) {
  form.value.colaboradores.splice(idx, 1)
}

async function solicitarCadastro () {
  if (!onlineStore.isOnline) {
    $q.notify({ type: 'warning', message: 'Sem internet. Conecte-se para solicitar o cadastro.' })
    return
  }
  enviandoSolicitacao.value = true
  try {
    const { error } = await supabase
      .from('team_requests')
      .insert({ prefixo: form.value.prefixo.trim().toUpperCase() })
    if (error) throw error
    solicitacaoEnviada.value = true
    $q.notify({ type: 'positive', message: 'Solicitação enviada! O administrador será notificado.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao enviar solicitação: ' + e.message })
  } finally {
    enviandoSolicitacao.value = false
  }
}

async function login () {
  loading.value = true
  try {
    const nomes = form.value.colaboradores
      .filter(c => c.validated && c.nome.trim())
      .map(c => c.nome.trim().toUpperCase())

    authStore.mobileLogin({
      prefixo: form.value.prefixo.toUpperCase(),
      equipeId: equipeEncontrada.value.id,
      equipeName: equipeEncontrada.value.nome,
      colaboradores: nomes,
      data: form.value.data
    })
    router.replace('/m/home')
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.company-logo-mobile {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

/* Chip de colaborador validado */
.collab-chip {
  background: rgba(67, 160, 71, 0.12);
  border: 1px solid rgba(67, 160, 71, 0.4);
  border-radius: 10px;
}

/* Loading de colaborador */
.collab-loading {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  min-height: 48px;
}

/* Campo equipe confirmada */
:deep(.equipe-confirmada .q-field__native) {
  color: #e8f5e9 !important;
  font-weight: 600;
}
:deep(.equipe-confirmada .q-field__control) {
  border-color: #43a047 !important;
  background: rgba(67, 160, 71, 0.08) !important;
}
:deep(.equipe-confirmada .q-field__label) {
  color: #66bb6a !important;
}

/* Colaboradores sempre em maiúsculas visualmente */
:deep(.input-upper .q-field__native) {
  text-transform: uppercase;
}
</style>
