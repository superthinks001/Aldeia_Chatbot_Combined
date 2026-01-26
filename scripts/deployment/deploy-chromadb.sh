#!/bin/bash

# ============================================
# CHROMADB STANDALONE DEPLOYMENT SCRIPT
# ============================================
# This script deploys ChromaDB as a standalone Docker container
# Run this once on your server to set up ChromaDB
# ============================================

set -e

# Configuration
CONTAINER_NAME="aldeia-chromadb"
IMAGE="chromadb/chroma:latest"
PORT="${CHROMA_PORT:-8000}"
DATA_VOLUME="aldeia-chromadb-data"
NETWORK="aldeia-network"

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

check_auth_token() {
    if [ -z "$CHROMA_AUTH_TOKEN" ]; then
        log_error "CHROMA_AUTH_TOKEN environment variable is not set."
        log_info "Please set it: export CHROMA_AUTH_TOKEN='your-secure-token'"
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
    check_auth_token
    create_network

    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            log_warn "ChromaDB container is already running"
            status
            return 0
        else
            log_info "Starting existing ChromaDB container..."
            docker start "$CONTAINER_NAME"
            wait_for_healthy
            return 0
        fi
    fi

    log_info "Pulling latest ChromaDB image..."
    docker pull "$IMAGE"

    log_info "Starting ChromaDB container..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        --network "$NETWORK" \
        -p "${PORT}:8000" \
        -e CHROMA_SERVER_AUTH_CREDENTIALS="${CHROMA_AUTH_TOKEN}" \
        -e CHROMA_SERVER_AUTH_PROVIDER="chromadb.auth.token.TokenAuthServerProvider" \
        -e IS_PERSISTENT="TRUE" \
        -e ANONYMIZED_TELEMETRY="FALSE" \
        -v "${DATA_VOLUME}:/chroma/chroma" \
        --memory="4g" \
        --cpus="2" \
        "$IMAGE"

    wait_for_healthy
    log_info "ChromaDB started successfully!"
}

stop() {
    check_docker

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Stopping ChromaDB container..."
        docker stop "$CONTAINER_NAME"
        log_info "ChromaDB stopped"
    else
        log_warn "ChromaDB container is not running"
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
        log_info "Removing ChromaDB container..."
        docker rm "$CONTAINER_NAME"
        log_info "ChromaDB container removed"
    else
        log_warn "ChromaDB container does not exist"
    fi
}

status() {
    check_docker

    echo ""
    echo "============================================"
    echo "ChromaDB Status"
    echo "============================================"

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "Container: ${GREEN}Running${NC}"

        # Get container details
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Status}}\t{{.Ports}}"

        # Health check
        echo ""
        echo "Health Check:"
        if curl -s -f "http://localhost:${PORT}/api/v2/heartbeat" > /dev/null 2>&1; then
            echo -e "  API Status: ${GREEN}Healthy${NC}"
        else
            echo -e "  API Status: ${RED}Unhealthy${NC}"
        fi

        # Volume info
        echo ""
        echo "Data Volume:"
        docker volume inspect "$DATA_VOLUME" --format "  Size: {{.Mountpoint}}" 2>/dev/null || echo "  Volume: $DATA_VOLUME"

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
        log_error "ChromaDB container does not exist"
        exit 1
    fi
}

wait_for_healthy() {
    log_info "Waiting for ChromaDB to be healthy..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "http://localhost:${PORT}/api/v2/heartbeat" > /dev/null 2>&1; then
            log_info "ChromaDB is healthy!"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    echo ""
    log_error "ChromaDB failed to become healthy after ${max_attempts} attempts"
    logs --tail=50
    exit 1
}

update() {
    check_docker

    log_info "Updating ChromaDB to latest version..."
    docker pull "$IMAGE"

    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Restarting ChromaDB with new image..."
        remove
        start
    else
        log_info "New image pulled. Run 'start' to use it."
    fi
}

backup() {
    check_docker

    local backup_dir="${1:-./backups}"
    local backup_file="${backup_dir}/chromadb-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

    mkdir -p "$backup_dir"

    log_info "Creating backup of ChromaDB data..."
    docker run --rm \
        -v "${DATA_VOLUME}:/data:ro" \
        -v "$(pwd)/${backup_dir}:/backup" \
        alpine tar czf "/backup/$(basename $backup_file)" -C /data .

    log_info "Backup created: $backup_file"
}

show_help() {
    echo ""
    echo "ChromaDB Deployment Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start    - Start ChromaDB container"
    echo "  stop     - Stop ChromaDB container"
    echo "  restart  - Restart ChromaDB container"
    echo "  remove   - Remove ChromaDB container (data preserved)"
    echo "  status   - Show ChromaDB status"
    echo "  logs     - Show ChromaDB logs (pass additional args like -f, --tail=100)"
    echo "  update   - Pull latest image and restart"
    echo "  backup   - Backup ChromaDB data (optional: backup directory)"
    echo "  help     - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  CHROMA_AUTH_TOKEN  - Required. Authentication token for ChromaDB"
    echo "  CHROMA_PORT        - Optional. Port to expose (default: 8000)"
    echo ""
    echo "Examples:"
    echo "  export CHROMA_AUTH_TOKEN='my-secure-token'"
    echo "  $0 start"
    echo "  $0 logs -f --tail=100"
    echo "  $0 backup ./my-backups"
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
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: ${1:-}"
        show_help
        exit 1
        ;;
esac
