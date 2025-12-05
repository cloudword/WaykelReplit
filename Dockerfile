# Waykel - Production Dockerfile
# Multi-stage build for optimized image size

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application (creates dist/ with server and client assets)
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy shared schema (needed for runtime)
COPY --from=builder /app/shared ./shared

# Copy drizzle config if migrations are needed
COPY --from=builder /app/drizzle.config.ts ./

# Create non-root user for security
RUN addgroup -g 1001 -S waykel && \
    adduser -S waykel -u 1001 -G waykel

# Change ownership
RUN chown -R waykel:waykel /app

# Switch to non-root user
USER waykel

# Expose port
EXPOSE 5000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Environment variables (override at runtime)
ENV NODE_ENV=production
ENV PORT=5000

# Start the application
CMD ["node", "dist/index.cjs"]
