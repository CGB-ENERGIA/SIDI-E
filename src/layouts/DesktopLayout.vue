<template>
  <q-layout view="lHh Lpr lFf">

    <!-- ══ SIDEBAR COMPACTA 72px ══ -->
    <q-drawer
      v-model="drawerOpen"
      show-if-above
      :width="72"
      :breakpoint="700"
      class="sgp-sidebar"
    >
      <!-- Logo CGB -->
      <div class="sgp-logo">CGB</div>

      <!-- Itens de navegação -->
      <nav class="sgp-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="sgp-nav-item"
          active-class="sgp-nav-item--active"
        >
          <q-icon :name="item.icon" size="22px" />
          <span class="sgp-nav-label">{{ item.short }}</span>
          <q-badge
            v-if="item.badgeDynamic && pendingCount > 0"
            class="sgp-nav-badge"
            color="orange"
          >{{ pendingCount }}</q-badge>
        </router-link>
      </nav>

      <!-- Rodapé sidebar -->
      <div class="sgp-sidebar-footer">
        <div class="sgp-avatar" :title="authStore.desktopUser?.email">
          {{ userInitials }}
        </div>
        <button class="sgp-logout-btn" title="Sair" @click="logout">
          <q-icon name="logout" size="18px" />
        </button>
      </div>
    </q-drawer>

    <!-- ══ HEADER ══ -->
    <q-header class="sgp-header">
      <!-- Barra scan animada -->
      <div class="sgp-scan-bar">
        <div class="sgp-scan-line signal-scan" />
      </div>
      <!-- Conteúdo do header -->
      <div class="sgp-header-inner">
        <div class="sgp-header-left">
          <span class="sgp-seal">SIDI-E</span>
          <div>
            <div class="sgp-header-title">CGB Energia</div>
            <div class="sgp-header-sub">Central de Operações · SIDI-E</div>
          </div>
        </div>
        <div class="sgp-header-right">
          <q-badge
            v-if="onlineStore.pendingCount > 0"
            color="orange"
            class="cursor-pointer q-mr-xs"
            @click="triggerSync"
          >
            <q-icon name="cloud_sync" size="13px" class="q-mr-xs" />
            {{ onlineStore.pendingCount }} pendente{{ onlineStore.pendingCount !== 1 ? 's' : '' }}
          </q-badge>
          <span class="sgp-datetime">{{ dateStr }}</span>
          <div
            class="sgp-online-chip"
            :class="{ 'sgp-online-chip--off': !onlineStore.isOnline }"
          >
            <div class="sgp-online-dot" :class="{ 'signal-pulse': onlineStore.isOnline }" />
            {{ onlineStore.isOnline ? 'Online' : 'Offline' }}
          </div>
        </div>
      </div>
    </q-header>

    <!-- ══ CONTEÚDO ══ -->
    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { useOnlineStore } from 'src/stores/online'
import { useEvidenceStore } from 'src/stores/evidence'
import { supabase } from 'src/services/supabase'

const router        = useRouter()
const authStore     = useAuthStore()
const onlineStore   = useOnlineStore()
const evidenceStore = useEvidenceStore()

const drawerOpen   = ref(true)
const pendingCount = ref(0)
const now          = ref(new Date())

let clockTimer = null
onMounted(async () => {
  clockTimer = setInterval(() => { now.value = new Date() }, 30000)
  try {
    const { count } = await supabase
      .from('team_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingCount.value = count || 0
  } catch {}
})
onUnmounted(() => clearInterval(clockTimer))

const isAdmin = computed(() => authStore.isAdmin)

const userInitials = computed(() => {
  const email = authStore.desktopUser?.email || ''
  const parts = email.split('@')[0].split('.')
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
})

const dateStr = computed(() => {
  return now.value.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit'
  }).replace('.', '').toUpperCase()
})

const allMenuItems = [
  { icon: 'dashboard',       label: 'Dashboard',   short: 'Dash',  to: '/dashboard' },
  { icon: 'groups',          label: 'Equipes',      short: 'Equi',  to: '/equipes',      adminOnly: true },
  { icon: 'verified',        label: 'Validação',    short: 'Valid', to: '/validacao' },
  { icon: 'task',            label: 'Atividades',   short: 'Ativ',  to: '/atividades' },
  { icon: 'photo_library',   label: 'Evidências',   short: 'Evid',  to: '/evidencias' },
  { icon: 'assessment',      label: 'Relatórios',   short: 'Rela',  to: '/relatorios' },
  { icon: 'pending_actions', label: 'Solicitações', short: 'Soli',  to: '/solicitacoes', badgeDynamic: true },
  { icon: 'manage_accounts', label: 'Usuários',     short: 'User',  to: '/usuarios',     adminOnly: true }
]

const menuItems = computed(() =>
  allMenuItems.filter(item => !item.adminOnly || isAdmin.value)
)

async function triggerSync () { await evidenceStore.syncPending() }

async function logout () {
  await authStore.desktopLogout()
  router.push('/login')
}
</script>

<style scoped>
/* ── Sidebar ────────────────────────────────────────────── */
.sgp-sidebar :deep(.q-drawer__content) {
  display: flex;
  flex-direction: column;
  background: var(--sidebar);
  border-right: 1px solid var(--sidebar-border);
  overflow: hidden;
}

.sgp-logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  color: var(--primary-fg);
  background: var(--primary);
  box-shadow: var(--shadow-energy);
  flex-shrink: 0;
}

.sgp-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.sgp-nav::-webkit-scrollbar { display: none; }

.sgp-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 0 8px;
  gap: 4px;
  text-decoration: none;
  color: var(--muted-fg);
  transition: color 0.15s, background 0.15s;
  border-left: 3px solid transparent;
}
.sgp-nav-item:hover {
  color: var(--fg);
  background: color-mix(in oklab, var(--fg) 4%, transparent);
}
.sgp-nav-item--active {
  color: var(--primary) !important;
  background: var(--background);
  border-left-color: var(--primary);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent);
}

.sgp-nav-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
}

.sgp-nav-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 0.6rem;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
}

/* ── Rodapé sidebar ──────────────────────────────────────── */
.sgp-sidebar-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 0 16px;
  border-top: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}

.sgp-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary);
  color: var(--primary-fg);
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-energy);
}

.sgp-logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted-fg);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  transition: color 0.15s, background 0.15s;
}
.sgp-logout-btn:hover {
  color: var(--destructive);
  background: color-mix(in oklab, var(--destructive) 10%, transparent);
}

/* ── Header ─────────────────────────────────────────────── */
.sgp-header {
  background: var(--background) !important;
  border-bottom: 1px solid var(--border);
  padding: 0 !important;
  box-shadow: none !important;
}

.sgp-scan-bar {
  height: 3px;
  background: var(--secondary);
  overflow: hidden;
  position: relative;
}
.sgp-scan-line {
  position: absolute;
  inset-block: 0;
  left: 0;
  width: 25%;
  background: color-mix(in oklab, var(--primary) 80%, transparent);
  border-radius: 0 2px 2px 0;
}

.sgp-header-inner {
  height: 61px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.sgp-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sgp-seal {
  background: var(--primary);
  color: var(--primary-fg);
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border-radius: 6px;
  box-shadow: var(--shadow-energy);
}

.sgp-header-title {
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--fg);
  line-height: 1.2;
}

.sgp-header-sub {
  font-family: 'Manrope', sans-serif;
  font-size: 0.7rem;
  color: var(--muted-fg);
  line-height: 1;
}

.sgp-header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sgp-datetime {
  font-family: 'Manrope', sans-serif;
  font-size: 0.78rem;
  color: var(--muted-fg);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.sgp-online-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  background: color-mix(in oklab, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in oklab, var(--primary) 28%, transparent);
  border-radius: 999px;
  padding: 5px 14px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.03em;
}
.sgp-online-chip--off {
  background: color-mix(in oklab, var(--destructive) 8%, transparent);
  border-color: color-mix(in oklab, var(--destructive) 25%, transparent);
  color: var(--destructive);
}

.sgp-online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
  flex-shrink: 0;
}
</style>
