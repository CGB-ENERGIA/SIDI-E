<template>
  <q-layout view="hHh lpR fFf">

    <!-- PWA install banner -->
    <transition name="slide-up">
      <div v-if="showInstallBanner" class="pwa-install-banner">
        <img src="/icons/icon-192x192.png" class="pwa-banner-icon" alt="SIDI-E" />
        <div class="pwa-banner-text">
          <div class="pwa-banner-title">Instalar SIDI-E</div>
          <div class="pwa-banner-sub">Acesse offline, mais rápido</div>
        </div>
        <q-btn unelevated rounded dense color="white" text-color="primary"
          label="Instalar" class="pwa-banner-btn" @click="installPwa" />
        <q-btn flat round dense icon="close" color="white" size="sm"
          class="q-ml-xs" @click="showInstallBanner = false" />
      </div>
    </transition>

    <!-- Header: only on authenticated screens (never on login) -->
    <q-header v-if="showHeader" elevated class="bg-primary">
      <q-toolbar>
        <q-btn flat dense round icon="arrow_back" v-if="canGoBack" @click="$router.back()" />
        <q-toolbar-title>
          <div class="text-subtitle2 text-weight-bold">{{ pageTitle }}</div>
          <div class="text-caption text-blue-2">
            <q-icon name="badge" size="12px" class="q-mr-xs" />
            {{ authStore.mobileSession?.prefixo }}
          </div>
        </q-toolbar-title>

        <!-- Sync (tap to upload pending) -->
        <q-btn
          flat
          dense
          no-caps
          class="q-mr-xs"
          :loading="syncing"
          :disable="!onlineStore.isOnline"
          @click="triggerSync"
        >
          <div class="flex items-center gap-1">
            <div
              class="sync-dot"
              :class="{
                synced: onlineStore.isOnline && onlineStore.pendingCount === 0,
                pending: onlineStore.pendingCount > 0,
                error: !onlineStore.isOnline
              }"
            />
            <span class="text-caption text-white">
              {{
                !onlineStore.isOnline
                  ? 'Offline'
                  : onlineStore.pendingCount > 0
                    ? `${onlineStore.pendingCount} pend.`
                    : 'Sync'
              }}
            </span>
            <q-icon
              v-if="onlineStore.pendingCount > 0"
              name="cloud_upload"
              size="16px"
              class="q-ml-xs"
            />
          </div>
          <q-tooltip>
            {{ onlineStore.pendingCount > 0 ? 'Toque para sincronizar pendências' : 'Tudo sincronizado' }}
          </q-tooltip>
        </q-btn>

        <q-btn flat round icon="logout" size="sm" @click="logoutConfirm" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { useOnlineStore } from 'src/stores/online'
import { useEvidenceStore } from 'src/stores/evidence'
import { useQuasar } from 'quasar'
import { supabase } from 'src/services/supabase'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const onlineStore = useOnlineStore()
const evidenceStore = useEvidenceStore()
const $q = useQuasar()

const syncing = ref(false)

const showHeader = computed(() =>
  authStore.isMobileLoggedIn && route.name !== 'MobileLogin'
)

async function triggerSync () {
  if (!onlineStore.isOnline) {
    $q.notify({ type: 'warning', message: 'Sem conexão — não é possível sincronizar agora.' })
    return
  }
  if (onlineStore.pendingCount === 0) {
    $q.notify({ type: 'info', message: 'Nada pendente para sincronizar.' })
    return
  }
  syncing.value = true
  try {
    await evidenceStore.syncPending()
    $q.notify({
      type: onlineStore.pendingCount === 0 ? 'positive' : 'warning',
      message: onlineStore.pendingCount === 0
        ? 'Sincronização concluída!'
        : `Ainda restam ${onlineStore.pendingCount} pendência(s).`
    })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao sincronizar: ' + e.message })
  } finally {
    syncing.value = false
  }
}

// ── PWA install prompt ────────────────────────────────
const showInstallBanner = ref(false)
let deferredPrompt = null

function onBeforeInstallPrompt (e) {
  e.preventDefault()
  deferredPrompt = e
  // Só mostra se não estiver rodando como PWA instalada
  if (window.matchMedia('(display-mode: standalone)').matches) return
  showInstallBanner.value = true
}

async function installPwa () {
  if (!deferredPrompt) return
  showInstallBanner.value = false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') {
    $q.notify({ type: 'positive', message: 'SIDI-E instalado com sucesso!' })
  }
  deferredPrompt = null
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
})

const pageTitles = {
  MobileLogin: 'Entrar',
  MobileHome: 'Início',
  MobileServico: 'Registrar Serviço',
  MobileCamera: 'Capturar Foto',
  MobileResumo: 'Resumo do Dia'
}

const pageTitle = computed(() => pageTitles[route.name] || 'SIDI-E')

const canGoBack = computed(() =>
  route.name !== 'MobileHome' && route.name !== 'MobileLogin'
)

function logoutConfirm () {
  $q.dialog({
    title: 'Encerrar turno',
    message: 'Deseja realmente encerrar o turno? Dados offline serão sincronizados antes de sair.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const session = authStore.mobileSession
    if (session?.equipeId && onlineStore.isOnline) {
      await supabase
        .from('active_sessions')
        .delete()
        .eq('team_id', session.equipeId)
    }
    authStore.mobileLogout()
    router.replace('/m/login')
  })
}
</script>

<style scoped>
.pwa-install-banner {
  position: fixed;
  bottom: 16px;
  left: 12px;
  right: 12px;
  z-index: 9999;
  background: linear-gradient(135deg, #0f3460, #1a1a2e);
  border-radius: 16px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.12);
}

.pwa-banner-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.pwa-banner-text {
  flex: 1;
  min-width: 0;
}

.pwa-banner-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.pwa-banner-sub {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.55);
  margin-top: 1px;
}

.pwa-banner-btn {
  flex-shrink: 0;
  font-weight: 700;
  padding: 4px 14px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(80px);
  opacity: 0;
}
</style>
