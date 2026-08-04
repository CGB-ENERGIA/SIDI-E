<template>
  <div class="camera-overlay flex column">
    <!-- Header -->
    <div class="flex items-center justify-between q-pa-md" style="background: rgba(0,0,0,0.7);">
      <q-btn flat round icon="close" color="white" @click="$emit('cancel')" />
      <div class="text-white text-center">
        <div class="text-subtitle2 text-weight-bold">
          {{ tipo === 'epi' ? '📸 Foto de EPI' : '📸 Foto da Atividade' }}
        </div>
        <div class="text-caption text-grey-4">
          {{ tipo === 'epi' ? 'Mostre todos os equipamentos de segurança' : 'Registre a atividade em execução' }}
        </div>
      </div>
      <div style="width: 40px;" /> <!-- spacer -->
    </div>

    <!-- Video preview or captured image -->
    <div class="col relative-position flex items-center justify-center" style="background:#000;">
      <video
        v-if="!capturedImage"
        ref="videoEl"
        autoplay
        playsinline
        muted
        class="fit"
        style="object-fit: cover;"
      />
      <img
        v-else
        :src="capturedImage"
        class="fit"
        style="object-fit: contain;"
      />

      <!-- Guide overlay for EPI -->
      <div v-if="tipo === 'epi' && !capturedImage" class="absolute-full flex column items-center justify-center" style="pointer-events:none;">
        <div
          style="
            width: 75%;
            height: 80%;
            border: 2px solid rgba(255,255,255,0.5);
            border-radius: 12px;
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.35);
          "
        />
        <div class="text-white text-caption q-mt-sm" style="text-shadow: 0 1px 3px #000;">
          Enquadre o colaborador na área
        </div>
      </div>

      <!-- Flash effect -->
      <div v-if="flashing" class="absolute-full bg-white" style="opacity: 0.8;" />
    </div>

    <!-- Controls -->
    <div
      class="flex items-center justify-around q-pa-lg"
      style="background: rgba(0,0,0,0.85);"
    >
      <!-- Switch camera -->
      <q-btn
        flat round
        icon="flip_camera_ios"
        color="white"
        size="lg"
        @click="switchCamera"
        :disable="!!capturedImage"
      />

      <!-- Capture / Confirm -->
      <div class="flex column items-center gap-xs">
        <q-btn
          v-if="!capturedImage"
          round
          icon="camera"
          color="white"
          text-color="black"
          size="xl"
          @click="capture"
          :loading="processing"
        />
        <q-btn
          v-else
          round
          icon="check"
          color="positive"
          size="xl"
          @click="confirm"
        />
        <div class="text-caption text-grey-4">
          {{ capturedImage ? 'Confirmar' : 'Capturar' }}
        </div>
      </div>

      <!-- Retake -->
      <q-btn
        v-if="capturedImage"
        flat round
        icon="replay"
        color="orange"
        size="lg"
        @click="retake"
      />
      <div v-else style="width:48px;" />
    </div>

    <!-- Hidden canvas -->
    <canvas ref="canvasEl" style="display:none;" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
  tipo: { type: String, default: 'atividade' }
})

const emit = defineEmits(['captured', 'cancel'])
const $q = useQuasar()

const videoEl = ref(null)
const canvasEl = ref(null)
const capturedImage = ref(null)
const capturedBlob = ref(null)
const processing = ref(false)
const flashing = ref(false)

let stream = null
let facingMode = 'environment' // default: back camera

onMounted(async () => {
  await startCamera()
})

onBeforeUnmount(() => {
  stopCamera()
})

async function startCamera () {
  try {
    stopCamera()
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    })
    if (videoEl.value) {
      videoEl.value.srcObject = stream
    }
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Sem acesso à câmera. Verifique as permissões do navegador.'
    })
    emit('cancel')
  }
}

function stopCamera () {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}

async function switchCamera () {
  facingMode = facingMode === 'environment' ? 'user' : 'environment'
  await startCamera()
}

async function capture () {
  if (!videoEl.value || !canvasEl.value) return
  processing.value = true

  // Flash effect
  flashing.value = true
  setTimeout(() => { flashing.value = false }, 200)

  const video = videoEl.value
  const canvas = canvasEl.value

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d')

  // Flip horizontally if using front camera
  if (facingMode === 'user') {
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
  } else {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  }

  // Add timestamp watermark
  const now = new Date()
  const stamp = now.toLocaleString('pt-BR')
  ctx.font = 'bold 18px sans-serif'
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(8, canvas.height - 36, ctx.measureText(stamp).width + 20, 28)
  ctx.fillStyle = 'white'
  ctx.fillText(stamp, 18, canvas.height - 14)

  capturedImage.value = canvas.toDataURL('image/jpeg', 0.85)

  canvas.toBlob(blob => {
    capturedBlob.value = blob
    processing.value = false
  }, 'image/jpeg', 0.85)

  stopCamera()
}

function retake () {
  capturedImage.value = null
  capturedBlob.value = null
  startCamera()
}

function confirm () {
  emit('captured', capturedBlob.value)
}
</script>
