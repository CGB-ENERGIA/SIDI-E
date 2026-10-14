import { ref, onMounted, onBeforeUnmount } from 'vue'

export function reducedMotion () {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function useElWidth (elRef, fallback = 600) {
  const width = ref(fallback)
  let ro = null
  onMounted(() => {
    const el = elRef.value
    if (!el) return
    width.value = el.clientWidth || fallback
    ro = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width)
      if (w > 0) width.value = w
    })
    ro.observe(el)
  })
  onBeforeUnmount(() => ro && ro.disconnect())
  return width
}
