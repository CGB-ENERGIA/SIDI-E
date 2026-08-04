<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header only shown when logged in -->
    <q-header v-if="authStore.isMobileLoggedIn" elevated class="bg-primary">
      <q-toolbar>
        <q-btn flat dense round icon="arrow_back" v-if="canGoBack" @click="$router.back()" />
        <q-toolbar-title>
          <div class="text-subtitle2 text-weight-bold">{{ pageTitle }}</div>
          <div class="text-caption text-blue-2">
            <q-icon name="badge" size="12px" class="q-mr-xs" />
            {{ authStore.mobileSession?.prefixo }}
          </div>
        </q-toolbar-title>

        <!-- Sync dot -->
        <div class="flex items-center gap-1 q-mr-sm">
          <div
            class="sync-dot"
            :class="{
              synced: onlineStore.isOnline && onlineStore.pendingCount === 0,
              pending: onlineStore.pendingCount > 0,
              error: !onlineStore.isOnline
            }"
          />
          <span class="text-caption text-white">
            {{ onlineStore.isOnline ? (onlineStore.pendingCount > 0 ? `${onlineStore.pendingCount} pend.` : 'Sync') : 'Offline' }}
          </span>
        </div>

        <q-btn flat round icon="logout" size="sm" @click="logoutConfirm" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { useOnlineStore } from 'src/stores/online'
import { useQuasar } from 'quasar'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const onlineStore = useOnlineStore()
const $q = useQuasar()

const pageTitles = {
  MobileLogin: 'Entrar',
  MobileHome: 'Início',
  MobileServico: 'Registrar Serviço',
  MobileCamera: 'Capturar Foto',
  MobileResumo: 'Resumo do Dia'
}

const pageTitle = computed(() => pageTitles[route.name] || 'GSTC')

const canGoBack = computed(() =>
  route.name !== 'MobileHome' && route.name !== 'MobileLogin'
)

function logoutConfirm () {
  $q.dialog({
    title: 'Encerrar turno',
    message: 'Deseja realmente encerrar o turno? Dados offline serão sincronizados antes de sair.',
    cancel: true,
    persistent: true
  }).onOk(() => {
    authStore.mobileLogout()
    router.replace('/m/login')
  })
}
</script>
