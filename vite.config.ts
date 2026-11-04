import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Sur GitHub Pages, l'app vit dans un sous-dossier (/nom-du-depot/).
// Le workflow de déploiement fournit ce chemin via VITE_BASE ; en local, c'est la racine.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Suivi activité',
        short_name: 'Suivi',
        description: 'Suivi personnel du sport et de l’alimentation',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F2F4F1',
        theme_color: '#F2F4F1',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout ce qui est listé ici est gardé sur le téléphone pour marcher sans réseau.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
