<template>
  <div class="sb">
    <div class="sb-legend">
      <span v-for="s in stacks" :key="s.key" class="sb-lg">
        <span class="sb-dot" :style="{ background: s.color }" />{{ s.label }}
      </span>
    </div>

    <div class="sb-plot" :style="{ height: height + 'px' }" @pointerleave="hover = -1">
      <div class="sb-cols" :style="{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }">
        <div
          v-for="(l, i) in labels"
          :key="l"
          class="sb-col"
          :class="{ 'sb-col--hover': hover === i }"
          @pointerenter="hover = i"
          @pointerdown="hover = i"
        >
          <div class="sb-stack">
            <span
              v-for="s in stacks"
              :key="s.key"
              class="sb-seg"
              :style="{
                height: ready ? `${(s.values[i] / maxTotal) * 100}%` : '0%',
                background: s.color,
                transitionDelay: `${Math.min(i, 40) * 14}ms`
              }"
            />
          </div>
        </div>
      </div>

      <div v-if="hover >= 0" class="sb-tip" :style="tipStyle">
        <div class="sb-tip-date">{{ longLabel(labels[hover]) }}</div>
        <div v-for="s in stacks" :key="s.key" class="sb-tip-row">
          <span class="sb-dot" :style="{ background: s.color }" />
          <span class="sb-tip-name">{{ s.label }}</span>
          <b>{{ s.values[hover] }}</b>
        </div>
      </div>
    </div>

    <div class="sb-axis" :style="{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }">
      <span v-for="(l, i) in labels" :key="'a' + l" class="sb-x">
        {{ i % every === 0 ? l.slice(8, 10) + '/' + l.slice(5, 7) : '' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  labels: { type: Array, default: () => [] },
  stacks: { type: Array, default: () => [] },
  height: { type: Number, default: 220 }
})

const hover = ref(-1)
const ready = ref(false)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })))

const maxTotal = computed(() => {
  let m = 1
  for (let i = 0; i < props.labels.length; i++) {
    const t = props.stacks.reduce((s, st) => s + (st.values[i] || 0), 0)
    if (t > m) m = t
  }
  return m
})

const every = computed(() => Math.max(1, Math.ceil(props.labels.length / 12)))

const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function longLabel (ymd) {
  if (!ymd) return ''
  const wd = WEEK[new Date(`${ymd}T12:00:00Z`).getUTCDay()]
  return `${wd}, ${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
}

const tipStyle = computed(() => {
  const pct = ((hover.value + 0.5) / Math.max(1, props.labels.length)) * 100
  return {
    left: `${pct}%`,
    transform: pct > 60 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)'
  }
})
</script>

<style scoped>
.sb-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 10px; }
.sb-lg { display: inline-flex; align-items: center; gap: 7px; font: 600 0.74rem 'Manrope', sans-serif; color: var(--muted-fg); }
.sb-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }

.sb-plot {
  position: relative; border-bottom: 1px solid var(--border);
  background: repeating-linear-gradient(
    to top, transparent 0, transparent calc(25% - 1px),
    color-mix(in oklab, var(--border) 70%, transparent) calc(25% - 1px), color-mix(in oklab, var(--border) 70%, transparent) 25%
  );
}
.sb-cols { display: grid; height: 100%; gap: 3px; }
.sb-col { display: flex; align-items: flex-end; height: 100%; cursor: crosshair; border-radius: 4px 4px 0 0; }
.sb-col--hover { background: color-mix(in oklab, var(--fg) 7%, transparent); }
.sb-stack { width: 100%; display: flex; flex-direction: column-reverse; justify-content: flex-start; height: 100%; }
.sb-seg {
  display: block; width: 100%; min-height: 0;
  transition: height 0.7s cubic-bezier(0.22, 0.8, 0.3, 1);
}
.sb-seg:last-child { border-radius: 4px 4px 0 0; }

.sb-axis { display: grid; gap: 3px; margin-top: 6px; }
.sb-x { font: 600 0.64rem 'Manrope', sans-serif; color: var(--muted-fg); text-align: center; white-space: nowrap; overflow: visible; font-variant-numeric: tabular-nums; }

.sb-tip {
  position: absolute; top: 6px; z-index: 5; pointer-events: none;
  min-width: 140px; padding: 8px 11px; border-radius: 10px;
  background: color-mix(in oklab, var(--background) 92%, transparent);
  border: 1px solid var(--border); box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
}
.sb-tip-date { font: 700 0.72rem 'Manrope', sans-serif; color: var(--muted-fg); margin-bottom: 5px; text-transform: capitalize; }
.sb-tip-row { display: flex; align-items: center; gap: 8px; font: 600 0.78rem 'Manrope', sans-serif; color: var(--fg); padding: 1px 0; }
.sb-tip-name { flex: 1; }
@media (prefers-reduced-motion: reduce) { .sb-seg { transition: none; } }
</style>
