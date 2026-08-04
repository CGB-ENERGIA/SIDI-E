<template>
  <q-page padding class="mobile-page">
    <CameraCapture
      :tipo="tipo"
      @captured="onCaptured"
      @cancel="onCancel"
    />
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CameraCapture from 'src/components/mobile/CameraCapture.vue'
import { useEvidenceStore } from 'src/stores/evidence'
import { useQuasar } from 'quasar'

const route = useRoute()
const router = useRouter()
const evidenceStore = useEvidenceStore()
const $q = useQuasar()

const tipo = computed(() => {
  const t = route.params.tipo
  return t === 'epi' ? 'epi' : 'atividade'
})

async function onCaptured (blob) {
  try {
    await evidenceStore.addPhoto(blob, tipo.value)
    $q.notify({ type: 'positive', message: 'Foto capturada!' })
    router.back()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Erro ao salvar foto' })
  }
}

function onCancel () {
  router.back()
}
</script>
