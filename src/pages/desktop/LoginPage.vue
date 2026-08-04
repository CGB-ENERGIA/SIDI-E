<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>

      <!-- Wrapper que bloqueia scroll livre -->
      <div class="page-wrapper">
      <div class="page-slider" :class="{ 'slide-down': showRequisicao }">

      <!-- ── SEÇÃO 1: Login (100vh) ─────────────────────────────── -->
      <section class="login-section" ref="loginSection">

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

        <div class="bg-overlay" />

        <Transition name="ray-fade">
          <div v-if="videoEnded" class="light-ray" />
        </Transition>

        <Transition name="ray-fade">
          <div v-if="videoEnded" class="vignette" />
        </Transition>

        <!-- Card de login centralizado -->
        <div class="login-center">
          <q-card style="width: 100%; max-width: 420px; border-radius: 20px;" class="q-pa-sm login-card">
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
              <q-form @submit.prevent="login" class="form-gap">

                <div class="field-wrap">
                  <div class="field-icon"><q-icon name="email" size="20px" /></div>
                  <div class="field-body">
                    <label class="field-label">E-mail</label>
                    <input
                      v-model="email"
                      type="email"
                      autocomplete="username"
                      class="field-input"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div class="field-wrap">
                  <div class="field-icon"><q-icon name="lock" size="20px" /></div>
                  <div class="field-body">
                    <label class="field-label">Senha</label>
                    <input
                      v-model="password"
                      :type="showPassword ? 'text' : 'password'"
                      autocomplete="current-password"
                      class="field-input"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <button type="button" class="field-toggle" @click="showPassword = !showPassword">
                    <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" size="20px" />
                  </button>
                </div>

                <q-btn
                  type="submit"
                  unelevated
                  rounded
                  color="primary"
                  label="Entrar"
                  class="full-width q-mt-sm"
                  size="lg"
                  :loading="loading"
                  style="letter-spacing: 0.12em; font-weight: 700;"
                />
              </q-form>

              <div class="text-center q-mt-md">
                <q-btn flat dense color="blue-3" label="Acessar app mobile" to="/m/login" size="sm" />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Botão que desce para seção 2 -->
        <button class="scroll-cta" @click="showRequisicao = true">
          Requisição de Materiais
          <span class="scroll-arrow">↓</span>
        </button>
      </section>

      <!-- ── SEÇÃO 2: Requisição de Materiais ───────────────────── -->
      <section class="formularios-section">
        <div class="formularios-content">

          <div class="req-badge">
            <q-icon name="engineering" size="22px" />
            SEGURANÇA EM PRIMEIRO LUGAR
          </div>

          <div class="formularios-title">REQUISIÇÃO DE<br />MATERIAIS</div>

          <div class="epi-pills">
            <span class="pill"><q-icon name="visibility" size="16px" /> Óculos de Proteção</span>
            <span class="pill"><q-icon name="back_hand" size="16px" /> Luvas Isolantes</span>
            <span class="pill"><q-icon name="shield" size="16px" /> Capacete Dielétrico</span>
            <span class="pill"><q-icon name="bolt" size="16px" /> Botina de Segurança</span>
            <span class="pill"><q-icon name="safety_divider" size="16px" /> Protetor Auricular</span>
            <span class="pill"><q-icon name="airline_seat_flat" size="16px" /> Cinto Paraquedista</span>
          </div>

          <p class="formularios-desc">
            O uso correto dos EPIs é <strong>obrigatório</strong> antes de iniciar qualquer atividade.<br />
            Solicite seus materiais de proteção abaixo e garanta sua segurança em campo.
          </p>

          <a
            href="https://cgbma.gpm.srv.br/ci/Geral/Login#IN061"
            target="_blank"
            rel="noopener noreferrer"
            class="req-btn"
          >
            <q-icon name="inventory" size="20px" class="q-mr-sm" />
            Fazer Requisição de Materiais
          </a>

          <button class="back-cta" @click="showRequisicao = false">
            ↑ Voltar ao login
          </button>
        </div>
      </section>

      </div><!-- /page-slider -->
      </div><!-- /page-wrapper -->

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

const showRequisicao = ref(false)

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
/* ── Wrapper: bloqueia scroll livre ────────────────────── */
.page-wrapper {
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.page-slider {
  height: 200vh;
  transition: transform 0.75s cubic-bezier(0.77, 0, 0.18, 1);
  will-change: transform;
}

.page-slider.slide-down {
  transform: translateY(-100vh);
}

/* ── SEÇÃO 1 ────────────────────────────────────────────── */
.login-section {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: #060d1f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-center {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 460px;
  padding: 0 20px;
}

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

.bg-video--ken-burns {
  animation: ken-burns 40s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes ken-burns {
  0%   { transform: scale(1.00) translate(0%, 0%); }
  100% { transform: scale(1.08) translate(-1.5%, -1%); }
}

.bg-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(to bottom, rgba(6,13,31,0.55) 0%, transparent 40%, rgba(6,13,31,0.70) 100%),
    linear-gradient(160deg, rgba(10,20,50,0.60) 0%, rgba(15,52,96,0.45) 50%, rgba(6,13,31,0.65) 100%);
}

.light-ray {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    112deg,
    transparent 0%, transparent 38%,
    rgba(180, 220, 255, 0.055) 50%,
    transparent 62%, transparent 100%
  );
  background-size: 250% 250%;
  animation: ray-sweep 9s ease-in-out infinite;
}

@keyframes ray-sweep {
  0%   { background-position: 150% 150%; opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { background-position: -50% -50%; opacity: 0; }
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(4,8,20,0.55) 100%);
  animation: vignette-pulse 6s ease-in-out infinite;
}

@keyframes vignette-pulse {
  0%   { opacity: 0.7; }
  50%  { opacity: 1.0; }
  100% { opacity: 0.7; }
}

.ray-fade-enter-active { transition: opacity 2s ease; }
.ray-fade-enter-from   { opacity: 0; }

/* ── Botão scroll CTA ──────────────────────────────────── */
.scroll-cta {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: transparent;
  border: 1.5px solid rgba(255, 255, 255, 0.55);
  color: #ffffff;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 12px 32px;
  border-radius: 100px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  white-space: nowrap;
}

.scroll-cta:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.9);
  transform: translateX(-50%) translateY(-2px);
}

.scroll-arrow {
  animation: bounce-y 1.6s ease-in-out infinite;
  display: inline-block;
  font-size: 1.1rem;
}

@keyframes bounce-y {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(5px); }
}

/* ── Card ──────────────────────────────────────────────── */
.login-card {
  background: transparent !important;
  backdrop-filter: blur(22px) saturate(1.8);
  -webkit-backdrop-filter: blur(22px) saturate(1.8);
  border: 1px solid rgba(79, 195, 247, 0.25);
  box-shadow: 0 8px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10);
}

.letra-destaque { letter-spacing: 0.08em; font-size: 0.72rem; }
.hl { color: #4fc3f7; font-weight: 700; }

.company-logo-login {
  width: 80px; height: 80px; object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(79,195,247,0.4));
}

/* ── Inputs ────────────────────────────────────────────── */
.form-gap { display: flex; flex-direction: column; gap: 16px; }

.field-wrap {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(79, 195, 247, 0.25);
  border-radius: 12px;
  padding: 10px 16px;
  gap: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field-wrap:focus-within {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 3px rgba(79,195,247,0.12);
}

.field-icon { color: #4fc3f7; flex-shrink: 0; display: flex; align-items: center; }
.field-body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.field-label {
  font-size: 0.7rem; letter-spacing: 0.06em; color: #4fc3f7;
  text-transform: uppercase; line-height: 1; margin-bottom: 4px;
}
.field-input {
  background: transparent; border: none; outline: none;
  color: #fff; font-size: 0.95rem; line-height: 1.4;
  width: 100%; font-family: inherit;
}
.field-input::placeholder { color: rgba(255,255,255,0.3); }

.field-toggle {
  background: transparent; border: none; cursor: pointer;
  color: #4fc3f7; display: flex; align-items: center; padding: 0; flex-shrink: 0;
}

/* ── SEÇÃO 2: Formulários ────────────────────────────────── */
.formularios-section {
  height: 100vh;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.formularios-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 24px;
}

.formularios-logo {
  width: 72px; height: 72px; object-fit: contain;
  margin-bottom: 8px;
}

.req-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(211, 47, 47, 0.15);
  border: 1px solid rgba(211, 47, 47, 0.4);
  color: #ef9a9a;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  padding: 6px 16px;
  border-radius: 100px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.formularios-title {
  font-size: clamp(2.2rem, 5.5vw, 4rem);
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #ffffff;
  line-height: 1.05;
  text-align: center;
}

.epi-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 560px;
  margin: 4px 0;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #ccc;
  font-size: 0.78rem;
  padding: 5px 14px;
  border-radius: 100px;
  white-space: nowrap;
}

.formularios-desc {
  font-size: 0.97rem;
  color: #888;
  font-style: italic;
  line-height: 1.7;
  margin: 4px 0 8px;
  text-align: center;
  max-width: 520px;
}
.formularios-desc strong {
  color: #ef9a9a;
  font-style: normal;
}

.req-btn {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.6);
  color: #ffffff;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 14px 40px;
  border-radius: 100px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}
.req-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: #fff;
  transform: translateY(-2px);
}

.back-cta {
  margin-top: 8px;
  background: transparent;
  border: none;
  color: #555;
  font-family: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: color 0.2s;
}
.back-cta:hover { color: #aaa; }
</style>
