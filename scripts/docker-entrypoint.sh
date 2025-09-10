#!/bin/sh
set -e

# Astral Core v7 Docker Entrypoint Script
# This script handles database migrations and starts the application

echo "🚀 Starting Astral Core v7..."

# Function to wait for database to be ready
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    
    # Extract database connection details from DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    # Default values if extraction fails
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    
    # Wait for database to be ready
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; do
        echo "⏳ Database is not ready yet. Waiting..."
        sleep 2
    done
    
    echo "✅ Database is ready!"
}

# Function to run database migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    
    if [ "$NODE_ENV" = "production" ]; then
        # Production migrations (deploy only)
        npx prisma migrate deploy
    else
        # Development migrations (with dev database)
        npx prisma migrate dev --name "docker-startup"
    fi
    
    echo "✅ Database migrations completed!"
}

# Function to seed database (development only)
seed_database() {
    if [ "$NODE_ENV" != "production" ] && [ "$SEED_DATABASE" = "true" ]; then
        echo "🌱 Seeding database with sample data..."
        npx prisma db seed || echo "⚠️  Database seeding failed or not configured"
    fi
}

# Function to start the application
start_application() {
    echo "🌟 Starting Next.js application..."
    
    if [ "$NODE_ENV" = "production" ]; then
        # Production: Start with optimized settings
        exec node_modules/.bin/next start -p ${PORT:-3000}
    else
        # Development: Start with dev server
        exec npm run dev
    fi
}

# Main execution flow
main() {
    echo "🔧 Environment: $NODE_ENV"
    echo "🔗 Database URL configured: ${DATABASE_URL:+Yes}"
    echo "📦 Node.js version: $(node --version)"
    echo "📦 npm version: $(npm --version)"
    
    # Validate required environment variables
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ ERROR: DATABASE_URL is not set"
        exit 1
    fi
    
    if [ -z "$NEXTAUTH_SECRET" ]; then
        echo "❌ ERROR: NEXTAUTH_SECRET is not set"
        exit 1
    fi
    
    if [ -z "$ENCRYPTION_KEY" ]; then
        echo "❌ ERROR: ENCRYPTION_KEY is not set"
        exit 1
    fi
    
    # Wait for database to be ready
    wait_for_db
    
    # Run database migrations
    run_migrations
    
    # Seed database if requested (dev only)
    seed_database
    
    # Start the application
    start_application
}

# Handle signals for graceful shutdown
trap 'echo "🛑 Received SIGTERM, shutting down gracefully..."; exit 0' TERM
trap 'echo "🛑 Received SIGINT, shutting down gracefully..."; exit 0' INT

# Execute main function
main "$@"