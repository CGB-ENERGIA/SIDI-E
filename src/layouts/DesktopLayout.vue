<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Header -->
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="leftDrawerOpen = !leftDrawerOpen" />

        <q-toolbar-title class="flex items-center gap-2">
          <q-icon name="electrical_services" size="28px" />
          <span class="text-weight-bold">SIDI-E</span>
          <span class="text-body2 text-blue-2 q-ml-xs">Inspeções</span>
        </q-toolbar-title>

        <!-- Sync status -->
        <q-badge
          v-if="onlineStore.pendingCount > 0"
          color="orange"
          class="q-mr-md cursor-pointer"
          @click="triggerSync"
        >
          <q-icon name="cloud_sync" size="14px" class="q-mr-xs" />
          {{ onlineStore.pendingCount }} pendente{{ onlineStore.pendingCount > 1 ? 's' : '' }}
        </q-badge>

        <!-- Online indicator -->
        <q-chip
          :color="onlineStore.isOnline ? 'positive' : 'negative'"
          text-color="white"
          dense
          class="q-mr-md"
        >
          <q-icon :name="onlineStore.isOnline ? 'wifi' : 'wifi_off'" size="14px" class="q-mr-xs" />
          {{ onlineStore.isOnline ? 'Online' : 'Offline' }}
        </q-chip>

        <q-btn flat round icon="account_circle" @click="profileMenu = true">
          <q-menu v-model="profileMenu">
            <q-list style="min-width: 180px">
              <q-item>
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ authStore.desktopUser?.email }}</q-item-label>
                  <q-item-label caption>Administrador</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar><q-icon name="logout" /></q-item-section>
                <q-item-section>Sair</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Sidebar -->
    <q-drawer v-model="leftDrawerOpen" show-if-above :width="240" :breakpoint="700" bordered>
      <q-scroll-area class="fit">
        <div class="q-pa-md q-pb-sm">
          <div class="text-caption text-grey-6 text-uppercase text-weight-bold q-mb-sm">Menu</div>
        </div>
        <q-list padding>
          <q-item
            v-for="item in menuItems"
            :key="item.to"
            :to="item.to"
            clickable
            v-ripple
            active-class="text-primary bg-blue-1"
            rounded
            class="q-mb-xs"
          >
            <q-item-section avatar>
              <q-icon :name="item.icon" />
            </q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
            <q-item-section v-if="item.badge" side>
              <q-badge :color="item.badgeColor || 'primary'">{{ item.badge }}</q-badge>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Page content -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { useOnlineStore } from 'src/stores/online'
import { useEvidenceStore } from 'src/stores/evidence'

const router = useRouter()
const authStore = useAuthStore()
const onlineStore = useOnlineStore()
const evidenceStore = useEvidenceStore()

const leftDrawerOpen = ref(true)
const profileMenu = ref(false)

const menuItems = [
  { icon: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { icon: 'groups', label: 'Equipes', to: '/equipes' },
  { icon: 'task', label: 'Atividades', to: '/atividades' },
  { icon: 'photo_library', label: 'Evidências', to: '/evidencias' },
  { icon: 'assessment', label: 'Relatórios', to: '/relatorios' }
]

async function triggerSync () {
  await evidenceStore.syncPending()
}

async function logout () {
  await authStore.desktopLogout()
  router.push('/login')
}
</script>
