# ============================================
# Aldeia Chatbot Backend - Production Dockerfile
# Multi-stage build for optimized production image
# Works with npm workspaces monorepo structure
# ============================================

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /workspace

# Copy workspace root package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install all workspace dependencies
RUN npm ci

# Copy all workspace source code
COPY . .

# Build backend TypeScript
WORKDIR /workspace/apps/backend
RUN npm run build

# ============================================
# Stage 2: Production
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /workspace

# Copy workspace root package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies for the entire workspace
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /workspace/apps/backend/dist ./apps/backend/dist

# Create logs directory
RUN mkdir -p /workspace/apps/backend/logs && chown -R nodejs:nodejs /workspace/apps/backend/logs

# Switch to non-root user
USER nodejs

WORKDIR /workspace/apps/backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
