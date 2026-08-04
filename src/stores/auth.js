import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from 'src/services/supabase'
import { LocalStorage } from 'quasar'

export const useAuthStore = defineStore('auth', () => {
  const desktopUser = ref(null)
  const mobileSession = ref(LocalStorage.getItem('gstc_mobile_session') || null)

  const isDesktopLoggedIn = computed(() => !!desktopUser.value)
  const isMobileLoggedIn = computed(() => !!mobileSession.value)

  // ── Desktop auth (Supabase) ───────────────────────────────────
  async function desktopLogin (email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    desktopUser.value = data.user
    return data
  }

  async function desktopLogout () {
    await supabase.auth.signOut()
    desktopUser.value = null
  }

  async function loadDesktopSession () {
    const { data } = await supabase.auth.getSession()
    desktopUser.value = data.session?.user ?? null
  }

  // ── Mobile auth (team prefix + collaborators, local only) ─────
  function mobileLogin (sessionData) {
    // sessionData: { prefixo, equipeId, colaboradores[], data }
    const session = { ...sessionData, loginAt: new Date().toISOString() }
    mobileSession.value = session
    LocalStorage.set('gstc_mobile_session', session)
  }

  function mobileLogout () {
    mobileSession.value = null
    LocalStorage.remove('gstc_mobile_session')
  }

  return {
    desktopUser,
    mobileSession,
    isDesktopLoggedIn,
    isMobileLoggedIn,
    desktopLogin,
    desktopLogout,
    loadDesktopSession,
    mobileLogin,
    mobileLogout
  }
})
