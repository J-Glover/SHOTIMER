# Production Multi-Stage Dockerfile for Shotimer App Studio
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build assets
COPY . .
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

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
COPY --from=builder /app/data ./data

# Expose Broadcast Port
EXPOSE 3000

CMD ["node", "server.js"]
