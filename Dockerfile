# =============================================================================
# VANTA OS — Dockerfile for Render
# Render uses this when Docker mode is selected.
# =============================================================================

FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl python3 make g++

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

RUN npm prune --omit=dev

# --- Production ---
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV APP_ENV=production
ENV PORT=10000

RUN apk add --no-cache libc6-compat openssl tini

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/shopify.app.toml ./
COPY --from=builder /app/CHANGELOG.md ./

EXPOSE 10000

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["npm", "run", "start"]
