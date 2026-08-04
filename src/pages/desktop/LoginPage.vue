<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center desktop-login">

        <!-- Vídeo de fundo -->
        <video
          ref="bgVideo"
          class="bg-video"
          :class="{ 'bg-video--ken-burns': videoEnded }"
          autoplay
          muted
          playsinline
          :src="currentVideo"
          @ended="onVideoEnded"
        />

        <!-- Overlay base -->
        <div class="bg-overlay" />

        <!-- Raio de luz diagonal — ativo só após o fim do vídeo -->
        <Transition name="ray-fade">
          <div v-if="videoEnded" class="light-ray" />
        </Transition>

        <!-- Vinheta pulsante — ativo só após o fim do vídeo -->
        <Transition name="ray-fade">
          <div v-if="videoEnded" class="vignette" />
        </Transition>

        <q-card style="width: 100%; max-width: 420px; border-radius: 20px; position: relative; z-index: 10;" class="q-pa-sm login-card">
          <q-card-section class="text-center q-pt-lg">
            <img src="/favicon.ico" alt="CGB Energia" class="company-logo-login" />
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
                dark
                dense
                bg-color="transparent"
                label-color="blue-3"
                input-class="text-white"
                autocomplete="username"
                :rules="[v => !!v || 'Informe o e-mail']"
                class="login-input"
              >
                <template #prepend><q-icon name="email" color="blue-3" /></template>
              </q-input>

              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Senha"
                outlined
                dark
                dense
                bg-color="transparent"
                label-color="blue-3"
                input-class="text-white"
                autocomplete="current-password"
                :rules="[v => !!v || 'Informe a senha']"
                class="login-input"
              >
                <template #prepend><q-icon name="lock" color="blue-3" /></template>
                <template #append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    color="blue-3"
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
                class="full-width q-mt-sm"
                size="lg"
                :loading="loading"
                style="letter-spacing: 0.1em; font-weight: 700;"
              />
            </q-form>

            <div class="text-center q-mt-md">
              <q-btn flat dense color="blue-3" label="Acessar app mobile" to="/m/login" size="sm" />
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

const bgVideo = ref(null)
const videoEnded = ref(false)
const videos = ['/login-bg.mp4', '/login-bg2.mp4']
const currentVideoIndex = ref(0)
const currentVideo = ref(videos[0])

function onVideoEnded () {
  const next = currentVideoIndex.value + 1
  if (next < videos.length) {
    currentVideoIndex.value = next
    currentVideo.value = videos[next]
    bgVideo.value?.load()
    bgVideo.value?.play()
  } else {
    videoEnded.value = true
  }
}

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
  background: #060d1f;
}

/* ── Vídeo ─────────────────────────────────────────────── */
.bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  transform-origin: 60% 50%;
  will-change: transform;
}

/* Ken Burns cinematográfico: zoom lento para um canto, sem retorno */
.bg-video--ken-burns {
  animation: ken-burns 40s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes ken-burns {
  0%   { transform: scale(1.00) translate(0%,   0%); }
  100% { transform: scale(1.08) translate(-1.5%, -1%); }
}

/* ── Overlay base ──────────────────────────────────────── */
.bg-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(to bottom, rgba(6,13,31,0.55) 0%, transparent 40%, rgba(6,13,31,0.70) 100%),
    linear-gradient(160deg, rgba(10,20,50,0.60) 0%, rgba(15,52,96,0.45) 50%, rgba(6,13,31,0.65) 100%);
}

/* ── Raio de luz diagonal ──────────────────────────────── */
.light-ray {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    112deg,
    transparent 0%,
    transparent 38%,
    rgba(180, 220, 255, 0.055) 50%,
    transparent 62%,
    transparent 100%
  );
  background-size: 250% 250%;
  animation: ray-sweep 9s ease-in-out infinite;
}

@keyframes ray-sweep {
  0%   { background-position: 150% 150%; opacity: 0;   }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { background-position: -50% -50%; opacity: 0;   }
}

/* ── Vinheta pulsante ──────────────────────────────────── */
.vignette {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  border-radius: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 55%,
    rgba(4, 8, 20, 0.55) 100%
  );
  animation: vignette-pulse 6s ease-in-out infinite;
}

@keyframes vignette-pulse {
  0%   { opacity: 0.7; }
  50%  { opacity: 1.0; }
  100% { opacity: 0.7; }
}

/* ── Fade-in dos efeitos ao entrar ─────────────────────── */
.ray-fade-enter-active { transition: opacity 2s ease; }
.ray-fade-enter-from   { opacity: 0; }

/* ── Card ──────────────────────────────────────────────── */
.login-card {
  background: transparent !important;
  backdrop-filter: blur(22px) saturate(1.8);
  -webkit-backdrop-filter: blur(22px) saturate(1.8);
  border: 1px solid rgba(79, 195, 247, 0.25);
  box-shadow:
    0 8px 48px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

/* ── Tipografia ────────────────────────────────────────── */
.letra-destaque {
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}

.hl {
  color: #4fc3f7;
  font-weight: 700;
}

.company-logo-login {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(79,195,247,0.4));
}

/* Inputs transparentes com borda azul */
.login-input :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 0 16px;
  min-height: 52px;
}
.login-input :deep(.q-field__native) {
  padding: 10px 0;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}
.login-input :deep(.q-field__label) {
  font-size: 0.82rem;
  letter-spacing: 0.04em;
}
.login-input :deep(.q-field__control:before) {
  border-color: rgba(79, 195, 247, 0.3);
}
.login-input :deep(.q-field__control:hover:before) {
  border-color: rgba(79, 195, 247, 0.7);
}
.login-input :deep(.q-field--focused .q-field__control:before) {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.15);
}
</style>
