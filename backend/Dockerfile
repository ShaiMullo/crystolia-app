# ===========================================
# Crystolia Backend - Production Dockerfile
# ===========================================
# Multi-stage build → small, non-root, production-only runtime image.

# -----------------------------------------
# Stage 1: Build (TypeScript → dist/)
# -----------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Deterministic install — copy lockfile first for layer caching.
COPY package.json package-lock.json* ./
RUN npm ci

# Compile TypeScript.
COPY . .
RUN npm run build

# -----------------------------------------
# Stage 2: Production runtime
# -----------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# wget is used by the container HEALTHCHECK below.
RUN apk add --no-cache wget

# Non-root user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 expressjs

# Production-only dependencies (no dev/build tooling in the final image).
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Built output only.
COPY --from=builder /app/dist ./dist

USER expressjs

EXPOSE 4000

# Liveness from the container side — mirrors the K8s liveness probe so the
# image is also healthy under plain Docker / compose.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4000/api/live || exit 1

CMD ["node", "dist/index.js"]
