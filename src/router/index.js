import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { queueSessionRelease } from 'src/services/sessionRelease'

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000

function isMobileSessionStale (session) {
  const ref = session.loginAt ? new Date(session.loginAt) : new Date(session.data + 'T00:00:00')
  const t = ref.getTime()
  return Number.isFinite(t) && Date.now() - t > SESSION_MAX_AGE_MS
}

const routes = [
  // ── Desktop login ─────────────────────────────────────────────
  {
    path: '/login',
    name: 'DesktopLogin',
    component: () => import('src/pages/desktop/LoginPage.vue'),
    meta: { guestOnly: true }
  },

  // ── Desktop ──────────────────────────────────────────────────
  {
    path: '/',
    component: () => import('src/layouts/DesktopLayout.vue'),
    meta: { requiresDesktopAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('src/pages/desktop/DashboardPage.vue')
      },
      {
        path: 'equipes',
        name: 'Equipes',
        component: () => import('src/pages/desktop/TeamsPage.vue'),
        meta: { superAdminOnly: true }
      },
      {
        path: 'atividades',
        name: 'Atividades',
        component: () => import('src/pages/desktop/ActivitiesPage.vue')
      },
      { path: 'evidencias', redirect: '/atividades' },
      {
        path: 'turnos',
        name: 'Turnos',
        component: () => import('src/pages/desktop/TurnosPage.vue')
      },
      {
        path: 'relatorios',
        name: 'Relatorios',
        component: () => import('src/pages/desktop/ReportsPage.vue')
      },
      {
        path: 'validacao',
        name: 'Validacao',
        component: () => import('src/pages/desktop/ValidationPage.vue')
      },
      {
        path: 'solicitacoes',
        name: 'Solicitacoes',
        component: () => import('src/pages/desktop/SolicitacoesPage.vue'),
        meta: { superAdminOnly: true }
      },
      {
        path: 'usuarios',
        name: 'Usuarios',
        component: () => import('src/pages/desktop/UsersPage.vue'),
        meta: { superAdminOnly: true }
      }
    ]
  },

  // ── Mobile / PWA ──────────────────────────────────────────────
  {
    path: '/m',
    component: () => import('src/layouts/MobileLayout.vue'),
    children: [
      {
        path: '',
        redirect: () => {
          const authStore = useAuthStore()
          return authStore.mobileSession ? '/m/home' : '/m/login'
        }
      },
      {
        path: 'login',
        name: 'MobileLogin',
        component: () => import('src/pages/mobile/LoginPage.vue')
      },
      {
        path: 'home',
        name: 'MobileHome',
        component: () => import('src/pages/mobile/HomePage.vue'),
        meta: { requiresMobileAuth: true }
      },
      {
        path: 'servico/:id?',
        name: 'MobileServico',
        component: () => import('src/pages/mobile/ServicoPage.vue'),
        meta: { requiresMobileAuth: true }
      },
      {
        path: 'camera/:tipo',
        name: 'MobileCamera',
        component: () => import('src/pages/mobile/CameraPage.vue'),
        meta: { requiresMobileAuth: true }
      },
      {
        path: 'resumo',
        name: 'MobileResumo',
        component: () => import('src/pages/mobile/ResumoPage.vue'),
        meta: { requiresMobileAuth: true }
      }
    ]
  },

  // ── Catch-all ─────────────────────────────────────────────────
  {
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/ErrorNotFound.vue')
  }
]

export default defineRouter(function () {
  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHistory(process.env.VUE_ROUTER_BASE)
  })

  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    const shotPreview = import.meta.env.DEV && to.query.shot === '1'

    // Preview de captura (somente em DEV) — libera UI real para marketing
    if (shotPreview && to.meta.requiresDesktopAuth && !authStore.isDesktopLoggedIn) {
      authStore.desktopUser = { email: 'preview@sidi-e.app', id: 'shot-preview' }
    }

    // Ensure desktop session is loaded once
    if (authStore.desktopUser === null && to.meta.requiresDesktopAuth) {
      await authStore.loadDesktopSession()
    }

    // Auto-redirect phones to mobile app
    if (isMobile && !to.path.startsWith('/m') && to.name !== 'DesktopLogin' && !shotPreview) {
      return { path: '/m' }
    }

    // Desktop auth
    if (to.meta.requiresDesktopAuth && !authStore.isDesktopLoggedIn) {
      return { name: 'DesktopLogin', query: { redirect: to.fullPath } }
    }

    if (to.meta.guestOnly && authStore.isDesktopLoggedIn) {
      return { path: '/dashboard' }
    }

    // Restrict admin-only pages
    if (to.meta.adminOnly && !authStore.isAdmin && !shotPreview) {
      return { path: '/dashboard' }
    }

    // Restrict super-admin-only pages (somente matrícula 12690)
    if (to.meta.superAdminOnly && !authStore.isSuperAdmin && !shotPreview) {
      return { path: '/dashboard' }
    }

    // Turno esquecido aberto há mais de 24h: encerra localmente e enfileira a liberação
    // no servidor (sem rede aqui, para não travar a navegação). Pendências de serviços/fotos
    // continuam no IndexedDB e sincronizam normalmente.
    if (to.path.startsWith('/m') && authStore.mobileSession && isMobileSessionStale(authStore.mobileSession)) {
      queueSessionRelease(authStore.mobileSession)
      authStore.mobileLogout()
      Notify.create({
        type: 'warning',
        message: 'Turno anterior encerrado automaticamente',
        caption: 'Ele estava aberto há mais de 24h. Inicie um novo turno.',
        timeout: 6000
      })
    }

    // PWA start_url aponta fixo para /m/login — se já existe turno ativo salvo
    // localmente, pula a tela de login (fundamental para uso offline)
    if (to.name === 'MobileLogin' && authStore.mobileSession) {
      return { path: '/m/home' }
    }

    // Protect mobile routes
    if (to.meta.requiresMobileAuth && !authStore.mobileSession) {
      return { name: 'MobileLogin' }
    }
  })

  return router
})
