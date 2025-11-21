# ============================================
# Aldeia Chatbot Frontend - Production Dockerfile
# Multi-stage build for optimized production image
# Works with npm workspaces monorepo structure
# ============================================

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /workspace

# Copy workspace package files first (for better layer caching)
COPY package*.json ./

# Copy all workspace package.json files to satisfy npm workspaces
COPY apps/backend/package*.json ./apps/backend/
COPY apps/chatbot-frontend/package*.json ./apps/chatbot-frontend/
COPY packages/ ./packages/

# Install all workspace dependencies
RUN npm ci

# Copy all source code
COPY . .

# Build only the frontend
RUN npm run build -w apps/chatbot-frontend

# ============================================
# Stage 2: Production with Nginx
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY apps/chatbot-frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /workspace/apps/chatbot-frontend/dist /usr/share/nginx/html

# Set proper permissions (nginx user already exists in nginx:alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Note: nginx:alpine already runs as root by default for port binding
# We'll keep it as root for simplicity since it's a standard nginx setup

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
