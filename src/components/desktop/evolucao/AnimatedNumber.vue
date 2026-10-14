<template>
  <span class="anum">{{ text }}</span>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { reducedMotion } from 'src/composables/useElWidth'

const props = defineProps({
  value: { type: Number, default: 0 },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 800 },
  suffix: { type: String, default: '' }
})

const shown = ref(0)
let raf = 0

function animateTo (target) {
  cancelAnimationFrame(raf)
  if (reducedMotion()) { shown.value = target; return }
  const from = shown.value
  const t0 = performance.now()
  const step = now => {
    const p = Math.min(1, (now - t0) / props.duration)
    shown.value = from + (target - from) * (1 - Math.pow(1 - p, 3))
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => animateTo(props.value))
watch(() => props.value, v => animateTo(v))
onBeforeUnmount(() => cancelAnimationFrame(raf))

const text = computed(() =>
  shown.value.toLocaleString('pt-BR', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals
  }) + props.suffix
)
</script>

<style scoped>
.anum { font-variant-numeric: tabular-nums; }
</style>
