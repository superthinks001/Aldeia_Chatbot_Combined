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

---

*Last Updated: 2025-11-24*
