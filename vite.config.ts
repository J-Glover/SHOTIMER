import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { serveAppManifest } from './appManifest.mjs'
import { createLiveRelay } from './liveRelay.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), tailwindcss(),
    {
      name: 'shotimer-room-manifest',
      configureServer(server) {
        const relay = createLiveRelay();
        server.middlewares.use(relay.middleware);
        server.middlewares.use(serveAppManifest);
        server.middlewares.use((req, _res, next) => {
          if (!req.url) return next();
          try {
            const parsed = new URL(req.url, 'http://localhost');
            const p = parsed.pathname;
            if (p === '/dashboard' || p === '/dashboard/' || p.startsWith('/r/') || p.startsWith('/room/')) {
              req.url = '/app/index.html' + parsed.search + parsed.hash;
            } else if ((p === '/' || p === '/index.html') && (parsed.searchParams.has('room') || parsed.searchParams.has('view') || parsed.searchParams.has('auth'))) {
              req.url = '/app/index.html' + parsed.search + parsed.hash;
            }
          } catch {}
          next();
        });
        server.httpServer?.once('close', () => relay.close());
      },
      configurePreviewServer(server) {
        const relay = createLiveRelay();
        server.middlewares.use(relay.middleware);
        server.middlewares.use(serveAppManifest);
        server.middlewares.use((req, _res, next) => {
          if (!req.url) return next();
          try {
            const parsed = new URL(req.url, 'http://localhost');
            const p = parsed.pathname;
            if (p === '/dashboard' || p === '/dashboard/' || p.startsWith('/r/') || p.startsWith('/room/')) {
              req.url = '/app/index.html' + parsed.search + parsed.hash;
            } else if ((p === '/' || p === '/index.html') && (parsed.searchParams.has('room') || parsed.searchParams.has('view') || parsed.searchParams.has('auth'))) {
              req.url = '/app/index.html' + parsed.search + parsed.hash;
            }
          } catch {}
          next();
        });
        server.httpServer?.once('close', () => relay.close());
      },
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
        dashboard: resolve(__dirname, 'dashboard/index.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        features: resolve(__dirname, 'features.html'),
        login: resolve(__dirname, 'login.html'),
      },
    },
  },
})

