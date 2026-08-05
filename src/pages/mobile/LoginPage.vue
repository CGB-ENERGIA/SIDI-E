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

          <!-- Solicitação de cadastro -->
          <q-card flat class="bg-orange-1" style="border-radius: 10px; border: 1px solid #ff9800;">
            <q-card-section class="q-pa-sm">
              <div class="text-caption text-orange-9 q-mb-xs">
                <q-icon name="info" /> Equipe não cadastrada no sistema.
              </div>
              <q-btn
                v-if="!solicitacaoEnviada"
                unelevated
                rounded
                color="orange"
                icon="send"
                label="Solicitar Cadastro ao Admin"
                class="full-width q-mt-xs"
                size="sm"
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

          <div
            v-for="(col, idx) in form.colaboradores"
            :key="idx"
            class="flex items-center gap-sm q-mb-sm"
          >
            <q-select
              :model-value="col.nome"
              @update:model-value="v => col.nome = (v || '').toUpperCase()"
              @input-value="v => col.nome = v.toUpperCase()"
              :options="filteredCollabs"
              :label="`Colaborador ${idx + 1}`"
              outlined
              dense
              use-input
              new-value-mode="add-unique"
              input-debounce="150"
              class="col input-upper"
              :rules="[v => !!v || 'Informe o nome']"
              @filter="filterCollab"
            >
              <template #prepend><q-icon name="person" /></template>
              <template #no-option="{ inputValue }">
                <q-item>
                  <q-item-section class="text-grey text-caption">
                    {{ inputValue ? 'Novo colaborador: ' + inputValue.toUpperCase() : 'Nenhum colaborador salvo' }}
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-btn
              v-if="form.colaboradores.length > 1"
              flat
              round
              dense
              icon="remove_circle"
              color="negative"
              @click="removeColaborador(idx)"
            />
          </div>

          <q-btn
            flat
            dense
            icon="add"
            label="Adicionar colaborador"
            color="primary"
            @click="addColaborador"
          />
        </div>

        <!-- Date -->
        <q-input
          v-model="form.data"
          label="Data *"
          outlined
          dense
          type="date"
          class="q-mb-lg"
        />

        <!-- Login button -->
        <q-btn
          unelevated
          rounded
          color="primary"
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
import { ref, computed, onMounted } from 'vue'
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

// ── Colaboradores com sugestões ───────────────────────────
const teamCollaborators = ref([]) // nomes salvos da equipe selecionada
const filteredCollabs   = ref([]) // filtrado enquanto digita

async function loadTeamCollaborators (teamId) {
  teamCollaborators.value = []
  filteredCollabs.value   = []
  if (!teamId || !onlineStore.isOnline) return
  try {
    const { data } = await supabase
      .from('collaborators')
      .select('nome')
      .eq('team_id', teamId)
      .order('nome')
    const unique = [...new Set((data || []).map(c => c.nome.trim().toUpperCase()))]
    teamCollaborators.value = unique
    filteredCollabs.value   = unique
  } catch { /* silencioso */ }
}

function filterCollab (val, update) {
  update(() => {
    const needle = (val || '').toUpperCase()
    filteredCollabs.value = needle
      ? teamCollaborators.value.filter(n => n.includes(needle))
      : teamCollaborators.value
  })
}

async function saveNovoColaborador (nome, teamId) {
  if (!nome || !teamId || !onlineStore.isOnline) return
  const jaExiste = teamCollaborators.value.includes(nome.toUpperCase())
  if (jaExiste) return
  try {
    await supabase.from('collaborators').insert({ team_id: teamId, nome: nome.toUpperCase() })
    teamCollaborators.value = [...teamCollaborators.value, nome.toUpperCase()].sort()
  } catch { /* silencioso */ }
}

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
  colaboradores: [{ nome: '' }],
  data: today
})

const podeEntrar = computed(() =>
  equipeEncontrada.value &&
  form.value.colaboradores.every(c => c.nome.trim())
)

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
    // Salva no IndexedDB para uso offline
    if (allTeams.value.length) {
      for (const t of allTeams.value) await offlineDB.saveTeam(t)
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
    loadTeamCollaborators(equipe.id)
  } else {
    form.value.prefixo = ''
    equipeNaoEncontrada.value = false
    teamCollaborators.value = []
    filteredCollabs.value   = []
  }
}

async function buscarEquipePorDigitacao () {
  // Só busca manualmente se nada foi selecionado na lista
  if (equipeEncontrada.value) return
  const prefixo = form.value.prefixo.trim().toUpperCase()
  if (!prefixo) return

  // Tenta achar na lista local primeiro
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
    $q.notify({
      type: 'positive',
      message: 'Solicitação enviada! O administrador será notificado.'
    })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao enviar solicitação: ' + e.message })
  } finally {
    enviandoSolicitacao.value = false
  }
}

function addColaborador () {
  form.value.colaboradores.push({ nome: '' })
}

function removeColaborador (idx) {
  form.value.colaboradores.splice(idx, 1)
}

async function login () {
  loading.value = true
  try {
    const nomes = form.value.colaboradores.map(c => c.nome.trim().toUpperCase()).filter(Boolean)

    // Salva colaboradores novos no banco em paralelo
    if (equipeEncontrada.value?.id && onlineStore.isOnline) {
      await Promise.allSettled(nomes.map(n => saveNovoColaborador(n, equipeEncontrada.value.id)))
    }

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

/* Campo equipe confirmada — texto visível no tema escuro */
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
