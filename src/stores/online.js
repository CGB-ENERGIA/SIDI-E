import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOnlineStore = defineStore('online', () => {
  const isOnline = ref(navigator.onLine)
  const lastOnlineAt = ref(isOnline.value ? new Date() : null)
  const pendingCount = ref(0)

  function setOnline (value) {
    isOnline.value = value
    if (value) lastOnlineAt.value = new Date()
  }

  function setPendingCount (count) {
    pendingCount.value = count
  }

  return { isOnline, lastOnlineAt, pendingCount, setOnline, setPendingCount }
})
