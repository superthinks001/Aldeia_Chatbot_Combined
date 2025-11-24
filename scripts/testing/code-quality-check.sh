#!/bin/bash

# ============================================
# Aldeia Chatbot - Code Quality Check Script
# ============================================
# This script runs comprehensive code quality checks before commits
# Run this before creating pull requests or production deployments
# ============================================

set -e  # Exit on error (can be disabled with --continue-on-error)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CONTINUE_ON_ERROR=false
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_AUDIT=false
SKIP_LINT=false
VERBOSE=false

# Results tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# ============================================
# Helper Functions
# ============================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_failure() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNINGS++))
}

log_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

run_check() {
    local check_name=$1
    local command=$2

    log_info "Running: $check_name"

    if [ "$VERBOSE" = true ]; then
        if eval "$command"; then
            log_success "$check_name passed"
            return 0
        else
            log_failure "$check_name failed"
            return 1
        fi
    else
        if eval "$command" > /dev/null 2>&1; then
            log_success "$check_name passed"
            return 0
        else
            log_failure "$check_name failed"
            if [ "$CONTINUE_ON_ERROR" = false ]; then
                echo ""
                log_info "Run with --verbose to see detailed error output"
                exit 1
            fi
            return 1
        fi
    fi
}

show_help() {
    cat << EOF
Aldeia Chatbot - Code Quality Check Script

USAGE:
    ./code-quality-check.sh [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -c, --continue-on-error Continue running checks even if some fail
    -v, --verbose           Show detailed output from all checks
    --skip-lint             Skip linting checks
    --skip-tests            Skip test execution
    --skip-build            Skip build checks
    --skip-audit            Skip security audit
    --quick                 Run only essential checks (lint + type check)

EXAMPLES:
    ./code-quality-check.sh
    ./code-quality-check.sh --verbose
    ./code-quality-check.sh --continue-on-error
    ./code-quality-check.sh --quick

EXIT CODES:
    0 - All checks passed
    1 - One or more checks failed
    2 - Script error

CHECKS PERFORMED:
    1. Code Linting (ESLint, Prettier)
    2. Type Checking (TypeScript)
    3. Unit Tests
    4. Integration Tests (if available)
    5. Build Verification
    6. Security Audit (npm audit)
    7. Dependency Check
    8. Code Formatting Verification
    9. Documentation Generation (if configured)

EOF
    exit 0
}

# ============================================
# Parse Command Line Arguments
# ============================================

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -c|--continue-on-error)
            CONTINUE_ON_ERROR=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-audit)
            SKIP_AUDIT=true
            shift
            ;;
        --quick)
            SKIP_TESTS=true
            SKIP_BUILD=true
            SKIP_AUDIT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 2
            ;;
    esac
done

# ============================================
# Pre-Check: Environment Setup
# ============================================

log_section "Code Quality Checks Starting"

log_info "Starting at $(date)"
log_info "Working directory: $SCRIPT_DIR"

if [ "$CONTINUE_ON_ERROR" = true ]; then
    log_warning "Continue-on-error mode enabled"
fi

# Check Node.js version
if ! command -v node &> /dev/null; then
    log_failure "Node.js is not installed"
    exit 2
fi

NODE_VERSION=$(node -v)
log_info "Node.js version: $NODE_VERSION"

# Check npm version
if ! command -v npm &> /dev/null; then
    log_failure "npm is not installed"
    exit 2
fi

NPM_VERSION=$(npm -v)
log_info "npm version: $NPM_VERSION"

# ============================================
# Check 1: Dependencies
# ============================================

log_section "1. Dependency Check"

if [ ! -d "node_modules" ]; then
    log_warning "node_modules not found, running npm install..."
    if npm install; then
        log_success "Dependencies installed"
    else
        log_failure "Failed to install dependencies"
        exit 1
    fi
else
    log_success "Dependencies are installed"
fi

# Check for outdated dependencies
log_info "Checking for outdated dependencies..."
OUTDATED=$(npm outdated || true)
if [ -n "$OUTDATED" ]; then
    log_warning "Some dependencies are outdated:"
    echo "$OUTDATED"
else
    log_success "All dependencies are up to date"
fi

# ============================================
# Check 2: Code Linting
# ============================================

if [ "$SKIP_LINT" = false ]; then
    log_section "2. Code Linting"

    # ESLint check for backend
    if [ -f "apps/backend/package.json" ]; then
        log_info "Running ESLint on backend..."
        if [ -f "apps/backend/.eslintrc.js" ] || [ -f "apps/backend/.eslintrc.json" ]; then
            run_check "Backend ESLint" "cd apps/backend && npm run lint" || true
        else
            log_warning "ESLint not configured for backend"
        fi
    fi

    # ESLint check for frontend
    if [ -f "apps/chatbot-frontend/package.json" ]; then
        log_info "Running ESLint on frontend..."
        if [ -f "apps/chatbot-frontend/.eslintrc.js" ] || [ -f "apps/chatbot-frontend/.eslintrc.json" ]; then
            run_check "Frontend ESLint" "cd apps/chatbot-frontend && npm run lint" || true
        else
            log_warning "ESLint not configured for frontend"
        fi
    fi

    # Prettier check
    log_info "Checking code formatting with Prettier..."
    if command -v prettier &> /dev/null; then
        if prettier --check "**/*.{ts,tsx,js,jsx,json,md}" 2>/dev/null; then
            log_success "Code formatting check passed"
        else
            log_warning "Code formatting issues found. Run 'prettier --write .' to fix"
        fi
    else
        log_warning "Prettier not installed globally, skipping format check"
    fi
else
    log_section "2. Code Linting (SKIPPED)"
fi

# ============================================
# Check 3: Type Checking
# ============================================

log_section "3. Type Checking"

# Backend TypeScript check
if [ -f "apps/backend/tsconfig.json" ]; then
    log_info "Running TypeScript compiler check for backend..."
    run_check "Backend TypeScript" "cd apps/backend && npx tsc --noEmit" || true
fi

# Frontend TypeScript check
if [ -f "apps/chatbot-frontend/tsconfig.json" ]; then
    log_info "Running TypeScript compiler check for frontend..."
    run_check "Frontend TypeScript" "cd apps/chatbot-frontend && npx tsc --noEmit" || true
fi

# Packages TypeScript check
if [ -f "packages/shared-types/tsconfig.json" ]; then
    log_info "Running TypeScript compiler check for shared types..."
    run_check "Shared Types TypeScript" "cd packages/shared-types && npx tsc --noEmit" || true
fi

if [ -f "packages/utils/tsconfig.json" ]; then
    log_info "Running TypeScript compiler check for utils..."
    run_check "Utils TypeScript" "cd packages/utils && npx tsc --noEmit" || true
fi

# ============================================
# Check 4: Unit Tests
# ============================================

if [ "$SKIP_TESTS" = false ]; then
    log_section "4. Unit Tests"

    # Backend tests
    if [ -f "apps/backend/package.json" ]; then
        if grep -q '"test"' apps/backend/package.json; then
            log_info "Running backend unit tests..."
            run_check "Backend Tests" "cd apps/backend && npm test" || true
        else
            log_warning "No test script configured for backend"
        fi
    fi

    # Frontend tests
    if [ -f "apps/chatbot-frontend/package.json" ]; then
        if grep -q '"test"' apps/chatbot-frontend/package.json; then
            log_info "Running frontend unit tests..."
            run_check "Frontend Tests" "cd apps/chatbot-frontend && npm test" || true
        else
            log_warning "No test script configured for frontend"
        fi
    fi

    # Integration tests
    log_info "Checking for integration tests..."
    if [ -f "test-integration.sh" ]; then
        log_info "Running integration tests..."
        run_check "Integration Tests" "./test-integration.sh" || true
    else
        log_warning "No integration tests found"
    fi
else
    log_section "4. Unit Tests (SKIPPED)"
fi

# ============================================
# Check 5: Build Verification
# ============================================

if [ "$SKIP_BUILD" = false ]; then
    log_section "5. Build Verification"

    # Backend build
    if [ -f "apps/backend/package.json" ]; then
        if grep -q '"build"' apps/backend/package.json; then
            log_info "Building backend..."
            run_check "Backend Build" "cd apps/backend && npm run build" || true
        else
            log_warning "No build script configured for backend"
        fi
    fi

    # Frontend build
    if [ -f "apps/chatbot-frontend/package.json" ]; then
        if grep -q '"build"' apps/chatbot-frontend/package.json; then
            log_info "Building frontend..."
            run_check "Frontend Build" "cd apps/chatbot-frontend && npm run build" || true
        else
            log_warning "No build script configured for frontend"
        fi
    fi

    # Packages build
    if [ -f "packages/shared-types/package.json" ]; then
        if grep -q '"build"' packages/shared-types/package.json; then
            log_info "Building shared-types..."
            run_check "Shared Types Build" "cd packages/shared-types && npm run build" || true
        fi
    fi

    if [ -f "packages/utils/package.json" ]; then
        if grep -q '"build"' packages/utils/package.json; then
            log_info "Building utils..."
            run_check "Utils Build" "cd packages/utils && npm run build" || true
        fi
    fi
else
    log_section "5. Build Verification (SKIPPED)"
fi

# ============================================
# Check 6: Security Audit
# ============================================

if [ "$SKIP_AUDIT" = false ]; then
    log_section "6. Security Audit"

    log_info "Running npm audit..."

    # Run audit and capture output
    AUDIT_OUTPUT=$(npm audit --json 2>&1 || true)

    # Parse audit results
    if echo "$AUDIT_OUTPUT" | grep -q '"vulnerabilities"'; then
        CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | cut -d':' -f2 || echo "0")
        HIGH=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | cut -d':' -f2 || echo "0")
        MODERATE=$(echo "$AUDIT_OUTPUT" | grep -o '"moderate":[0-9]*' | cut -d':' -f2 || echo "0")
        LOW=$(echo "$AUDIT_OUTPUT" | grep -o '"low":[0-9]*' | cut -d':' -f2 || echo "0")

        if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
            log_failure "Security audit found vulnerabilities:"
            echo "  Critical: $CRITICAL"
            echo "  High: $HIGH"
            echo "  Moderate: $MODERATE"
            echo "  Low: $LOW"
            log_warning "Run 'npm audit fix' to attempt automatic fixes"
        elif [ "$MODERATE" -gt 0 ] || [ "$LOW" -gt 0 ]; then
            log_warning "Security audit found minor vulnerabilities:"
            echo "  Moderate: $MODERATE"
            echo "  Low: $LOW"
            log_info "Review with 'npm audit' for details"
        else
            log_success "No security vulnerabilities found"
        fi
    else
        log_success "Security audit passed"
    fi

    # Check for known security issues in production dependencies only
    log_info "Checking production dependencies..."
    PROD_AUDIT=$(npm audit --production --json 2>&1 || true)
    if echo "$PROD_AUDIT" | grep -q '"vulnerabilities"'; then
        PROD_CRITICAL=$(echo "$PROD_AUDIT" | grep -o '"critical":[0-9]*' | cut -d':' -f2 || echo "0")
        PROD_HIGH=$(echo "$PROD_AUDIT" | grep -o '"high":[0-9]*' | cut -d':' -f2 || echo "0")

        if [ "$PROD_CRITICAL" -gt 0 ] || [ "$PROD_HIGH" -gt 0 ]; then
            log_failure "Production dependencies have critical vulnerabilities"
            log_warning "This must be fixed before production deployment"
        else
            log_success "Production dependencies are secure"
        fi
    fi
else
    log_section "6. Security Audit (SKIPPED)"
fi

# ============================================
# Check 7: Documentation
# ============================================

log_section "7. Documentation Check"

# Check if docs script exists
if grep -q '"docs"' package.json 2>/dev/null; then
    log_info "Generating documentation..."
    run_check "Documentation Generation" "npm run docs" || true
else
    log_warning "No docs script configured in package.json"
fi

# Check for required documentation files
REQUIRED_DOCS=(
    "README.md"
    "API_DOCUMENTATION.md"
    "DEPLOYMENT.md"
    "CHANGELOG.md"
    "MIGRATION_GUIDE.md"
)

log_info "Checking required documentation files..."
for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        log_success "Found: $doc"
    else
        log_warning "Missing: $doc"
    fi
done

# ============================================
# Check 8: Code Complexity (Optional)
# ============================================

log_section "8. Code Complexity Analysis"

if command -v complexity-report &> /dev/null; then
    log_info "Running code complexity analysis..."
    run_check "Complexity Analysis" "complexity-report apps/backend/src/**/*.ts" || true
else
    log_warning "complexity-report not installed, skipping complexity analysis"
    log_info "Install with: npm install -g complexity-report"
fi

# ============================================
# Check 9: Git Status
# ============================================

log_section "9. Git Status Check"

if [ -d ".git" ]; then
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "You have uncommitted changes:"
        git status --short
        log_info "Consider committing changes before final review"
    else
        log_success "Working directory is clean"
    fi

    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    log_info "Current branch: $CURRENT_BRANCH"

    # Warn if on main/master
    if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
        log_warning "You are on the $CURRENT_BRANCH branch"
        log_info "Consider creating a feature branch for changes"
    fi
else
    log_warning "Not a git repository"
fi

# ============================================
# Check 10: Environment Configuration
# ============================================

log_section "10. Environment Configuration Check"

# Check for environment files
if [ -f ".env" ]; then
    log_success "Found .env file"

    # Check for placeholder values
    if grep -q "REPLACE\|TODO\|CHANGEME" .env 2>/dev/null; then
        log_warning ".env file contains placeholder values"
        log_info "Update all REPLACE_WITH_* placeholders before deployment"
    else
        log_success "No placeholder values found in .env"
    fi
else
    log_warning ".env file not found"
    log_info "Create .env from .env.production template"
fi

# Check for .env.production template
if [ -f ".env.production" ]; then
    log_success "Found .env.production template"
else
    log_warning ".env.production template not found"
fi

# ============================================
# Final Summary
# ============================================

log_section "Quality Check Summary"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Checks:   $TOTAL_CHECKS"
echo -e "${GREEN}Passed:         $PASSED_CHECKS${NC}"
echo -e "${RED}Failed:         $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings:       $WARNINGS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$TOTAL_CHECKS" -eq 0 ]; then
    echo -e "${YELLOW}⚠ No checks were run${NC}"
    exit 1
fi

SUCCESS_RATE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))

if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! ($SUCCESS_RATE%)${NC}"
    echo ""
    echo "🎉 Code quality verification successful!"
    echo ""
    echo "Next steps:"
    echo "  1. Review any warnings above"
    echo "  2. Commit your changes: git add . && git commit -m 'Your message'"
    echo "  3. Create a pull request or deploy to production"
    echo ""
    exit 0
elif [ "$FAILED_CHECKS" -lt 3 ]; then
    echo -e "${YELLOW}⚠ Some checks failed ($SUCCESS_RATE% passed)${NC}"
    echo ""
    echo "Review the failed checks above and fix issues before committing."
    echo "Run with --verbose to see detailed error messages."
    echo ""
    if [ "$CONTINUE_ON_ERROR" = false ]; then
        exit 1
    else
        echo "Continuing due to --continue-on-error flag"
        exit 0
    fi
else
    echo -e "${RED}✗ Multiple checks failed ($SUCCESS_RATE% passed)${NC}"
    echo ""
    echo "Significant issues found. Please address the failures above."
    echo "Run with --verbose to see detailed error messages."
    echo ""
    exit 1
fi
