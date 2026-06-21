# =============================================================================
# VANTA OS — Multi-stage Dockerfile (Section 69)
# Stages: builder -> production
# =============================================================================

# --- Stage 1: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl python3 make g++

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm run build:worker

# Prune devDependencies for production image
RUN npm prune --omit=dev

# --- Stage 2: Production ---
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV APP_ENV=production

RUN apk add --no-cache libc6-compat openssl tini

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/shopify.app.toml ./
COPY --from=builder /app/CHANGELOG.md ./
COPY --from=builder /app/.env.example ./

EXPOSE 3000

# tini handles SIGTERM/SIGINT properly so worker graceful shutdown works (Section 83)
ENTRYPOINT ["/sbin/tini", "--"]

# Default command — override in docker-compose for the worker
CMD ["npm", "run", "start"]
