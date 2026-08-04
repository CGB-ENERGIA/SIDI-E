<template>
  <q-page class="mobile-page flex column items-center justify-center q-pa-lg">
    <!-- Logo -->
    <div class="text-center q-mb-xl">
      <q-icon name="electrical_services" size="72px" color="primary" />
      <div class="text-h5 text-weight-bold text-white q-mt-sm">SIDI-E</div>
      <div class="text-caption text-grey-4">Sistema de Inspeções</div>
    </div>

    <q-card class="full-width" style="max-width: 400px; border-radius: 16px;">
      <q-card-section class="q-pa-lg">
        <div class="text-h6 text-weight-bold q-mb-lg">Entrar como equipe</div>

        <!-- Team prefix -->
        <q-input
          v-model="form.prefixo"
          label="Prefixo da equipe *"
          outlined
          dense
          class="q-mb-md"
          :rules="[v => !!v || 'Informe o prefixo']"
          hint="Ex: EQ-01, A-03"
          @blur="buscarEquipe"
        >
          <template #prepend>
            <q-icon name="badge" />
          </template>
          <template #append v-if="buscandoEquipe">
            <q-spinner-dots size="20px" color="primary" />
          </template>
        </q-input>

        <!-- Team name (auto-filled) -->
        <q-input
          v-if="equipeEncontrada"
          v-model="equipeEncontrada.nome"
          label="Equipe"
          outlined
          dense
          readonly
          class="q-mb-md"
          bg-color="green-1"
        >
          <template #prepend><q-icon name="check_circle" color="positive" /></template>
        </q-input>

        <div v-if="equipeNaoEncontrada" class="text-negative text-caption q-mb-md">
          <q-icon name="error" /> Equipe não encontrada. Verifique o prefixo.
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
            <q-input
              v-model="col.nome"
              :label="`Colaborador ${idx + 1}`"
              outlined
              dense
              class="col"
              :rules="[v => !!v || 'Informe o nome']"
            >
              <template #prepend><q-icon name="person" /></template>
            </q-input>
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
import { ref, computed } from 'vue'
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

const today = new Date().toISOString().split('T')[0]

const form = ref({
  prefixo: '',
  colaboradores: [{ nome: '' }],
  data: today
})

const podeEntrar = computed(() =>
  form.value.prefixo &&
  equipeEncontrada.value &&
  form.value.colaboradores.every(c => c.nome.trim())
)

async function buscarEquipe () {
  const prefixo = form.value.prefixo.trim().toUpperCase()
  if (!prefixo) return

  buscandoEquipe.value = true
  equipeEncontrada.value = null
  equipeNaoEncontrada.value = false

  try {
    const testMode = import.meta.env.VITE_TEST_MODE === 'true'
    if (onlineStore.isOnline && !testMode) {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('prefixo', prefixo)
        .single()
      if (error) throw error
      equipeEncontrada.value = data || null
    } else {
      equipeEncontrada.value = await offlineDB.getTeamByPrefixo(prefixo)
    }
    equipeNaoEncontrada.value = !equipeEncontrada.value
  } catch {
    // Try offline fallback
    equipeEncontrada.value = await offlineDB.getTeamByPrefixo(prefixo)
    equipeNaoEncontrada.value = !equipeEncontrada.value
  } finally {
    buscandoEquipe.value = false
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
    authStore.mobileLogin({
      prefixo: form.value.prefixo.toUpperCase(),
      equipeId: equipeEncontrada.value.id,
      equipeName: equipeEncontrada.value.nome,
      colaboradores: form.value.colaboradores.map(c => c.nome.trim()),
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
