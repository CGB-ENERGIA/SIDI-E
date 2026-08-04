<template>
  <q-page class="mobile-page q-pa-md">
    <!-- Session banner -->
    <q-card flat bordered class="q-mb-md" style="border-radius: 12px; border-left: 4px solid var(--q-primary);">
      <q-card-section class="q-pa-md">
        <div class="text-caption text-grey-6">TURNO ATIVO</div>
        <div class="text-h6 text-weight-bold">{{ session.prefixo }} — {{ session.equipeName }}</div>
        <div class="text-caption text-grey-6">
          <q-icon name="calendar_today" size="12px" class="q-mr-xs" />
          {{ formatDate(session.data) }}
        </div>
        <q-separator class="q-my-sm" />
        <div class="flex gap-xs flex-wrap">
          <q-chip
            v-for="col in session.colaboradores"
            :key="col"
            dense
            color="blue-1"
            text-color="primary"
            icon="person"
            size="sm"
          >{{ col }}</q-chip>
        </div>
      </q-card-section>
    </q-card>

    <!-- Services registered today -->
    <div class="text-subtitle2 text-weight-bold q-mb-sm q-mt-md">
      <q-icon name="list_alt" class="q-mr-xs" />
      Serviços de hoje ({{ services.length }})
    </div>

    <q-list separator bordered style="border-radius: 12px;" class="q-mb-lg" v-if="services.length">
      <q-item
        v-for="svc in services"
        :key="svc.id"
        clickable
        :to="`/m/servico/${svc.id}`"
      >
        <q-item-section avatar>
          <q-icon
            :name="svc.syncStatus === 'synced' ? 'cloud_done' : 'pending'"
            :color="svc.syncStatus === 'synced' ? 'positive' : 'orange'"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ svc.activityName }}</q-item-label>
          <q-item-label caption>
            {{ svc.photos?.length || 0 }} foto(s) •
            {{ formatTime(svc.createdAt) }}
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
      <q-icon name="add_task" size="48px" class="q-mb-sm" />
      <div>Nenhum serviço registrado hoje</div>
    </div>

    <q-btn
      outline
      rounded
      color="primary"
      icon="assessment"
      label="Resumo do dia"
      class="full-width q-mb-xl"
      to="/m/resumo"
    />

    <!-- FAB - New service -->
    <q-page-sticky position="bottom-right" :offset="[16, 16]">
      <q-btn
        fab
        icon="add"
        color="primary"
        label="Novo serviço"
        :to="'/m/servico'"
      />
    </q-page-sticky>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from 'src/stores/auth'
import { offlineDB } from 'src/services/localDB'

const authStore = useAuthStore()
const session = authStore.mobileSession
const services = ref([])

onMounted(async () => {
  const all = await offlineDB.getPendingServices()
  services.value = all.filter(s =>
    s.teamId === session.equipeId &&
    s.createdAt?.startsWith(session.data)
  )
})

function formatDate (dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  })
}

function formatTime (isoStr) {
  return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>
