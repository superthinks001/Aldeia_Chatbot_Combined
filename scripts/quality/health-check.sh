#!/bin/bash

# ============================================
# Aldeia Chatbot - Health Check Script
# ============================================
# Quick health verification for all services
# ============================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Checking Service Health...${NC}"
echo ""

# Backend
echo -n "Backend (port 3001): "
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
fi

# Frontend
echo -n "Frontend (port 3000): "
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
elif curl -s http://localhost:3002/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy (port 3002)${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
fi

# Redis
echo -n "Redis (port 6379): "
if docker exec aldeia-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✅ Healthy${NC}"
elif docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✅ Healthy${NC}"
elif redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Not responding (optional)${NC}"
fi

# ChromaDB
echo -n "ChromaDB (port 8000): "
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Not responding (optional)${NC}"
fi

# Nginx (if running)
echo -n "Nginx (port 80/443): "
if curl -s http://localhost:80 > /dev/null 2>&1 || curl -s http://localhost:443 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Not running (optional for dev)${NC}"
fi

echo ""
echo -e "${BLUE}Health check complete!${NC}"
