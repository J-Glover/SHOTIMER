import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app/index.html'),
        pricing: resolve(import.meta.dirname, 'pricing.html'),
        features: resolve(import.meta.dirname, 'features.html'),
        login: resolve(import.meta.dirname, 'login.html'),
      },
    },
  },
})

