import { boot } from 'quasar/wrappers'
import { supabase } from 'src/services/supabase'
import { useAuthStore } from 'src/stores/auth'

export default boot(async ({ app, router }) => {
  // Expose supabase globally if needed
  app.config.globalProperties.$supabase = supabase

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    const authStore = useAuthStore()
    authStore.desktopUser = session?.user ?? null
  })
})
