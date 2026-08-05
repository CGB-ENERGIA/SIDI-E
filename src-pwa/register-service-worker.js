import { register } from 'register-service-worker'

// Em produção, registra o service worker
// Em dev, o Quasar não usa este arquivo
register(process.env.SERVICE_WORKER_FILE, {
  ready () {
    console.log('[PWA] Service worker ativo e operando.')
  },
  registered (registration) {
    console.log('[PWA] Service worker registrado.')
    // Verifica atualizações a cada 60 segundos quando o app está aberto
    setInterval(() => registration.update(), 60 * 1000)
  },
  cached () {
    console.log('[PWA] Conteúdo cacheado para uso offline.')
  },
  updatefound () {
    console.log('[PWA] Nova versão disponível — baixando...')
  },
  updated (registration) {
    console.log('[PWA] Nova versão instalada.')
    document.dispatchEvent(new CustomEvent('swUpdated', { detail: registration }))
  },
  offline () {
    console.log('[PWA] Sem conexão — operando em modo offline.')
  },
  error (err) {
    console.error('[PWA] Erro no service worker:', err)
  }
})
