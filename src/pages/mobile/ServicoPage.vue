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

    <!-- Step 2: Activity + photos -->
    <div v-if="step === 2">
      <!-- Select activity -->
      <q-select
        v-model="form.activity"
        :options="activities"
        option-label="nome"
        option-value="id"
        label="Atividade / Serviço *"
        outlined
        class="q-mb-md"
        :rules="[v => !!v || 'Selecione a atividade']"
        emit-value
        map-options
      >
        <template #prepend><q-icon name="task" /></template>
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

      <!-- Activity photos (min 2 per team) -->
      <div class="text-subtitle2 text-weight-bold q-mb-sm">
        <q-icon name="photo_library" class="q-mr-xs" />
        Fotos da atividade
        <q-badge
          :color="atividadePhotos.length >= minPhotos ? 'positive' : 'orange'"
          :label="`${atividadePhotos.length} / ${minPhotos} mín.`"
          class="q-ml-sm"
        />
      </div>

      <div class="text-caption text-grey-6 q-mb-sm">
        Mínimo de {{ minPhotos }} foto(s) por equipe.
        Você pode adicionar mais para melhor documentação.
      </div>

      <div class="photo-grid q-mb-md">
        <div v-for="(photo, idx) in atividadePhotos" :key="idx" class="relative-position">
          <img :src="photo.previewUrl" class="photo-thumb" />
          <q-btn
            round dense icon="close" color="negative" size="xs"
            class="absolute-top-right q-ma-xs"
            @click="removeAtividadePhoto(idx)"
          />
        </div>
        <!-- Add more button tile -->
        <div
          class="flex items-center justify-center bg-grey-2 rounded-borders cursor-pointer"
          style="aspect-ratio: 1; border: 2px dashed #ccc; border-radius: 8px;"
          @click="openCamera('atividade')"
        >
          <div class="text-center">
            <q-icon name="add_a_photo" size="28px" color="grey-5" />
            <div class="text-caption text-grey-5 q-mt-xs">Adicionar</div>
          </div>
        </div>
      </div>

      <div class="flex gap-sm">
        <q-btn outline rounded color="grey" label="Voltar" class="col" @click="step = 1" />
        <q-btn
          unelevated
          rounded
          color="primary"
          label="Próximo"
          icon-right="arrow_forward"
          class="col"
          :disable="!form.activity || atividadePhotos.length < minPhotos"
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
            <q-item>
              <q-item-section avatar><q-icon name="photo_library" color="primary" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Fotos da atividade</q-item-label>
                <q-item-label>{{ atividadePhotos.length }} foto(s) ✓</q-item-label>
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
const atividadePhotos = ref([])

const form = ref({
  activity: null,
  descricao: ''
})

const minPhotos = 2

const selectedActivityName = computed(() => {
  const act = activities.value.find(a => a.id === form.value.activity)
  return act?.nome || ''
})

onMounted(async () => {
  // Load activities (online first, then local)
  try {
    if (onlineStore.isOnline) {
      const { data } = await supabase.from('activities').select('*').order('nome')
      activities.value = data || []
    }
  } catch {
    // fallback empty
  }
})

function openCamera (tipo) {
  cameraTipo.value = tipo
  showCamera.value = true
}

function onPhotoCaptured (blob) {
  const previewUrl = URL.createObjectURL(blob)
  if (cameraTipo.value === 'epi') {
    epiPhotos.value.push({ blob, previewUrl })
  } else {
    atividadePhotos.value.push({ blob, previewUrl })
  }
  showCamera.value = false
}

function removeEpiPhoto (idx) {
  URL.revokeObjectURL(epiPhotos.value[idx].previewUrl)
  epiPhotos.value.splice(idx, 1)
}

function removeAtividadePhoto (idx) {
  URL.revokeObjectURL(atividadePhotos.value[idx].previewUrl)
  atividadePhotos.value.splice(idx, 1)
}

async function saveService () {
  saving.value = true
  try {
    const serviceId = `local_${Date.now()}`

    // Save service record
    await offlineDB.saveService({
      id: serviceId,
      teamId: session.equipeId,
      activityId: form.value.activity,
      activityName: selectedActivityName.value,
      descricao: form.value.descricao,
      colaboradores: session.colaboradores,
      data: session.data
    })

    // Save all photos locally
    const allPhotos = [
      ...epiPhotos.value.map(p => ({ ...p, tipo: 'epi' })),
      ...atividadePhotos.value.map(p => ({ ...p, tipo: 'atividade' }))
    ]

    for (const photo of allPhotos) {
      await offlineDB.savePhoto({
        serviceId,
        tipo: photo.tipo,
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
