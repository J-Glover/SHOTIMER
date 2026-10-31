# Production Multi-Stage Dockerfile for Shotimer App Studio
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_AUTH_REDIRECT_URL=https://shotimer.io
ARG VITE_STEALTH_PASSKEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_AUTH_REDIRECT_URL=$VITE_AUTH_REDIRECT_URL
ENV VITE_STEALTH_PASSKEY=$VITE_STEALTH_PASSKEY

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build assets
COPY . .
# The checked-in static publishing directory is not the container's output.
# Avoid npm's postbuild copier; the Node server serves the fresh dist build.
RUN npm run build:container

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV SHOTIMER_LIVE_DATA_DIR=/var/lib/shotimer/live-rooms

# Copy node_modules and built dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/website ./website
COPY --from=builder /app/website_coming_soon ./website_coming_soon
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/appManifest.mjs ./appManifest.mjs
COPY --from=builder /app/liveRelay.mjs ./liveRelay.mjs

RUN mkdir -p /var/lib/shotimer/live-rooms

VOLUME ["/var/lib/shotimer/live-rooms"]

# Expose Broadcast Port
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
