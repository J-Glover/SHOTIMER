import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { serveAppManifest } from './appManifest.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), tailwindcss(),
    {
      name: 'shotimer-room-manifest',
      configureServer(server) { server.middlewares.use(serveAppManifest) },
      configurePreviewServer(server) { server.middlewares.use(serveAppManifest) },
    },
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        features: resolve(__dirname, 'features.html'),
        login: resolve(__dirname, 'login.html'),
      },
    },
  },
})

