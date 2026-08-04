<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center desktop-login">
        <q-card style="width: 100%; max-width: 420px; border-radius: 20px;" class="q-pa-sm">
          <q-card-section class="text-center q-pt-lg">
            <q-icon name="electrical_services" size="64px" color="primary" />
            <div class="text-h5 text-weight-bold q-mt-sm">GSTC</div>
            <div class="text-caption text-grey-6">Painel administrativo de inspeções</div>
          </q-card-section>

          <q-card-section class="q-px-lg q-pb-lg">
            <q-form @submit.prevent="login" class="q-gutter-md">
              <q-input
                v-model="email"
                type="email"
                label="E-mail"
                outlined
                dense
                autocomplete="username"
                :rules="[v => !!v || 'Informe o e-mail']"
              >
                <template #prepend><q-icon name="email" /></template>
              </q-input>

              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Senha"
                outlined
                dense
                autocomplete="current-password"
                :rules="[v => !!v || 'Informe a senha']"
              >
                <template #prepend><q-icon name="lock" /></template>
                <template #append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <q-btn
                type="submit"
                unelevated
                rounded
                color="primary"
                label="Entrar"
                class="full-width"
                size="lg"
                :loading="loading"
              />
            </q-form>

            <div class="text-center q-mt-lg">
              <q-btn flat dense color="grey-7" label="Acessar app mobile" to="/m/login" />
            </div>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { useQuasar } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()
const $q = useQuasar()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

async function login () {
  loading.value = true
  try {
    await authStore.desktopLogin(email.value.trim(), password.value)
    router.replace('/dashboard')
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Falha no login' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.desktop-login {
  min-height: 100vh;
  background:
    radial-gradient(ellipse at top left, rgba(15, 52, 96, 0.35), transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(233, 69, 96, 0.15), transparent 45%),
    linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}
</style>
