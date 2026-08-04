<template>
  <q-page class="mobile-page q-pa-md">
    <div class="text-h6 text-weight-bold q-mb-md">
      Novo Serviço
    </div>

    <!-- Step indicator -->
    <q-stepper
      v-model="step"
      color="primary"
      animated
      alternative-labels
      class="q-mb-md shadow-0"
    >
      <q-step :name="1" title="EPI" icon="safety_check" :done="step > 1">
        Verificação de EPIs
      </q-step>
      <q-step :name="2" title="Atividade" icon="task" :done="step > 2">
        Registro da atividade
      </q-step>
      <q-step :name="3" title="Concluir" icon="check_circle">
        Finalizar
      </q-step>
    </q-stepper>

    <!-- Step 1: EPI photos (2 required) -->
    <div v-if="step === 1">
      <q-card flat bordered class="q-mb-md" style="border-radius: 12px;">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-xs">
            <q-icon name="safety_check" color="primary" class="q-mr-xs" />
            Verificação de EPIs
          </div>
          <div class="text-caption text-grey-6 q-mb-md">
            Tire <strong>2 fotos</strong> do eletricista com todos os equipamentos de proteção.
          </div>

          <!-- EPI photo count requirement -->
          <div class="flex justify-between items-center q-mb-sm">
            <span class="text-caption">Fotos tiradas:</span>
            <q-badge
              :color="epiPhotos.length >= 2 ? 'positive' : 'orange'"
              :label="`${epiPhotos.length} / 2`"
              text-color="white"
            />
          </div>

          <!-- EPI photos grid -->
          <div class="photo-grid q-mb-md" v-if="epiPhotos.length">
            <div v-for="(photo, idx) in epiPhotos" :key="idx" class="relative-position">
              <img :src="photo.previewUrl" class="photo-thumb" />
              <q-btn
                round
                dense
                icon="close"
                color="negative"
                size="xs"
                class="absolute-top-right q-ma-xs"
                @click="removeEpiPhoto(idx)"
              />
            </div>
            <!-- Empty slot -->
            <div
              v-if="epiPhotos.length < 2"
              class="flex items-center justify-center bg-grey-2 rounded-borders cursor-pointer"
              style="aspect-ratio: 1; border: 2px dashed #ccc; border-radius: 8px;"
              @click="openCamera('epi')"
            >
              <q-icon name="add_a_photo" size="28px" color="grey-5" />
            </div>
          </div>

          <!-- Add EPI photo button -->
          <q-btn
            v-if="epiPhotos.length === 0"
            unelevated
            rounded
            color="primary"
            icon="camera_alt"
            label="Tirar foto do EPI"
            class="full-width"
            @click="openCamera('epi')"
          />
          <q-btn
            v-else-if="epiPhotos.length < 2"
            outline
            rounded
            color="primary"
            icon="add_a_photo"
            label="Segunda foto do EPI"
            class="full-width"
            @click="openCamera('epi')"
          />
        </q-card-section>
      </q-card>

      <q-btn
        unelevated
        rounded
        color="primary"
        label="Próximo"
        icon-right="arrow_forward"
        class="full-width"
        size="lg"
        :disable="epiPhotos.length < 2"
        @click="step = 2"
      />
    </div>

    <!-- Step 2: Activity -->
    <div v-if="step === 2">
      <!-- Select or type activity -->
      <q-select
        v-model="form.activity"
        :options="filteredActivities"
        option-label="nome"
        label="Atividade / Serviço *"
        outlined
        class="q-mb-md"
        :rules="[v => !!v || 'Informe a atividade']"
        use-input
        input-debounce="0"
        new-value-mode="add-unique"
        @filter="filterActivities"
        @new-value="createActivity"
        hint="Selecione da lista ou digite um serviço personalizado"
      >
        <template #prepend><q-icon name="task" /></template>
        <template #no-option="{ inputValue }">
          <q-item clickable @click="createActivity(inputValue, v => { form.activity = v })">
            <q-item-section>
              <q-item-label class="text-primary">
                <q-icon name="add" /> Adicionar "{{ inputValue }}"
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>

      <!-- Description -->
      <q-input
        v-model="form.descricao"
        label="Observações (opcional)"
        outlined
        type="textarea"
        rows="2"
        class="q-mb-md"
      />

      <div class="flex gap-sm">
        <q-btn outline rounded color="grey" label="Voltar" class="col" @click="step = 1" />
        <q-btn
          unelevated
          rounded
          color="primary"
          label="Próximo"
          icon-right="arrow_forward"
          class="col"
          :disable="!form.activity"
          @click="step = 3"
        />
      </div>
    </div>

    <!-- Step 3: Confirm -->
    <div v-if="step === 3">
      <q-card flat bordered class="q-mb-md" style="border-radius: 12px;">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-md">Resumo do registro</div>

          <q-list dense>
            <q-item>
              <q-item-section avatar><q-icon name="badge" color="primary" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Equipe</q-item-label>
                <q-item-label>{{ session.prefixo }} — {{ session.equipeName }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="task" color="primary" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Atividade</q-item-label>
                <q-item-label>{{ selectedActivityName }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="safety_check" color="positive" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Fotos EPI</q-item-label>
                <q-item-label>{{ epiPhotos.length }} foto(s) ✓</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <q-card v-if="!onlineStore.isOnline" flat class="bg-orange-1 q-mb-md" style="border-radius: 12px;">
        <q-card-section class="q-pa-sm text-orange-9">
          <q-icon name="wifi_off" class="q-mr-xs" />
          Sem internet — dados salvos localmente e enviados quando houver conexão.
        </q-card-section>
      </q-card>

      <div class="flex gap-sm">
        <q-btn outline rounded color="grey" label="Voltar" class="col" @click="step = 2" />
        <q-btn
          unelevated
          rounded
          color="positive"
          label="Salvar"
          icon="save"
          class="col"
          :loading="saving"
          @click="saveService"
        />
      </div>
    </div>

    <!-- Camera modal -->
    <CameraCapture
      v-if="showCamera"
      :tipo="cameraTipo"
      :equipe="`${session.prefixo} — ${session.equipeName}`"
      @captured="onPhotoCaptured"
      @cancel="showCamera = false"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { useEvidenceStore } from 'src/stores/evidence'
import { useOnlineStore } from 'src/stores/online'
import { supabase } from 'src/services/supabase'
import { offlineDB } from 'src/services/localDB'
import { useQuasar } from 'quasar'
import CameraCapture from 'src/components/mobile/CameraCapture.vue'

const router = useRouter()
const authStore = useAuthStore()
const evidenceStore = useEvidenceStore()
const onlineStore = useOnlineStore()
const $q = useQuasar()

const session = authStore.mobileSession
const step = ref(1)
const saving = ref(false)
const showCamera = ref(false)
const cameraTipo = ref('epi')
const activities = ref([])

const epiPhotos = ref([])
const filteredActivities = ref([])

const form = ref({
  activity: null,
  activityLabel: '',
  descricao: ''
})

const selectedActivityName = computed(() => {
  if (!form.value.activity) return ''
  if (typeof form.value.activity === 'string') return form.value.activity
  return form.value.activity.nome || ''
})

function filterActivities (val, update) {
  update(() => {
    if (!val) {
      filteredActivities.value = activities.value
    } else {
      const needle = val.toLowerCase()
      filteredActivities.value = activities.value.filter(a => a.nome.toLowerCase().includes(needle))
    }
  })
}

function createActivity (val, done) {
  if (val.trim()) {
    done(val.trim(), 'add-unique')
  }
}

onMounted(async () => {
  const testMode = import.meta.env.VITE_TEST_MODE === 'true'
  try {
    if (onlineStore.isOnline && !testMode) {
      const { data, error } = await supabase.from('activities').select('*').order('nome')
      if (error) throw error
      activities.value = data || []
    } else {
      activities.value = await offlineDB.getActivities()
    }
  } catch {
    activities.value = await offlineDB.getActivities()
  }
  filteredActivities.value = activities.value
})

function openCamera (tipo) {
  cameraTipo.value = tipo
  showCamera.value = true
}

function onPhotoCaptured (blob) {
  const previewUrl = URL.createObjectURL(blob)
  epiPhotos.value.push({ blob, previewUrl })
  showCamera.value = false
}

function removeEpiPhoto (idx) {
  URL.revokeObjectURL(epiPhotos.value[idx].previewUrl)
  epiPhotos.value.splice(idx, 1)
}

async function saveService () {
  saving.value = true
  try {
    const serviceId = `local_${Date.now()}`

    // Save service record
    await offlineDB.saveService({
      id: serviceId,
      teamId: session.equipeId,
      activityId: typeof form.value.activity === 'object' ? form.value.activity?.id : null,
      activityName: selectedActivityName.value,
      descricao: form.value.descricao,
      colaboradores: session.colaboradores,
      data: session.data
    })

    // Save EPI photos locally
    for (const photo of epiPhotos.value) {
      await offlineDB.savePhoto({
        serviceId,
        tipo: 'epi',
        blob: photo.blob
      })
    }

    // Try immediate sync
    if (onlineStore.isOnline) {
      await evidenceStore.syncPending()
    }

    $q.notify({ type: 'positive', message: 'Serviço registrado com sucesso!' })
    router.replace('/m/home')
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar: ' + e.message })
  } finally {
    saving.value = false
  }
}
</script>
