import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'og-cover.jpg',
          'robots.txt',
          'sitemap.xml',
        ],
        manifest: {
          id: '/',
          name: 'PATOFOOT - Futebol Manager',
          short_name: 'PatoFoot',
          description:
            'PATOFOOT - Jogo completo de futebol manager com simulação 2D, seleções 2027-2038, mercado da bola, finanças e campeonatos mundiais.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/',
          lang: 'pt-BR',
          categories: ['games', 'sports'],
          shortcuts: [
            {
              name: 'Jogar na Web',
              short_name: 'Jogar',
              description: 'Abrir o PATOFOOT direto na tela de carreira',
              url: '/',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Site Oficial & Download',
              short_name: 'Site Oficial',
              description: 'Ver novidades, campeonatos e guia de instalação do app',
              url: '/site',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
          screenshots: [
            {
              src: '/og-cover.jpg',
              sizes: '1280x720',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'PATOFOOT - Simulador de Futebol Manager Mundial',
            },
          ],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/\.well-known/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-css',
                expiration: {maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'patofoot-media-cache',
                expiration: {maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    build: {
      target: 'es2020',
      sourcemap: false,
      cssCodeSplit: true,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) {
              return 'vendor-recharts';
            }
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react';
            }
            if (id.includes('brazilCuratedRosters2026') || id.includes('soccerWikiBrazilEngine')) {
              return 'data-brazil-rosters';
            }
            if (
              id.includes('soccerWikiEnglandEngine') ||
              id.includes('championship2026Rosters') ||
              id.includes('leagueOne2026Rosters') ||
              id.includes('leagueTwo2026Rosters')
            ) {
              return 'data-england-rosters';
            }
            if (
              id.includes('europeTop5Rosters2026') ||
              id.includes('portugal2026Rosters') ||
              id.includes('netherlands2026Rosters') ||
              id.includes('belgium2026Rosters') ||
              id.includes('turkey2026Rosters') ||
              id.includes('greece2026Rosters') ||
              id.includes('norway2026Rosters') ||
              id.includes('denmark2026Rosters') ||
              id.includes('switzerland2026Rosters') ||
              id.includes('sweden2026Rosters') ||
              id.includes('scotland2026Rosters') ||
              id.includes('specialLeague1Rosters') ||
              id.includes('specialLeague2Rosters')
            ) {
              return 'data-europe-rosters';
            }
            if (
              id.includes('southAmericaCuratedRosters2026') ||
              id.includes('worldCuratedRosters2026') ||
              id.includes('worldLeaguesData') ||
              id.includes('usaMls2026Data')
            ) {
              return 'data-world-rosters';
            }
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
