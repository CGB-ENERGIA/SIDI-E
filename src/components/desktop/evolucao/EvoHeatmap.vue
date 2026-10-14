<template>
  <div class="hm">
    <div v-if="rows.length" class="hm-scroll">
      <div
        class="hm-grid"
        :style="{ gridTemplateColumns: `minmax(130px, 170px) repeat(${days.length}, minmax(16px, 1fr)) 44px` }"
      >
        <div class="hm-corner" />
        <div
          v-for="(d, i) in days"
          :key="'h' + d"
          class="hm-day"
          :class="{ 'hm-day--we': isWeekend(d), 'hm-day--today': d === today }"
        >{{ i % every === 0 ? d.slice(8, 10) : '' }}</div>
        <div class="hm-day hm-tot">Total</div>

        <template v-for="(row, ri) in rows" :key="row.key">
          <button
            type="button"
            class="hm-label"
            :class="{ 'hm-label--sel': selectedKey === row.key }"
            @click="emit('select', row.key)"
          >
            <span class="hm-name">{{ row.label }}</span>
            <span v-if="row.sub" class="hm-sub">{{ row.sub }}</span>
          </button>
          <div
            v-for="(v, ci) in row.values"
            :key="row.key + days[ci]"
            class="hm-cell"
            :class="{ 'hm-cell--zero': v === 0, 'hm-cell--we': isWeekend(days[ci]) }"
            :style="cellStyle(v, ri, ci)"
            :title="`${row.label} · ${fmt(days[ci])}: ${v} serviço${v === 1 ? '' : 's'}`"
          />
          <div class="hm-rowtot">{{ row.total }}</div>
        </template>
      </div>
    </div>
    <div v-else class="hm-empty">Nenhuma equipe com serviços no período e filtros selecionados.</div>

    <div v-if="rows.length" class="hm-scale">
      <span>menos</span>
      <span v-for="k in 5" :key="k" class="hm-sw" :style="{ background: shade((k - 1) / 4) }" />
      <span>mais</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  days: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  today: { type: String, default: '' },
  selectedKey: { type: String, default: null }
})
const emit = defineEmits(['select'])

const maxV = computed(() => {
  let m = 1
  for (const r of props.rows) for (const v of r.values) if (v > m) m = v
  return m
})
const every = computed(() => Math.max(1, Math.ceil(props.days.length / 31)))

function isWeekend (ymd) {
  const d = new Date(`${ymd}T12:00:00Z`).getUTCDay()
  return d === 0 || d === 6
}
function fmt (ymd) { return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}` }
function shade (t) {
  return `color-mix(in oklab, var(--primary) ${Math.round(22 + t * 78)}%, var(--secondary))`
}
function cellStyle (v, ri, ci) {
  const delay = Math.min(900, (ri + ci) * 9)
  const base = { animationDelay: `${delay}ms` }
  if (v === 0) return base
  return { ...base, background: shade(v / maxV.value) }
}
</script>

<style scoped>
.hm-scroll { overflow-x: auto; padding-bottom: 6px; }
.hm-grid { display: grid; gap: 3px; align-items: center; min-width: min-content; }
.hm-corner { position: sticky; left: 0; background: var(--card); z-index: 2; }
.hm-day {
  font: 700 0.62rem 'Manrope', sans-serif; color: var(--muted-fg); text-align: center;
  padding-bottom: 3px; font-variant-numeric: tabular-nums; white-space: nowrap;
}
.hm-day--we { opacity: 0.55; }
.hm-day--today { color: var(--primary); }
.hm-tot { text-align: right; }

.hm-label {
  position: sticky; left: 0; z-index: 2; background: var(--card);
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  padding: 3px 8px 3px 4px; border: 0; border-radius: 6px; cursor: pointer; color: var(--fg);
  text-align: left; min-width: 0;
}
.hm-label:hover { background: color-mix(in oklab, var(--fg) 8%, var(--card)); }
.hm-label--sel { background: color-mix(in oklab, var(--primary) 18%, var(--card)); box-shadow: inset 2px 0 0 var(--primary); }
.hm-name { font: 700 0.76rem 'Manrope', sans-serif; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hm-sub { font: 500 0.64rem 'Manrope', sans-serif; color: var(--muted-fg); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.hm-cell {
  height: 24px; border-radius: 5px;
  animation: pop 0.45s cubic-bezier(0.22, 0.8, 0.3, 1) both;
  transition: transform 0.12s, filter 0.12s;
}
.hm-cell:hover { transform: scale(1.18); filter: brightness(1.15); z-index: 1; }
.hm-cell--zero { background: color-mix(in oklab, var(--fg) 5%, transparent); }
.hm-cell--zero.hm-cell--we { background: color-mix(in oklab, var(--fg) 2.5%, transparent); }
.hm-rowtot { font: 800 0.78rem 'Manrope', sans-serif; text-align: right; color: var(--fg); font-variant-numeric: tabular-nums; }

.hm-scale { display: flex; align-items: center; gap: 6px; justify-content: flex-end; margin-top: 10px; font: 600 0.68rem 'Manrope', sans-serif; color: var(--muted-fg); }
.hm-sw { width: 16px; height: 10px; border-radius: 3px; }
.hm-empty { padding: 36px 8px; text-align: center; color: var(--muted-fg); font: 500 0.84rem 'Manrope', sans-serif; }

@keyframes pop { from { opacity: 0; transform: scale(0.35); } to { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .hm-cell { animation: none; } }
</style>
