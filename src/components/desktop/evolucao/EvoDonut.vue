<template>
  <div class="dn">
    <div class="dn-ring">
      <svg :viewBox="`0 0 ${size} ${size}`" class="dn-svg" role="img" aria-label="Distribuição">
        <g :transform="`rotate(-90 ${size / 2} ${size / 2})`">
          <circle :cx="size / 2" :cy="size / 2" :r="r" class="dn-bg" :stroke-width="thickness" />
          <circle
            v-for="seg in arcs"
            :key="seg.key"
            :cx="size / 2"
            :cy="size / 2"
            :r="r"
            fill="none"
            :stroke="seg.color"
            :stroke-width="active === seg.key ? thickness + 5 : thickness"
            :stroke-dasharray="`${seg.len} ${C - seg.len}`"
            :stroke-dashoffset="-seg.start"
            stroke-linecap="butt"
            class="dn-arc"
            :class="{ 'dn-arc--dim': active && active !== seg.key }"
            @pointerenter="hovered = seg.key"
            @pointerleave="hovered = null"
            @click="emit('select', seg.key)"
          />
        </g>
      </svg>
      <div class="dn-center">
        <div class="dn-big"><AnimatedNumber :value="centerNumber" /></div>
        <div class="dn-small">{{ centerCaption }}</div>
      </div>
    </div>

    <ul class="dn-legend">
      <li
        v-for="seg in arcs"
        :key="seg.key"
        class="dn-li"
        :class="{ 'dn-li--sel': selectedKey === seg.key, 'dn-li--dim': active && active !== seg.key }"
        @pointerenter="hovered = seg.key"
        @pointerleave="hovered = null"
        @click="emit('select', seg.key)"
      >
        <span class="dn-dot" :style="{ background: seg.color }" />
        <span class="dn-name">{{ seg.label }}</span>
        <b class="dn-v">{{ seg.value }}</b>
        <span class="dn-pct">{{ seg.pct }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AnimatedNumber from './AnimatedNumber.vue'

const props = defineProps({
  segments: { type: Array, default: () => [] },
  selectedKey: { type: String, default: null },
  centerLabel: { type: String, default: 'Total' },
  size: { type: Number, default: 190 },
  thickness: { type: Number, default: 20 }
})
const emit = defineEmits(['select'])

const hovered = ref(null)
const active = computed(() => hovered.value || props.selectedKey)

const r = computed(() => (props.size - props.thickness - 8) / 2)
const C = computed(() => 2 * Math.PI * r.value)
const total = computed(() => props.segments.reduce((s, x) => s + x.value, 0))

const arcs = computed(() => {
  const t = total.value
  let start = 0
  const gap = props.segments.filter(s => s.value > 0).length > 1 ? 3 : 0
  return props.segments.map(s => {
    const raw = t ? (s.value / t) * C.value : 0
    const len = Math.max(0, raw - gap)
    const out = { ...s, len, start, pct: t ? Math.round((s.value / t) * 100) : 0 }
    start += raw
    return out
  })
})

const focus = computed(() => arcs.value.find(a => a.key === active.value))
const centerNumber = computed(() => (focus.value ? focus.value.value : total.value))
const centerCaption = computed(() => (focus.value ? focus.value.label : props.centerLabel))
</script>

<style scoped>
.dn { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; justify-content: center; }
.dn-ring { position: relative; width: v-bind('size + "px"'); height: v-bind('size + "px"'); flex-shrink: 0; }
.dn-svg { width: 100%; height: 100%; overflow: visible; }
.dn-bg { fill: none; stroke: color-mix(in oklab, var(--fg) 7%, transparent); }
.dn-arc {
  cursor: pointer;
  transition: stroke-dasharray 0.9s cubic-bezier(0.22, 0.8, 0.3, 1),
              stroke-dashoffset 0.9s cubic-bezier(0.22, 0.8, 0.3, 1),
              stroke-width 0.2s, opacity 0.2s;
}
.dn-arc--dim { opacity: 0.35; }
.dn-center {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: none; text-align: center;
  padding: 0 28px;
}
.dn-big { font: 800 1.9rem 'Sora', sans-serif; color: var(--fg); line-height: 1.05; }
.dn-small { font: 600 0.7rem 'Manrope', sans-serif; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; }

.dn-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; min-width: 150px; flex: 1; }
.dn-li {
  display: grid; grid-template-columns: 10px 1fr auto 40px; align-items: center; gap: 9px;
  padding: 6px 8px; border-radius: 8px; cursor: pointer;
  font: 600 0.8rem 'Manrope', sans-serif; color: var(--fg);
  transition: background 0.15s, opacity 0.2s;
}
.dn-li:hover { background: color-mix(in oklab, var(--fg) 6%, transparent); }
.dn-li--sel { background: color-mix(in oklab, var(--primary) 12%, transparent); }
.dn-li--dim { opacity: 0.45; }
.dn-dot { width: 10px; height: 10px; border-radius: 3px; }
.dn-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dn-v { font-variant-numeric: tabular-nums; }
.dn-pct { color: var(--muted-fg); text-align: right; font-variant-numeric: tabular-nums; font-size: 0.74rem; }
@media (prefers-reduced-motion: reduce) { .dn-arc { transition: none; } }
</style>
