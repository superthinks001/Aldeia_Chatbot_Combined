#!/bin/bash

# ============================================
# REDIS STANDALONE DEPLOYMENT SCRIPT
# ============================================
# This script deploys Redis as a standalone Docker container
# Run this once on your server to set up Redis
# ============================================

set -e

# Configuration
CONTAINER_NAME="aldeia-redis"
IMAGE="redis:7-alpine"
PORT="${REDIS_PORT:-6379}"
DATA_VOLUME="aldeia-redis-data"
NETWORK="aldeia-network"
MAX_MEMORY="${REDIS_MAX_MEMORY:-256mb}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
}

check_password() {
    if [ -z "$REDIS_PASSWORD" ]; then
        log_error "REDIS_PASSWORD environment variable is not set."
        log_info "Please set it: export REDIS_PASSWORD='your-secure-password'"
        exit 1
    fi
}

create_network() {
    if ! docker network inspect "$NETWORK" &> /dev/null; then
        log_info "Creating Docker network: $NETWORK"
        docker network create "$NETWORK"
    else
        log_info "Network $NETWORK already exists"
    fi
}

start() {
    check_docker
    check_password
    create_network

    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            log_warn "Redis container is already running"
            status
            return 0
        else
            log_info "Starting existing Redis container..."
            docker start "$CONTAINER_NAME"
            wait_for_healthy
            return 0
        fi
    fi

    log_info "Pulling latest Redis image..."
    docker pull "$IMAGE"

    log_info "Starting Redis container..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        --network "$NETWORK" \
        -p "${PORT}:6379" \
        -v "${DATA_VOLUME}:/data" \
        --memory="512m" \
        --cpus="0.5" \
        "$IMAGE" \
        redis-server \
        --requirepass "${REDIS_PASSWORD}" \
        --maxmemory "${MAX_MEMORY}" \
        --maxmemory-policy allkeys-lru \
        --appendonly yes \
        --save 900 1 \
        --save 300 10 \
        --save 60 10000

    wait_for_healthy
    log_info "Redis started successfully!"
}

stop() {
    check_docker

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Stopping Redis container..."
        docker stop "$CONTAINER_NAME"
        log_info "Redis stopped"
    else
        log_warn "Redis container is not running"
    fi
}

restart() {
    stop
    sleep 2
    start
}

remove() {
    check_docker

    stop 2>/dev/null || true

    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Removing Redis container..."
        docker rm "$CONTAINER_NAME"
        log_info "Redis container removed"
    else
        log_warn "Redis container does not exist"
    fi
}

status() {
    check_docker

    echo ""
    echo "============================================"
    echo "Redis Status"
    echo "============================================"

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "Container: ${GREEN}Running${NC}"

        # Get container details
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Status}}\t{{.Ports}}"

        # Health check
        echo ""
        echo "Health Check:"
        if [ -n "$REDIS_PASSWORD" ]; then
            if docker exec "$CONTAINER_NAME" redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
                echo -e "  Redis Status: ${GREEN}Healthy${NC}"

                # Get memory info
                echo ""
                echo "Memory Usage:"
                docker exec "$CONTAINER_NAME" redis-cli -a "$REDIS_PASSWORD" INFO memory 2>/dev/null | grep -E "used_memory_human|maxmemory_human" | sed 's/^/  /'
            else
                echo -e "  Redis Status: ${RED}Unhealthy${NC}"
            fi
        else
            echo -e "  Redis Status: ${YELLOW}Cannot check (no password set)${NC}"
        fi

        # Volume info
        echo ""
        echo "Data Volume: $DATA_VOLUME"

    elif docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "Container: ${YELLOW}Stopped${NC}"
    else
        echo -e "Container: ${RED}Not Found${NC}"
    fi
    echo "============================================"
    echo ""
}

logs() {
    check_docker

    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker logs "$CONTAINER_NAME" "${@:2}"
    else
        log_error "Redis container does not exist"
        exit 1
    fi
}

wait_for_healthy() {
    log_info "Waiting for Redis to be healthy..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker exec "$CONTAINER_NAME" redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
            log_info "Redis is healthy!"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 1
    done

    echo ""
    log_error "Redis failed to become healthy after ${max_attempts} attempts"
    logs --tail=50
    exit 1
}

update() {
    check_docker

    log_info "Updating Redis to latest version..."
    docker pull "$IMAGE"

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Restarting Redis with new image..."
        remove
        start
    else
        log_info "New image pulled. Run 'start' to use it."
    fi
}

backup() {
    check_docker

    local backup_dir="${1:-./backups}"
    local backup_file="${backup_dir}/redis-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

    mkdir -p "$backup_dir"

    # Trigger a background save first
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Triggering Redis background save..."
        docker exec "$CONTAINER_NAME" redis-cli -a "$REDIS_PASSWORD" BGSAVE 2>/dev/null || true
        sleep 2
    fi

    log_info "Creating backup of Redis data..."
    docker run --rm \
        -v "${DATA_VOLUME}:/data:ro" \
        -v "$(pwd)/${backup_dir}:/backup" \
        alpine tar czf "/backup/$(basename $backup_file)" -C /data .

    log_info "Backup created: $backup_file"
}

cli() {
    check_docker
    check_password

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Connecting to Redis CLI..."
        docker exec -it "$CONTAINER_NAME" redis-cli -a "$REDIS_PASSWORD"
    else
        log_error "Redis container is not running"
        exit 1
    fi
}

show_help() {
    echo ""
    echo "Redis Deployment Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start    - Start Redis container"
    echo "  stop     - Stop Redis container"
    echo "  restart  - Restart Redis container"
    echo "  remove   - Remove Redis container (data preserved)"
    echo "  status   - Show Redis status and memory info"
    echo "  logs     - Show Redis logs (pass additional args like -f, --tail=100)"
    echo "  update   - Pull latest image and restart"
    echo "  backup   - Backup Redis data (optional: backup directory)"
    echo "  cli      - Connect to Redis CLI"
    echo "  help     - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  REDIS_PASSWORD    - Required. Password for Redis authentication"
    echo "  REDIS_PORT        - Optional. Port to expose (default: 6379)"
    echo "  REDIS_MAX_MEMORY  - Optional. Max memory limit (default: 256mb)"
    echo ""
    echo "Examples:"
    echo "  export REDIS_PASSWORD='my-secure-password'"
    echo "  $0 start"
    echo "  $0 logs -f --tail=100"
    echo "  $0 backup ./my-backups"
    echo "  $0 cli"
    echo ""
}

# Main
case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    remove)
        remove
        ;;
    status)
        status
        ;;
    logs)
        logs "$@"
        ;;
    update)
        update
        ;;
    backup)
        backup "$2"
        ;;
    cli)
        cli
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: ${1:-}"
        show_help
        exit 1
        ;;
esac
