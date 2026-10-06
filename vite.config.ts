import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Horizon',
        short_name: 'Horizon',
        description: 'Jeu éducatif spatial pour enfants',
        theme_color: '#15181c',
        background_color: '#15181c',
        display: 'standalone',
        icons: [],
      },
      workbox: {
        // Textures : seules les variantes 1k et 2k sont précachées.
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico,woff,woff2}',
          'textures/*-1k.jpg',
          'textures/*-2k.jpg',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Les variantes 4k sont mises en cache à la première utilisation.
        runtimeCaching: [
          {
            urlPattern: /\/textures\/[^/]+-4k\.jpg$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'textures-4k',
              expiration: { maxEntries: 8 },
            },
          },
        ],
      },
    }),
  ],
})
