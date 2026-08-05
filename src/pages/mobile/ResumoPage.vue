<template>
  <q-page class="mobile-page q-pa-md">
    <div class="text-h6 text-weight-bold q-mb-md">Resumo do dia</div>

    <q-card flat bordered class="q-mb-md" style="border-radius: 12px; border-left: 4px solid var(--q-primary);">
      <q-card-section>
        <div class="text-caption text-grey-6">EQUIPE</div>
        <div class="text-subtitle1 text-weight-bold">
          {{ session?.prefixo }} — {{ session?.equipeName }}
        </div>
        <div class="text-caption text-grey-6">{{ formatDate(session?.data) }}</div>
      </q-card-section>
    </q-card>

    <div class="row q-gutter-sm q-mb-lg">
      <div class="col" v-for="stat in stats" :key="stat.label">
        <q-card flat bordered style="border-radius: 12px;">
          <q-card-section class="text-center q-pa-md">
            <q-icon :name="stat.icon" :color="stat.color" size="28px" />
            <div class="text-h5 text-weight-bold q-mt-xs">{{ stat.value }}</div>
            <div class="text-caption text-grey-6">{{ stat.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="text-subtitle2 text-weight-bold q-mb-sm">Serviços registrados</div>

    <q-list separator bordered style="border-radius: 12px;" v-if="services.length">
      <q-item v-for="svc in services" :key="svc.id">
        <q-item-section avatar>
          <q-icon
            :name="svc.syncStatus === 'synced' ? 'cloud_done' : 'cloud_upload'"
            :color="svc.syncStatus === 'synced' ? 'positive' : 'orange'"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ svc.activityName || 'Serviço' }}</q-item-label>
          <q-item-label caption>
            {{ formatTime(svc.createdAt) }}
            <span v-if="svc.descricao"> · {{ svc.descricao }}</span>
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge
            :color="svc.syncStatus === 'synced' ? 'positive' : 'orange'"
            :label="svc.syncStatus === 'synced' ? 'Sync' : 'Pend.'"
          />
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else class="text-center text-grey q-py-xl">
      <q-icon name="inbox" size="48px" class="q-mb-sm" />
      <div>Nenhum serviço hoje</div>
    </div>

    <q-btn
      v-if="pendingCount > 0"
      unelevated
      rounded
      color="primary"
      icon="cloud_sync"
      label="Sincronizar agora"
      class="full-width q-mt-lg"
      :loading="syncing"
      @click="syncNow"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from 'src/stores/auth'
import { useEvidenceStore } from 'src/stores/evidence'
import { useOnlineStore } from 'src/stores/online'
import { db, offlineDB } from 'src/services/localDB'
import { useQuasar } from 'quasar'

const authStore = useAuthStore()
const evidenceStore = useEvidenceStore()
const onlineStore = useOnlineStore()
const $q = useQuasar()

const session = authStore.mobileSession
const services = ref([])
const photoCount = ref(0)
const syncing = ref(false)

onMounted(async () => {
  await load()
  // Auto-sincroniza ao abrir a página se houver pendentes e houver internet
  if (onlineStore.isOnline && pendingCount.value > 0) {
    await syncNow()
  }
})

async function load () {
  const allServices = await db.services.toArray()
  services.value = allServices.filter(s =>
    s.teamId === session?.equipeId &&
    (s.data === session?.data || s.createdAt?.startsWith(session?.data))
  )

  let photos = 0
  for (const svc of services.value) {
    const p = await offlineDB.getPhotosByService(svc.id)
    photos += p.length
  }
  photoCount.value = photos
}

const pendingCount = computed(() =>
  services.value.filter(s => s.syncStatus !== 'synced').length
)

const stats = computed(() => [
  { label: 'Serviços', value: services.value.length, icon: 'task', color: 'primary' },
  { label: 'Fotos', value: photoCount.value, icon: 'photo_library', color: 'secondary' },
  { label: 'Pendentes', value: pendingCount.value, icon: 'pending', color: 'orange' }
])

async function syncNow () {
  if (!onlineStore.isOnline) {
    $q.notify({ type: 'warning', message: 'Sem conexão com a internet' })
    return
  }
  syncing.value = true
  try {
    const result = await evidenceStore.syncPending()
    await load()
    if (result.ok) {
      $q.notify({ type: 'positive', message: 'Sincronização concluída!' })
    } else if (result.errors?.length) {
      $q.notify({ type: 'warning', message: result.errors[0], timeout: 5000 })
    } else {
      $q.notify({
        type: 'warning',
        message: `Não foi possível enviar ${result.remaining} item(ns). Tente novamente.`
      })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    syncing.value = false
  }
}

function formatDate (dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  })
}

function formatTime (isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>
