# ============================================
# Aldeia Chatbot Backend - Production Dockerfile
# Multi-stage build for optimized production image
# Works with npm workspaces monorepo structure
# ============================================

# Stage 1: Build
FROM node:20-slim AS builder

# Install build dependencies for native modules (sharp, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy workspace package files first (for better layer caching)
COPY package*.json ./

# Copy all workspace package.json files to satisfy npm workspaces
COPY apps/backend/package*.json ./apps/backend/
COPY apps/chatbot-frontend/package*.json ./apps/chatbot-frontend/
COPY packages/ ./packages/

# Install all workspace dependencies and rebuild native modules
RUN npm ci

# Copy all source code
COPY . .

# Build only the backend
RUN npm run build -w apps/backend

# ============================================
# Stage 2: Production
FROM node:20-slim AS production

# Install dumb-init, curl, build tools, and runtime dependencies for sharp/native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    curl \
    libvips42 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

WORKDIR /workspace

# Copy workspace package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/chatbot-frontend/package*.json ./apps/chatbot-frontend/
COPY packages/ ./packages/

# Install production dependencies (without --ignore-scripts to build native modules)
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /workspace/apps/backend/dist ./apps/backend/dist

# Create logs directory and make transformers cache writable
RUN mkdir -p /workspace/apps/backend/logs && chown -R nodejs:nodejs /workspace/apps/backend/logs

# Create cache directory inside node_modules for @xenova/transformers
RUN mkdir -p /workspace/node_modules/@xenova/transformers/.cache && \
    chown -R nodejs:nodejs /workspace/node_modules/@xenova/transformers/.cache

# Also set environment variables as fallback
ENV TRANSFORMERS_CACHE=/workspace/node_modules/@xenova/transformers/.cache
ENV HF_HOME=/workspace/node_modules/@xenova/transformers/.cache
ENV XDG_CACHE_HOME=/workspace/node_modules/@xenova/transformers/.cache

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
