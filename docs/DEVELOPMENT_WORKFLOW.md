# Development Workflow Guide

This guide outlines the recommended Git workflow for the Aldeia Chatbot project to ensure smooth collaboration and maintain code quality.

## Summary

1. **Always** work in feature branches, never directly in `develop`
2. **Pull** latest changes before starting new work
3. **Commit** frequently with clear messages
4. **Push** regularly to backup your work
5. **Create PR** when feature is complete
6. **Get review** before merging
7. **Clean up** branches after merging

Following this workflow will keep the codebase clean, organized, and make collaboration smooth!

## Branch Strategy

### Main Branches
- **`main`** - Production-ready code. Always stable and deployable.
- **`develop`** (optional) - Integration branch for features. Use if you want an extra safety layer before production.

### Feature Branches
Create a new branch for each feature, bug fix, or task:

```bash
# Naming convention: type/short-description
git checkout -b feature/add-voice-input
git checkout -b fix/message-timestamp-error
git checkout -b refactor/cleanup-nlp-service
```

**Branch naming prefixes:**
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks (dependencies, config, etc.)

## Daily Workflow

### 1. Start Working on a Task

```bash
# Make sure you're on development and up to date
git checkout development
git pull origin development

# Create and switch to your feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes and Commit Regularly

```bash
# Check what files changed
git status

# Stage your changes
git add <files>
# Or stage all changes
git add .

# Commit with a clear message
git commit -m "Add user authentication to chat widget"
```

**Commit Message Best Practices:**
- Use present tense ("Add feature" not "Added feature")
- Start with a verb (Add, Fix, Update, Remove, Refactor)
- Keep first line under 50 characters
- Add detailed description if needed (after blank line)

**Example:**
```bash
git commit -m "Fix timestamp property error in Message interface

- Added timestamp?: Date | string to Message type
- Updated ChatWidget to use timestamp property
- Resolves TypeScript compilation errors
"
```

### 3. Push Your Branch to GitHub

```bash
# First time pushing a new branch
git push -u origin feature/your-feature-name

# Subsequent pushes
git push
```

### 4. Keep Your Branch Updated

If working on a long-running feature, periodically sync with dev:

```bash
# Option 1: Rebase (cleaner history)
git checkout development
git pull origin development
git checkout feature/your-feature-name
git rebase development

# Option 2: Merge (preserves history)
git checkout feature/your-feature-name
git merge development
```

### 5. Create a Pull Request (PR)

Once your feature is complete:

1. Push your final changes
2. Go to GitHub repository
3. Click "Pull requests" → "New pull request"
4. Select your branch to merge into `development`
5. Add a descriptive title and description
6. Request review from your colleague
7. Link any related issues

**PR Description Template:**
```markdown
## What does this PR do?
Brief description of the changes

## How to test
1. Step-by-step testing instructions
2. Any specific scenarios to verify

## Checklist
- [ ] Code compiles without errors
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)
- [ ] No sensitive data (API keys, passwords) committed
```

### 6. Code Review

**As the Author:**
- Respond to review comments
- Make requested changes in new commits
- Push updates (they automatically appear in the PR)

**As the Reviewer:**
- Check code quality and logic
- Test the changes locally if needed
- Approve or request changes

### 7. Merge the Pull Request

Once approved:
1. Use "Squash and merge" (recommended) - combines all commits into one
2. Or "Merge pull request" - keeps commit history
3. Delete the feature branch after merging (GitHub offers this option)

### 8. Clean Up Local Branches

```bash
# Switch back to development
git checkout development

# Pull the merged changes
git pull origin development

# Delete your local feature branch
git branch -d feature/your-feature-name

# If branch wasn't merged, force delete
git branch -D feature/your-feature-name
```

## Working Together - Avoiding Conflicts

### Before Starting Work
```bash
# Always pull latest changes first
git checkout development
git pull origin development
```

### Communicate
- Let your colleague know what you're working on
- Avoid working on the same files simultaneously if possible
- Use GitHub Issues or project management tools to coordinate

### Handling Merge Conflicts

If you encounter conflicts during merge/rebase:

```bash
# Git will mark conflicting files
# Open each file and look for conflict markers:
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> branch-name

# Resolve by choosing the correct version or combining both
# Remove the conflict markers

# Stage the resolved files
git add <resolved-files>

# Continue the merge/rebase
git commit  # for merge
git rebase --continue  # for rebase
```

## Environment & Secrets Management

### Never Commit:
- `.env` files (already in .gitignore)
- API keys, passwords, tokens
- Database credentials
- Any sensitive configuration

### If You Accidentally Commit Secrets:
1. Immediately rotate/revoke the exposed credentials
2. Remove them from Git history (use `git-filter-repo` or contact admin)
3. Push the corrected version

## Quick Reference Commands

```bash
# Check current branch and status
git status
git branch

# View commit history
git log --oneline -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all uncommitted changes
git restore .

# View changes before committing
git diff

# View changes in staged files
git diff --staged

# Switch branches
git checkout <branch-name>

# List all branches (local and remote)
git branch -a
```

## Running the Application Locally

Redis, ChromaDB and Supabase should all be running in the development server (18.217.67.150)

### Run the following to start the SSH tunnel (in a separate terminal, keep it open):

```bash
# ~/.ssh/aldeia-staging.pem is the suggested location for your SSH key

ssh -i ~/.ssh/aldeia-staging.pem -L 6379:localhost:6379 -L 8000:localhost:8000 ubuntu@18.217.67.150
```

### Backend (Port 3001)
```bash
cd apps/backend
npm install  # First time only
npm run dev
```

### Frontend (Port 3000)
```bash
cd apps/chatbot-frontend
npm install  # First time only
npm start
```

### Before Committing
1. Ensure both backend and frontend compile without errors
2. Test your changes work as expected
3. Check no console errors appear

## Getting Help

- **Git issues**: Ask your colleague or check [Git documentation](https://git-scm.com/doc)
- **Merge conflicts**: Pair program to resolve together
- **Code questions**: Use PR comments for discussions
