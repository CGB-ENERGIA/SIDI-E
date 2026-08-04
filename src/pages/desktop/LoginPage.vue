<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center desktop-login">

        <!-- Vídeo de fundo -->
        <video
          class="bg-video"
          autoplay
          muted
          loop
          playsinline
          src="/login-bg.mp4"
        />
        <!-- Overlay escuro sobre o vídeo -->
        <div class="bg-overlay" />

        <q-card style="width: 100%; max-width: 420px; border-radius: 20px; position: relative; z-index: 2;" class="q-pa-sm login-card">
          <q-card-section class="text-center q-pt-lg">
            <q-icon name="electrical_services" size="64px" color="primary" />
            <div class="text-h5 text-weight-bold q-mt-sm">SIDI-E</div>
            <div class="text-caption text-grey-5 q-mt-xs letra-destaque">
              <span class="hl">SI</span>STEMA
              <span class="hl">D</span>E
              <span class="hl">I</span>NSPEÇÃO
              DE
              <span class="hl">E</span>PIS
            </div>
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
  position: relative;
  overflow: hidden;
  background: #0f3460;
}

.bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(10, 20, 50, 0.75) 0%,
    rgba(15, 52, 96, 0.65) 50%,
    rgba(10, 20, 40, 0.80) 100%
  );
  z-index: 1;
}

.login-card {
  background: rgba(22, 33, 62, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(79, 195, 247, 0.15);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.letra-destaque {
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}

.hl {
  color: #4fc3f7;
  font-weight: 700;
}
</style>
