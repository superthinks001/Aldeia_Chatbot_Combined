# Aldeia Chatbot Project Guidelines

## Project Overview
Full-stack fire recovery assistance chatbot with RAG capabilities, deployed to AWS.

**Stack**: TypeScript, Node.js, React, PostgreSQL (Supabase), ChromaDB, Redis

**Monorepo Structure**:
- `apps/backend` - Express.js API server
- `apps/chatbot-frontend` - React frontend
- Workspaces managed via npm

## Code Standards

### TypeScript
- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` if type is truly unknown

### Code Style
- Use async/await instead of promise chains
- Prefer functional patterns over imperative when appropriate
- Keep functions focused and single-purpose
- Extract magic numbers/strings into named constants

### Error Handling
- Always handle errors explicitly
- Don't swallow errors silently
- Log errors with context using the logger utility
- Return meaningful error messages to users

### Comments & Documentation
- Add JSDoc comments for public APIs and complex functions
- Explain "why" not "what" in comments
- Keep comments up-to-date when code changes
- Document any non-obvious behavior or workarounds

## Architecture Patterns

### Backend
- Use service layer pattern for business logic
- Keep route handlers thin - delegate to services
- Use middleware for cross-cutting concerns (auth, logging, CORS)
- Validate input at API boundaries

### Frontend
- Use React hooks (functional components)
- Keep components small and focused
- Use context for global state (AuthContext)
- Co-locate related files (component + styles)

### Database
- Use Supabase client for all database operations
- Never expose service role key to frontend
- Use Row Level Security (RLS) policies
- Write migrations for schema changes

## Deployment & Infrastructure

### Docker
- Use multi-stage builds for smaller images
- Run containers as non-root user
- Include health checks in all services
- Tag images appropriately (`:latest` for prod, `:staging` for staging)
- **CRITICAL**: Always use explicit file names in `COPY` instructions (e.g., `COPY package.json package-lock.json ./`), never globs like `package*.json`. BuildKit GHA cache does not reliably invalidate glob-based layers when new files are added to the match set.
- Backend uses `node:20-slim` (Debian-based, needed for native modules like `sharp`)
- Frontend uses `node:20-alpine` (lightweight, no native module builds needed)
- A `.dockerignore` file must exist at the repo root to exclude `node_modules`, `.git`, docs, infra, etc.

### Environment Management
- Never commit secrets to git
- Use GitHub Secrets for sensitive values
- Document all required environment variables
- Validate required env vars at startup

### Deployment Process
1. Redis and ChromaDB are deployed separately via standalone scripts
2. GitHub Actions builds and deploys backend/frontend
3. Infrastructure (Redis, ChromaDB, Supabase) must be healthy before app deployment
4. Always run migrations before starting new containers

## Git & Version Control

### Commit Messages
- Only commit when explicitly asked
- Use conventional commits format: `type(scope): description`
- Write clear, descriptive commit messages
- Types: feat, fix, docs, refactor, test, chore
- Keep commits atomic and focused
- Include ticket/issue numbers when applicable
- Include Claude Code attribution footer
- Never skip pre-commit hooks

### Branches
- `main` - production deployments
- `development` - staging deployments
- Check and clearly state which branch we are working on before starting to work
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

### Pull Requests
- Ensure CI passes before merging
- Get code review when possible
- Update documentation if needed
- Delete branch after merge

## Testing

### Backend Tests
- Write unit tests for services and utilities
- Test error cases, not just happy paths
- Mock external dependencies (Supabase, ChromaDB)
- Run tests before committing: `npm test`

### Frontend Tests
- Test user interactions and component behavior
- Mock API calls in tests
- Test accessibility where applicable

## Security Practices

### General
- Validate and sanitize all user input
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on public endpoints
- Keep dependencies updated (run `npm audit` regularly)

### Authentication
- Use JWT with refresh tokens
- Store tokens securely (httpOnly cookies preferred)
- Implement proper CORS configuration
- Never log sensitive data (passwords, tokens)

### API Security
- Require authentication for protected endpoints
- Implement role-based access control (RBAC)
- Validate authorization on every request
- Use HTTPS in production

## Common Tasks

### Ingesting Documents to ChromaDB
```bash
cd apps/backend
npm run ingest:docs
```

### Deployment
- Push to `development` branch → deploys to staging
- Push to `main` branch → deploys to production
- GitHub Actions handles build and deployment automatically

## AI/ML Specific

### ChromaDB
- Use v2 API endpoints (`/api/v2/...`)
- Always include authentication token
- Health check: `http://localhost:8000/api/v2/heartbeat`

### Intent Classification
- Keep confidence threshold around 0.35 for good UX
- Add domain-specific keywords to improve accuracy
- Weight pattern matching higher than keyword matching
- Test with real user questions

### RAG Pipeline
- Chunk documents by paragraph for better retrieval
- Use top 3 matches for context
- Filter results by distance threshold (> 2.0 is too dissimilar)
- Always cite sources in responses

## Pre-Merge Build Verification Checklist

**IMPORTANT**: Before merging any branch into `development` or `main`, run through this checklist to prevent deployment failures.

### 1. Docker Build Checks
- [ ] `package-lock.json` exists at root and is committed (required by `npm ci`)
- [ ] Both Dockerfiles use explicit `COPY package.json package-lock.json ./` (never `package*.json`)
- [ ] `.dockerignore` exists at repo root and excludes `node_modules`, `.git`, etc.
- [ ] Backend Dockerfile base image is `node:20-slim` (needed for native modules)
- [ ] Frontend Dockerfile base image is `node:20-alpine`
- [ ] Both Dockerfiles have a `production` target stage (CI/CD references `target: production`)
- [ ] Run `docker build --target production -f apps/backend/Dockerfile .` locally to verify
- [ ] Run `docker build --target production -f apps/chatbot-frontend/Dockerfile .` locally to verify

### 2. Workspace Integrity
- [ ] Root `package.json` workspaces field includes `apps/*` and `packages/*`
- [ ] `package-lock.json` is in sync with `package.json` (run `npm install` if needed)
- [ ] All workspace packages (`packages/shared-types`, `packages/ui-components`, `packages/utils`) exist
- [ ] `npm ci` succeeds from the repo root

### 3. Build Verification
- [ ] `npm run build` succeeds in `apps/backend`
- [ ] `npm run build` succeeds in `apps/chatbot-frontend`

### 4. CI/CD Workflow Checks
- [ ] `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` reference correct paths
- [ ] `scripts/testing/test-phase6-simple.sh` exists if referenced by CI
- [ ] Node version in CI (`NODE_VERSION` env) matches Dockerfile base images (currently Node 20)

### 5. Files That Must Be Committed
- `package.json` (root)
- `package-lock.json` (root)
- `.dockerignore` (root)
- `apps/backend/Dockerfile`
- `apps/chatbot-frontend/Dockerfile`
- `apps/chatbot-frontend/nginx.conf`

## Known Issues & Lessons Learned

### Docker Build Cache (GHA) - March 2026
**Problem**: `COPY package*.json ./` with Docker BuildKit GHA cache (`cache-from: type=gha`) fails to invalidate stale layers when new files are added that match the glob. This caused `npm ci` to fail because `package-lock.json` was not being copied into the container despite existing in the repo.

**Root Cause**: BuildKit GHA cache keys for COPY glob layers are computed from the hash of previously matched files. When `package-lock.json` was added/changed, the cache key still matched the old layer (which only contained `package.json`), so the stale layer was reused.

**Fix**: Always use explicit file names: `COPY package.json package-lock.json ./`

**Prevention**: Never use glob patterns (`*`) in Dockerfile COPY instructions for critical files.

### Node Version Alignment
**Problem**: CI workflow, local Dockerfiles, and deployed Dockerfiles had different Node versions (18 vs 20), causing inconsistent behavior.

**Fix**: Standardized on Node 20 across all Dockerfiles and CI.

**Prevention**: When changing Node version, update ALL of: Dockerfiles, CI workflow `NODE_VERSION`, and local dev setup.

### Missing .dockerignore
**Problem**: Without a `.dockerignore`, Docker build context was 107MB (included `.git`, `node_modules` from local dev, docs, infra files), slowing down builds.

**Fix**: Added `.dockerignore` excluding non-essential files.

### Build Context Size
The Docker build context should be under 20MB with a proper `.dockerignore`. If it grows significantly, check for:
- Accidentally committed `node_modules`
- Large binary files
- Build artifacts (`dist/`) committed to git

## Behavior Preferences for Claude

### Communication Style
- Be concise but complete
- Explain reasoning for architectural decisions
- Flag potential issues proactively (security, performance, bugs)
- Ask clarifying questions when requirements are ambiguous

### Code Changes
- Read existing code before modifying
- Maintain consistency with existing patterns
- Don't over-engineer - keep solutions simple
- Only add features that were requested

### Problem Solving
- Understand the root cause before fixing
- Consider edge cases and error scenarios
- Think about scalability and maintainability
- Suggest alternatives when appropriate

### Before Merging to Development
- Always check the Pre-Merge Build Verification Checklist above
- Review recent CI/CD runs on GitHub Actions for failures
- Verify Docker builds pass locally before pushing
- Ensure `package-lock.json` is up to date and committed

---

*Last Updated: 2026-03-23*
