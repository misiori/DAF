import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  const isElectron = process.env.ELECTRON === 'true';

  return {
    // КРИТИЧНО для Electron: относительные пути
    base: './',

    plugins: [
      react(),
      tailwindcss(),

      // PWA только для веба (Vercel), не для Electron
      ...(isElectron
        ? []
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
              manifest: {
                id: '/',
                name: 'DAF',
                short_name: 'DAF',
                description: 'rhythm-based game by misiori',
                theme_color: '#2563eb',
                background_color: '#050b14',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                icons: [
                  { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                  { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                  { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
              },
              devOptions: {
                enabled: true,
                type: 'module',
              },
            }),
          ]),
    ],

    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || __dirname, '.'),
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});