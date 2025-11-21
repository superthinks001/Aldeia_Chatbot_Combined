# ============================================
# Aldeia Chatbot Frontend - Production Dockerfile
# Multi-stage build for optimized production image
# Works with npm workspaces monorepo structure
# ============================================

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /workspace

# Copy workspace root package files
COPY package*.json ./
COPY apps/chatbot-frontend/package*.json ./apps/chatbot-frontend/

# Install all workspace dependencies
RUN npm ci

# Copy all workspace source code
COPY . .

# Build frontend application
WORKDIR /workspace/apps/chatbot-frontend
RUN npm run build

# ============================================
# Stage 2: Production with Nginx
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY apps/chatbot-frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /workspace/apps/chatbot-frontend/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx && adduser -S nginx -u 1001 -G nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
