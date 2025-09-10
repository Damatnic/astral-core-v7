# Astral Core v7 Multi-stage Docker Build
# Optimized for production deployment with security best practices

FROM node:18.17-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create app user for security (non-root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astral -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# ============================================
# Development stage
# ============================================
FROM base AS development

ENV NODE_ENV=development

# Install all dependencies including devDependencies
RUN npm ci --include=dev

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Change ownership to app user
RUN chown -R astral:nodejs /app
USER astral

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start development server with hot reload
CMD ["dumb-init", "npm", "run", "dev"]

# ============================================
# Dependencies stage (for production)
# ============================================
FROM base AS dependencies

ENV NODE_ENV=production

# Install only production dependencies
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Generate Prisma client for production
RUN npx prisma generate

# ============================================
# Build stage
# ============================================
FROM base AS build

ENV NODE_ENV=production

# Install all dependencies for building
RUN npm ci --include=dev --no-audit --no-fund

# Copy application source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build && \
    npm prune --production

# ============================================
# Production stage
# ============================================
FROM node:18.17-alpine AS production

# Install security updates and minimal runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    dumb-init \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astral -u 1001 -G nodejs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production node_modules from dependencies stage
COPY --from=dependencies --chown=astral:nodejs /app/node_modules ./node_modules

# Copy built application from build stage
COPY --from=build --chown=astral:nodejs /app/.next ./.next
COPY --from=build --chown=astral:nodejs /app/public ./public
COPY --from=build --chown=astral:nodejs /app/package*.json ./
COPY --from=build --chown=astral:nodejs /app/prisma ./prisma
COPY --from=build --chown=astral:nodejs /app/next.config.js ./next.config.js

# Copy startup scripts
COPY --chown=astral:nodejs scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Security: Run as non-root user
USER astral

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Labels for metadata
LABEL maintainer="Astral Core Team <dev@astral-core.com>"
LABEL version="7.0.0"
LABEL description="Astral Core v7 - HIPAA-compliant mental health platform"
LABEL org.opencontainers.image.title="Astral Core v7"
LABEL org.opencontainers.image.description="HIPAA-compliant mental health platform"
LABEL org.opencontainers.image.version="7.0.0"
LABEL org.opencontainers.image.vendor="Astral Core"
LABEL org.opencontainers.image.licenses="Proprietary"

# Start application with proper init system
ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]