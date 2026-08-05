import { defineConfig } from '#q-app/wrappers'

export default defineConfig(function (/* ctx */) {
  return {
    boot: [
      'supabase',
      'offline'
    ],

    css: [
      'app.scss'
    ],

    extras: [
      'material-icons',
      'material-symbols-outlined',
      'roboto-font'
    ],

    build: {
      target: {
        browser: ['es2022', 'chrome100', 'firefox100', 'safari15'],
        node: 'node20'
      },

      vueRouterMode: 'history',

      vitePlugins: []
    },

    devServer: {
      open: true
    },

    framework: {
      config: {
        dark: 'auto',
        notify: {
          position: 'top',
          timeout: 3000
        }
      },

      iconSet: 'material-icons',
      lang: 'pt-BR',

      plugins: [
        'Notify',
        'Dialog',
        'Loading',
        'LocalStorage',
        'SessionStorage',
        'BottomSheet'
      ]
    },

    animations: [],

    pwa: {
      workboxMode: 'InjectManifest',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,

      extendInjectManifestOptions (cfg) {
        cfg.swSrc = 'src-pwa/custom-service-worker.js'
        cfg.maximumFileSizeToCacheInBytes = 5 * 1024 * 1024 // 5MB
      },

      manifest: {
        name: 'SIDI-E Inspeções',
        short_name: 'SIDI-E',
        description: 'Sistema de Inspeção e Documentação de Instalações Elétricas',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f3460',
        theme_color: '#0f3460',
        start_url: '/m/login',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192x192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    },

    sourceFiles: {
      rootComponent: 'src/App.vue',
      router: 'src/router/index',
      store: 'src/stores/index'
    }
  }
})
