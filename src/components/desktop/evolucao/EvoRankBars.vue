<template>
  <div class="rk">
    <TransitionGroup v-if="items.length" name="rk" tag="div" class="rk-list">
      <button
        v-for="(it, i) in items"
        :key="it.key"
        type="button"
        class="rk-row"
        :class="{
          'rk-row--sel': selectedKey === it.key,
          'rk-row--dim': selectedKey && selectedKey !== it.key,
          'rk-row--static': !selectable
        }"
        :style="{ '--i': i }"
        @click="selectable && emit('select', it.key)"
      >
        <span class="rk-pos">{{ i + 1 }}</span>
        <span class="rk-label">
          <span class="rk-name">{{ it.label }}</span>
          <span v-if="it.sub" class="rk-sub">{{ it.sub }}</span>
        </span>
        <span class="rk-track">
          <span
            class="rk-fill"
            :style="{
              transform: `scaleX(${ready ? Math.max(0.015, it.value / maxValue) : 0})`,
              background: it.color || 'var(--primary)'
            }"
          />
        </span>
        <span class="rk-val">{{ it.value }}</span>
      </button>
    </TransitionGroup>
    <div v-else class="rk-empty">{{ emptyText }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedKey: { type: String, default: null },
  selectable: { type: Boolean, default: true },
  emptyText: { type: String, default: 'Sem dados no período' }
})
const emit = defineEmits(['select'])

const ready = ref(false)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })))

const maxValue = computed(() => Math.max(1, ...props.items.map(i => i.value)))
</script>

<style scoped>
.rk-list { display: flex; flex-direction: column; gap: 4px; position: relative; }
.rk-row {
  display: grid; grid-template-columns: 22px minmax(90px, 1.1fr) minmax(60px, 2fr) 38px;
  align-items: center; gap: 10px;
  width: 100%; padding: 7px 8px; border-radius: 9px;
  background: transparent; border: 1px solid transparent; color: var(--fg);
  text-align: left; cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.2s;
}
.rk-row:hover { background: color-mix(in oklab, var(--fg) 6%, transparent); }
.rk-row--static { cursor: default; }
.rk-row--sel {
  background: color-mix(in oklab, var(--primary) 12%, transparent);
  border-color: color-mix(in oklab, var(--primary) 45%, transparent);
}
.rk-row--dim { opacity: 0.45; }
.rk-pos { font: 700 0.7rem 'Manrope', sans-serif; color: var(--muted-fg); text-align: center; font-variant-numeric: tabular-nums; }
.rk-label { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.rk-name { font: 700 0.8rem 'Manrope', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rk-sub { font: 500 0.68rem 'Manrope', sans-serif; color: var(--muted-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rk-track { height: 10px; border-radius: 999px; background: color-mix(in oklab, var(--fg) 7%, transparent); overflow: hidden; }
.rk-fill {
  display: block; height: 100%; width: 100%; border-radius: 999px;
  transform-origin: left center;
  transition: transform 0.85s cubic-bezier(0.22, 0.8, 0.3, 1);
  transition-delay: calc(var(--i, 0) * 35ms);
}
.rk-val { font: 800 0.82rem 'Manrope', sans-serif; text-align: right; font-variant-numeric: tabular-nums; }
.rk-empty { padding: 28px 8px; text-align: center; color: var(--muted-fg); font: 500 0.82rem 'Manrope', sans-serif; }

.rk-move, .rk-enter-active, .rk-leave-active { transition: transform 0.45s ease, opacity 0.35s ease; }
.rk-enter-from, .rk-leave-to { opacity: 0; transform: translateX(-14px); }
.rk-leave-active { position: absolute; width: 100%; }
@media (prefers-reduced-motion: reduce) {
  .rk-fill, .rk-move, .rk-enter-active, .rk-leave-active { transition: none; }
}
</style>
