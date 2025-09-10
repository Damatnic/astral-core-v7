#!/bin/bash

# Astral Core v7 Docker Entrypoint Script
# This script handles application startup with proper initialization

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_DIR="/app"
readonly HEALTH_CHECK_URL="http://localhost:3000/api/health"
readonly MAX_STARTUP_TIME=120

# Logging functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $*" >&2
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2
}

log_warn() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [WARN] $*" >&2
}

# Check if running as root and switch to app user
check_user() {
    if [[ $EUID -eq 0 ]]; then
        log_warn "Running as root, switching to astral user"
        exec gosu astral "$0" "$@"
    fi
}

# Environment validation
validate_environment() {
    log "Validating environment variables..."
    
    local required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        printf ' - %s\n' "${missing_vars[@]}" >&2
        exit 1
    fi
    
    # Validate DATABASE_URL format
    if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
        log_error "DATABASE_URL must be a PostgreSQL connection string"
        exit 1
    fi
    
    log "Environment validation passed"
}

# Database connectivity check
check_database() {
    log "Checking database connectivity..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Database connection attempt $attempt/$max_attempts"
        
        if npx prisma db pull --force --schema=./prisma/schema.prisma >/dev/null 2>&1; then
            log "Database connection successful"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Failed to connect to database after $max_attempts attempts"
            return 1
        fi
        
        sleep 2
        ((attempt++))
    done
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    if ! npx prisma migrate deploy; then
        log_error "Database migration failed"
        exit 1
    fi
    
    log "Database migrations completed successfully"
}

# Generate Prisma client
generate_prisma_client() {
    log "Generating Prisma client..."
    
    if ! npx prisma generate; then
        log_error "Failed to generate Prisma client"
        exit 1
    fi
    
    log "Prisma client generated successfully"
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check if required files exist
    local required_files=(
        "$APP_DIR/package.json"
        "$APP_DIR/.next"
        "$APP_DIR/prisma/schema.prisma"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -e "$file" ]]; then
            log_error "Required file/directory not found: $file"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | sed 's/v//')
    log "Node.js version: $node_version"
    
    # Check available memory
    local available_memory
    available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    log "Available memory: ${available_memory}MB"
    
    if [[ $available_memory -lt 512 ]]; then
        log_warn "Low available memory: ${available_memory}MB (recommended: >512MB)"
    fi
    
    log "Pre-flight checks completed"
}

# Health check function
health_check() {
    local url="$1"
    local timeout="${2:-5}"
    
    if command -v curl >/dev/null 2>&1; then
        curl -f -s --max-time "$timeout" "$url" >/dev/null 2>&1
    else
        # Fallback to wget if curl is not available
        wget -q -T "$timeout" -O /dev/null "$url" >/dev/null 2>&1
    fi
}

# Wait for application to start
wait_for_startup() {
    log "Waiting for application to start..."
    
    local start_time
    start_time=$(date +%s)
    local timeout_time=$((start_time + MAX_STARTUP_TIME))
    
    while [[ $(date +%s) -lt $timeout_time ]]; do
        if health_check "$HEALTH_CHECK_URL" 3; then
            local elapsed=$(($(date +%s) - start_time))
            log "Application started successfully in ${elapsed} seconds"
            return 0
        fi
        
        sleep 2
    done
    
    log_error "Application failed to start within $MAX_STARTUP_TIME seconds"
    return 1
}

# Signal handlers for graceful shutdown
shutdown() {
    log "Received shutdown signal, stopping application..."
    
    if [[ -n "${APP_PID:-}" ]]; then
        log "Stopping application process (PID: $APP_PID)"
        kill -TERM "$APP_PID" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local timeout=30
        while [[ $timeout -gt 0 ]] && kill -0 "$APP_PID" 2>/dev/null; do
            sleep 1
            ((timeout--))
        done
        
        # Force kill if still running
        if kill -0 "$APP_PID" 2>/dev/null; then
            log_warn "Force killing application process"
            kill -KILL "$APP_PID" 2>/dev/null || true
        fi
    fi
    
    log "Application shutdown complete"
    exit 0
}

# Set up signal handlers
trap shutdown SIGTERM SIGINT

# Main execution
main() {
    log "Starting Astral Core v7..."
    
    # Change to app directory
    cd "$APP_DIR"
    
    # Run startup sequence
    check_user "$@"
    validate_environment
    preflight_checks
    check_database
    generate_prisma_client
    run_migrations
    
    log "Starting Next.js application..."
    
    # Start the application
    if [[ "${NODE_ENV:-production}" == "development" ]]; then
        log "Starting in development mode"
        npm run dev &
    else
        log "Starting in production mode"
        npm start &
    fi
    
    APP_PID=$!
    log "Application started with PID: $APP_PID"
    
    # Wait for application to be ready
    if ! wait_for_startup; then
        log_error "Application startup failed"
        exit 1
    fi
    
    log "Astral Core v7 is now running at http://0.0.0.0:3000"
    log "Health check endpoint: $HEALTH_CHECK_URL"
    
    # Wait for the application process
    wait "$APP_PID"
    
    log "Application process exited"
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi