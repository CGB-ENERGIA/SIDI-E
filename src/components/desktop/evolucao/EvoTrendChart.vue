<template>
  <div ref="wrap" class="trend" @pointerleave="hover = -1">
    <div class="trend-legend">
      <button
        v-for="s in series"
        :key="s.key"
        type="button"
        class="lg"
        :class="{ 'lg--off': hidden.has(s.key) }"
        @click="toggle(s.key)"
      >
        <span class="lg-dot" :style="{ background: s.color }" />{{ s.label }}
      </button>
    </div>

    <svg
      class="trend-svg"
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      aria-label="Evolução diária"
      @pointermove="onMove"
      @pointerdown="onMove"
    >
      <defs>
        <linearGradient v-for="s in series" :id="gid(s.key)" :key="s.key" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="s.color" stop-opacity="0.4" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <rect
        v-for="i in weekendIdx"
        :key="'w' + i"
        class="weekend"
        :x="x(i) - stepW / 2"
        :y="pad.t"
        :width="stepW"
        :height="innerH"
      />

      <g class="grid">
        <g v-for="t in yTicks" :key="t">
          <line :x1="pad.l" :x2="width - pad.r" :y1="y(t)" :y2="y(t)" />
          <text :x="pad.l - 10" :y="y(t) + 4" text-anchor="end">{{ t }}</text>
        </g>
      </g>

      <g class="xlabels">
        <text v-for="i in xTicks" :key="'x' + i" :x="x(i)" :y="height - 8" text-anchor="middle">
          {{ shortLabel(labels[i]) }}
        </text>
      </g>

      <g v-for="s in visibleSeries" :key="s.key">
        <path
          v-if="s.area"
          :key="'a' + drawKey"
          class="area"
          :d="areaPath(s)"
          :fill="`url(#${gid(s.key)})`"
        />
        <path
          :key="'l' + drawKey"
          class="line"
          :d="linePath(s)"
          :stroke="s.color"
          pathLength="1"
        />
      </g>

      <g v-if="hover >= 0">
        <line class="cross" :x1="x(hover)" :x2="x(hover)" :y1="pad.t" :y2="pad.t + innerH" />
        <circle
          v-for="s in visibleSeries"
          :key="'c' + s.key"
          :cx="x(hover)"
          :cy="y(valueAt(s, hover))"
          r="4.5"
          :fill="s.color"
          class="dot"
        />
      </g>
    </svg>

    <div v-if="hover >= 0" class="tip" :style="tipStyle">
      <div class="tip-date">{{ longLabel(labels[hover]) }}</div>
      <div v-for="s in visibleSeries" :key="'t' + s.key" class="tip-row">
        <span class="lg-dot" :style="{ background: s.color }" />
        <span class="tip-name">{{ s.label }}</span>
        <b>{{ s.values[hover] }}</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useElWidth, reducedMotion } from 'src/composables/useElWidth'

const props = defineProps({
  labels: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  height: { type: Number, default: 300 }
})

const wrap = ref(null)
const width = useElWidth(wrap, 640)
const hover = ref(-1)
const hidden = ref(new Set(props.series.filter(s => s.hidden).map(s => s.key)))
const drawKey = ref(0)
const shown = ref({})
let raf = 0

const pad = { l: 40, r: 16, t: 14, b: 30 }
const uid = Math.random().toString(36).slice(2, 7)
const gid = k => `tg-${uid}-${k}`

const innerW = computed(() => Math.max(10, width.value - pad.l - pad.r))
const innerH = computed(() => Math.max(10, props.height - pad.t - pad.b))
const n = computed(() => props.labels.length)
const stepW = computed(() => (n.value > 1 ? innerW.value / (n.value - 1) : innerW.value))

const visibleSeries = computed(() =>
  props.series
    .filter(s => !hidden.value.has(s.key))
    .map(s => ({ ...s, shown: shown.value[s.key] || s.values }))
)

const yMax = computed(() => {
  let m = 0
  for (const s of visibleSeries.value) for (const v of s.values) if (v > m) m = v
  if (m <= 4) return 4
  const mag = Math.pow(10, Math.floor(Math.log10(m)))
  const norm = m / mag
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  return nice * mag
})

const yTicks = computed(() => {
  const out = []
  const steps = 4
  for (let i = 0; i <= steps; i++) out.push(Math.round((yMax.value / steps) * i * 10) / 10)
  return out
})

const xTicks = computed(() => {
  const per = Math.max(1, Math.ceil(54 / Math.max(1, stepW.value)))
  const out = []
  for (let i = 0; i < n.value; i += per) out.push(i)
  return out
})

const weekendIdx = computed(() => {
  const out = []
  props.labels.forEach((l, i) => {
    const d = new Date(`${l}T12:00:00Z`).getUTCDay()
    if (d === 0 || d === 6) out.push(i)
  })
  return out
})

function x (i) {
  if (n.value <= 1) return pad.l + innerW.value / 2
  return pad.l + (innerW.value * i) / (n.value - 1)
}
function y (v) {
  return pad.t + innerH.value - (Math.min(v, yMax.value) / yMax.value) * innerH.value
}
function valueAt (s, i) { return s.shown[i] ?? 0 }

function points (s) { return s.shown.map((v, i) => [x(i), y(v)]) }

function linePath (s) {
  const p = points(s)
  if (!p.length) return ''
  if (p.length === 1) return `M${p[0][0] - 0.1},${p[0][1]} L${p[0][0] + 0.1},${p[0][1]}`
  let d = `M${p[0][0]},${p[0][1]}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] || p2
    const lo = Math.min(p1[1], p2[1])
    const hi = Math.max(p1[1], p2[1])
    const c1y = Math.min(hi, Math.max(lo, p1[1] + (p2[1] - p0[1]) / 6))
    const c2y = Math.min(hi, Math.max(lo, p2[1] - (p3[1] - p1[1]) / 6))
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

function areaPath (s) {
  const p = points(s)
  if (p.length < 2) return ''
  const base = pad.t + innerH.value
  return `${linePath(s)} L${p[p.length - 1][0]},${base} L${p[0][0]},${base} Z`
}

function shortLabel (ymd) {
  if (!ymd) return ''
  return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
}
const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function longLabel (ymd) {
  if (!ymd) return ''
  const wd = WEEK[new Date(`${ymd}T12:00:00Z`).getUTCDay()]
  return `${wd}, ${shortLabel(ymd)}/${ymd.slice(0, 4)}`
}

function onMove (e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const px = e.clientX - rect.left
  if (n.value <= 1) { hover.value = 0; return }
  const idx = Math.round(((px - pad.l) / innerW.value) * (n.value - 1))
  hover.value = Math.max(0, Math.min(n.value - 1, idx))
}

const tipStyle = computed(() => {
  const left = x(hover.value)
  const flip = left > width.value * 0.62
  return {
    left: `${left}px`,
    transform: flip ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)'
  }
})

function toggle (key) {
  const next = new Set(hidden.value)
  if (next.has(key)) next.delete(key)
  else if (props.series.length - next.size > 1) next.add(key)
  hidden.value = next
}

function snapshot () {
  return Object.fromEntries(props.series.map(s => [s.key, [...s.values]]))
}

function run () {
  cancelAnimationFrame(raf)
  const target = snapshot()
  const cur = shown.value
  const same = Object.keys(target).every(k => cur[k] && cur[k].length === target[k].length)
  if (!same || reducedMotion()) {
    shown.value = target
    drawKey.value++
    return
  }
  const from = Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, [...v]]))
  const t0 = performance.now()
  const dur = 650
  const step = now => {
    const p = Math.min(1, (now - t0) / dur)
    const e = 1 - Math.pow(1 - p, 3)
    const out = {}
    for (const k of Object.keys(target)) {
      out[k] = target[k].map((v, i) => from[k][i] + (v - from[k][i]) * e)
    }
    shown.value = out
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

watch(() => props.series, run, { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.trend { position: relative; width: 100%; }
.trend-legend { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.lg {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 4px 10px; border-radius: 999px;
  background: color-mix(in oklab, var(--fg) 5%, transparent);
  border: 1px solid var(--border);
  color: var(--fg); font: 600 0.74rem 'Manrope', sans-serif;
  cursor: pointer; transition: opacity 0.2s, background 0.2s;
}
.lg:hover { background: color-mix(in oklab, var(--fg) 10%, transparent); }
.lg--off { opacity: 0.4; }
.lg--off .lg-dot { background: var(--muted-fg) !important; }
.lg-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

.trend-svg { display: block; touch-action: pan-y; overflow: visible; }
.grid line { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 5; opacity: 0.7; }
.grid text, .xlabels text { fill: var(--muted-fg); font: 600 10.5px 'Manrope', sans-serif; font-variant-numeric: tabular-nums; }
.weekend { fill: color-mix(in oklab, var(--fg) 4%, transparent); }

.line {
  fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; stroke-dashoffset: 0;
  animation: draw 1s cubic-bezier(0.22, 0.8, 0.3, 1) both;
}
.area { animation: fade 1.1s ease both; }
.cross { stroke: var(--muted-fg); stroke-width: 1; stroke-dasharray: 3 3; }
.dot { stroke: var(--card); stroke-width: 2; }

.tip {
  position: absolute; top: 34px; z-index: 5; pointer-events: none;
  min-width: 150px; padding: 9px 12px; border-radius: 10px;
  background: color-mix(in oklab, var(--background) 92%, transparent);
  border: 1px solid var(--border);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  font-family: 'Manrope', sans-serif;
}
.tip-date { font-size: 0.72rem; font-weight: 700; color: var(--muted-fg); margin-bottom: 6px; text-transform: capitalize; }
.tip-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--fg); padding: 1px 0; }
.tip-name { flex: 1; }
.tip-row b { font-variant-numeric: tabular-nums; }

@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .line, .area { animation: none; }
}
</style>
