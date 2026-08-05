<template>
  <div>
    <!-- Splash de abertura (PWA / cold start) -->
    <Transition name="splash-fade">
      <div v-if="showSplash" class="app-splash" aria-hidden="true">
        <div class="splash-glow" />
        <div class="splash-content">
          <img src="/icons/icon-512x512.png" alt="SIDI-E" class="splash-logo" />
          <div class="splash-title">SIDI-E</div>
          <div class="splash-sub">
            <span class="hl">SI</span>STEMA
            <span class="hl">D</span>E
            <span class="hl">I</span>NSPEÇÃO
            DE
            <span class="hl">E</span>PIS
          </div>
          <div class="splash-loader">
            <span /><span /><span />
          </div>
        </div>
      </div>
    </Transition>

    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showSplash = ref(true)

onMounted(() => {
  // Tempo mínimo para a splash “respirar”; some assim que a app está pronta
  const minMs = 1100
  const started = Date.now()

  const hide = () => {
    const wait = Math.max(0, minMs - (Date.now() - started))
    setTimeout(() => { showSplash.value = false }, wait)
  }

  if (document.readyState === 'complete') {
    hide()
  } else {
    window.addEventListener('load', hide, { once: true })
    // Fallback se o evento load já passou
    setTimeout(hide, minMs + 400)
  }
})
</script>

<style scoped>
.app-splash {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 35%, rgba(79, 195, 247, 0.18), transparent 55%),
    linear-gradient(160deg, #0a1a33 0%, #0f3460 45%, #16213e 100%);
  overflow: hidden;
}

.splash-glow {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(233, 69, 96, 0.22), transparent 70%);
  filter: blur(8px);
  animation: glow-pulse 2.4s ease-in-out infinite;
}

.splash-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  animation: splash-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.splash-logo {
  width: 96px;
  height: 96px;
  border-radius: 22px;
  object-fit: contain;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.splash-title {
  margin-top: 8px;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fff;
}

.splash-sub {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
}

.splash-sub .hl {
  color: #4fc3f7;
  font-weight: 700;
}

.splash-loader {
  display: flex;
  gap: 6px;
  margin-top: 22px;
}

.splash-loader span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4fc3f7;
  opacity: 0.35;
  animation: loader-dot 1.1s ease-in-out infinite;
}

.splash-loader span:nth-child(2) { animation-delay: 0.15s; }
.splash-loader span:nth-child(3) { animation-delay: 0.3s; }

@keyframes splash-rise {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes glow-pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%      { transform: scale(1.12); opacity: 1; }
}

@keyframes loader-dot {
  0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-4px); }
}

.splash-fade-leave-active {
  transition: opacity 0.45s ease;
}
.splash-fade-leave-to {
  opacity: 0;
}
</style>
