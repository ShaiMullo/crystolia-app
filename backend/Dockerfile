# ===========================================
# Crystolia Backend - Production Dockerfile
# ===========================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

USER expressjs

EXPOSE 4000

ENV PORT=4000

CMD ["node", "dist/index.js"]
