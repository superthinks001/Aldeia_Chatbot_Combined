# 🚀 Aldeia Chatbot - Local Development Setup

Complete guide to set up your local development environment with all dependencies.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (for Windows): https://www.docker.com/products/docker-desktop
- **Node.js** (v18 or higher): https://nodejs.org/
- **Git**: https://git-scm.com/
- **Git Bash** (comes with Git for Windows)

## 🏗️ Architecture Overview

Your local setup will run:
- **Backend API** (Node.js/Express) - Native on Windows
- **Frontend** (React) - Native on Windows
- **Redis** - Docker container
- **ChromaDB** - Docker container
- **PostgreSQL** - Supabase (cloud)

## 📦 Step-by-Step Setup

### 1. Install Docker Desktop

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Install and start Docker Desktop
3. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

### 2. Clone and Setup Repository

```bash
# Navigate to your projects folder
cd /c/Shared/Projects/SuperThinks/aldeia-combined

# Install dependencies for all apps
npm install
```

### 3. Start Docker Services (Redis + ChromaDB)

```bash
# Start Redis and ChromaDB in Docker
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

You should see:
```
NAME                      STATUS    PORTS
aldeia-redis-dev         Up        0.0.0.0:6379->6379/tcp
aldeia-chromadb-dev      Up        0.0.0.0:8000->8000/tcp
```

### 4. Verify Docker Services

#### Test Redis:
```bash
# Using docker exec
docker exec -it aldeia-redis-dev redis-cli ping
# Should return: PONG

# Or using redis-cli if installed locally
redis-cli ping
```

#### Test ChromaDB:
```bash
# Using curl
curl http://localhost:8000/api/v2/heartbeat
# Should return: {"nanosecond heartbeat": ...}
```

### 5. Configure Environment Variables

The `.env` file in `apps/backend/.env` is already configured. Verify these settings:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# ChromaDB Configuration
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

### 6. Start Backend Server

```bash
# Navigate to backend
cd apps/backend

# Start development server
npm run dev
```

The backend will start on **http://localhost:3001**

### 7. Start Frontend Server

Open a NEW terminal:

```bash
# Navigate to frontend
cd apps/chatbot-frontend

# Start development server
npm start
```

The frontend will start on **http://localhost:3000**

### 8. Verify Everything Works

Run the automated test suite:

```bash
# Open Git Bash
cd /c/Shared/Projects/SuperThinks/aldeia-combined

# Run tests
bash run-all-tests.sh
```

Expected results:
- ✅ Backend Health
- ✅ Frontend Load
- ✅ Redis Connection
- ✅ ChromaDB Health
- ✅ Authentication Tests
- ✅ Chat Functionality

## 🔧 Common Commands

### Docker Management

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart a specific service
docker-compose -f docker-compose.dev.yml restart redis

# Remove all data (⚠️  CAUTION: Deletes all cached data)
docker-compose -f docker-compose.dev.yml down -v
```

### Development

```bash
# Start backend (from project root)
cd apps/backend && npm run dev

# Start frontend (from project root)
cd apps/chatbot-frontend && npm start

# Run tests
bash run-all-tests.sh

# Check backend health
curl http://localhost:3001/api/health
```

## 📊 Service Ports

| Service    | Port  | URL                          |
|------------|-------|------------------------------|
| Frontend   | 3000  | http://localhost:3000        |
| Backend    | 3001  | http://localhost:3001        |
| Redis      | 6379  | localhost:6379               |
| ChromaDB   | 8000  | http://localhost:8000        |

## 🐛 Troubleshooting

### Docker Issues

**Problem:** Docker services won't start
```bash
# Check Docker Desktop is running
docker ps

# Check for port conflicts
netstat -ano | findstr "6379"
netstat -ano | findstr "8000"

# Restart Docker Desktop
```

**Problem:** "Port already in use"
```bash
# Find process using the port
netstat -ano | findstr "6379"

# Kill the process (replace PID)
taskkill /F /PID <PID>
```

### Redis Connection Issues

**Problem:** Backend can't connect to Redis

1. Check Redis is running:
   ```bash
   docker ps | grep redis
   ```

2. Test Redis connection:
   ```bash
   docker exec -it aldeia-redis-dev redis-cli ping
   ```

3. Check backend .env has correct settings:
   ```
   REDIS_URL=redis://localhost:6379
   ```

### ChromaDB Connection Issues

**Problem:** Chat tests failing

1. Check ChromaDB is running:
   ```bash
   docker ps | grep chromadb
   ```

2. Test ChromaDB endpoint:
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

3. Check logs:
   ```bash
   docker logs aldeia-chromadb-dev
   ```

### Backend Won't Start

1. Check Node.js version:
   ```bash
   node --version  # Should be v18+
   ```

2. Reinstall dependencies:
   ```bash
   cd apps/backend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check Supabase connection:
   ```bash
   # Verify DATABASE_URL in apps/backend/.env
   ```

## 🔄 Development Workflow

### Daily Workflow

1. **Start Docker services** (if not running):
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Start backend**:
   ```bash
   cd apps/backend && npm run dev
   ```

3. **Start frontend** (new terminal):
   ```bash
   cd apps/chatbot-frontend && npm start
   ```

4. **Develop and test** your changes

5. **Run tests before committing**:
   ```bash
   bash run-all-tests.sh
   ```

### When Finished

```bash
# Stop backend/frontend (Ctrl+C in their terminals)

# Optionally stop Docker services to save resources
docker-compose -f docker-compose.dev.yml down
```

## 📝 Notes

- **Redis** stores cached data and sessions - data persists in Docker volumes
- **ChromaDB** stores vector embeddings for RAG functionality
- **Supabase** (PostgreSQL) is your main database - hosted in the cloud
- Backend and Frontend run natively on Windows for faster development
- Docker services will auto-restart if Docker Desktop restarts

## 🆘 Getting Help

If you encounter issues:

1. Check Docker Desktop is running
2. Verify all services with `docker-compose -f docker-compose.dev.yml ps`
3. Check logs with `docker-compose -f docker-compose.dev.yml logs`
4. Run health checks: `bash run-all-tests.sh`

## 🎉 Success!

If all tests pass, you're ready to develop! Visit:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/health
- **ChromaDB**: http://localhost:8000/api/v2/heartbeat

Happy coding! 🚀
