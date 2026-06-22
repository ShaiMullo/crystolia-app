# ===========================================
# Crystolia Frontend - Production Dockerfile
# ===========================================
# Multi-stage build for optimized production image
# 
# Stage 1 (deps): Install dependencies
# Stage 2 (builder): Build the Next.js application
# Stage 3 (runner): Production-ready minimal image

# -----------------------------------------
# Stage 1: Install dependencies
# -----------------------------------------
FROM node:20-alpine AS deps

# Install libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# -----------------------------------------
# Stage 2: Build the application
# -----------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variable for production build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Next bakes the next.config rewrite destination at build time; provide the
# backend URL so /api/* proxies to the compose service (not localhost).
ARG BACKEND_URL=http://backend:4000
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build

# -----------------------------------------
# Stage 3: Production runner
# -----------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set to production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Pre-create the Next.js runtime cache directory and fix ownership.
# The standalone build does not include .next/cache; Next.js creates it at
# runtime (ISR, fetch cache). Without this, the non-root process cannot
# mkdir inside a root-owned /app.
RUN mkdir -p .next/cache && \
    chown -R nextjs:nodejs /app

USER nextjs

# Expose port 3000
EXPOSE 3000

# Set the port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
# Copy entrypoint script
# Start the application
CMD ["node", "server.js"]
