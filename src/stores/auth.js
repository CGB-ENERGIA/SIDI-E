import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from 'src/services/supabase'
import { LocalStorage } from 'quasar'

export const ADMIN_EMAIL = 'italo.fontes@cgbengenharia.com.br'

export const useAuthStore = defineStore('auth', () => {
  const desktopUser = ref(null)
  const mobileSession = ref(LocalStorage.getItem('gstc_mobile_session') || null)

  const isDesktopLoggedIn = computed(() => !!desktopUser.value)
  const isMobileLoggedIn = computed(() => !!mobileSession.value)

  // Papel lido do app_metadata.portal_role (definido pelo portal corporativo).
  // Fallback durante transição: admin_email hardcoded vira 'admin' enquanto
  // o portal ainda não definiu o portal_role explicitamente.
  const portalRole = computed(() => {
    const role = desktopUser.value?.app_metadata?.portal_role
    if (role) return role
    if (desktopUser.value?.email === ADMIN_EMAIL) return 'admin'
    return 'viewer'
  })

  /** Acesso total — Equipes, Usuários, configurações */
  const isAdmin = computed(() => portalRole.value === 'admin')

  /** Único que pode gerenciar usuários e permissões em qualquer sistema */
  const isSuperAdmin = computed(() => {
    if (!desktopUser.value) return false
    if (desktopUser.value.email === ADMIN_EMAIL) return true
    if (String(desktopUser.value.user_metadata?.matricula || '') === '12690') return true
    return false
  })

  /** Pode adicionar/editar registros, não gerencia equipes/usuários */
  const isEditor = computed(() => portalRole.value === 'editor' || portalRole.value === 'admin')

  /** Qualquer usuário autenticado no desktop */
  const isViewer = computed(() => !!desktopUser.value)

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
    portalRole,
    isAdmin,
    isSuperAdmin,
    isEditor,
    isViewer,
    desktopLogin,
    desktopLogout,
    loadDesktopSession,
    mobileLogin,
    mobileLogout
  }
})
