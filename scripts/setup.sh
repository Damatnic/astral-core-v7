#!/bin/bash

# Astral Core v7 Quick Setup Script
# This script automates the initial setup process for development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate secure random string
generate_secret() {
    local length=${1:-32}
    if command_exists openssl; then
        openssl rand -base64 $length
    elif command_exists python3; then
        python3 -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes($length)).decode())"
    else
        # Fallback to date-based random (less secure)
        print_warning "Using fallback random generation. Install openssl for better security."
        date +%s | sha256sum | base64 | head -c $length ; echo
    fi
}

# Function to generate hex key
generate_hex_key() {
    local length=${1:-32}
    if command_exists openssl; then
        openssl rand -hex $length
    elif command_exists python3; then
        python3 -c "import secrets; print(secrets.token_hex($length))"
    else
        # Fallback
        print_warning "Using fallback hex generation. Install openssl for better security."
        date +%s | sha256sum | head -c $((length*2)) ; echo
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_VERSION="18.17.0"
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            print_success "Node.js version $NODE_VERSION is compatible"
        else
            print_error "Node.js version $NODE_VERSION is not compatible. Required: $REQUIRED_VERSION or higher"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18.17.0 or higher"
        exit 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm version $NPM_VERSION found"
    else
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check PostgreSQL
    if command_exists psql; then
        POSTGRES_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1)
        if [ "$POSTGRES_VERSION" -ge 14 ]; then
            print_success "PostgreSQL version $POSTGRES_VERSION found"
        else
            print_error "PostgreSQL version must be 14 or higher. Found: $POSTGRES_VERSION"
            exit 1
        fi
    else
        print_error "PostgreSQL is not installed. Please install PostgreSQL 14 or higher"
        exit 1
    fi
    
    # Check Git
    if command_exists git; then
        print_success "Git is installed"
    else
        print_error "Git is not installed. Please install Git"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed successfully"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_warning ".env file already exists. Backing up as .env.backup"
        cp .env .env.backup
    fi
    
    # Generate secrets
    print_status "Generating security keys..."
    
    NEXTAUTH_SECRET=$(generate_secret 32)
    ENCRYPTION_KEY=$(generate_hex_key 32)
    JWT_SIGNING_KEY=$(generate_secret 32)
    
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|NEXTAUTH_SECRET=\".*\"|NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"|g" .env
        sed -i '' "s|ENCRYPTION_KEY=\".*\"|ENCRYPTION_KEY=\"$ENCRYPTION_KEY\"|g" .env
        sed -i '' "s|JWT_SIGNING_KEY=\".*\"|JWT_SIGNING_KEY=\"$JWT_SIGNING_KEY\"|g" .env
    else
        # Linux
        sed -i "s|NEXTAUTH_SECRET=\".*\"|NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"|g" .env
        sed -i "s|ENCRYPTION_KEY=\".*\"|ENCRYPTION_KEY=\"$ENCRYPTION_KEY\"|g" .env
        sed -i "s|JWT_SIGNING_KEY=\".*\"|JWT_SIGNING_KEY=\"$JWT_SIGNING_KEY\"|g" .env
    fi
    
    print_success "Security keys generated and saved to .env"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Database connection details
    DB_NAME="astralcore_v7"
    DB_USER="astral_user"
    DB_PASSWORD=$(generate_secret 16 | tr -d '=+/')  # Clean password
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_warning "Database $DB_NAME already exists"
    else
        # Create database and user
        print_status "Creating database and user..."
        
        sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
        
        print_success "Database and user created"
        
        # Update DATABASE_URL in .env
        DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|DATABASE_URL=\".*\"|DATABASE_URL=\"$DATABASE_URL\"|g" .env
            sed -i '' "s|DIRECT_URL=\".*\"|DIRECT_URL=\"$DATABASE_URL\"|g" .env
        else
            sed -i "s|DATABASE_URL=\".*\"|DATABASE_URL=\"$DATABASE_URL\"|g" .env
            sed -i "s|DIRECT_URL=\".*\"|DIRECT_URL=\"$DATABASE_URL\"|g" .env
        fi
        
        print_success "Database URL updated in .env"
    fi
}

# Setup Prisma
setup_prisma() {
    print_status "Setting up Prisma..."
    
    # Generate Prisma client
    npx prisma generate
    print_success "Prisma client generated"
    
    # Run migrations
    npx prisma migrate dev --name "initial-setup"
    print_success "Database migrations applied"
    
    # Seed database if seed script exists
    if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
        print_status "Seeding database..."
        npx prisma db seed || print_warning "Database seeding failed or not configured"
    fi
}

# Verify installation
verify_installation() {
    print_status "Verifying installation..."
    
    # Check if build works
    npm run typecheck
    print_success "TypeScript compilation successful"
    
    # Check if database connection works
    if npx prisma db pull > /dev/null 2>&1; then
        print_success "Database connection verified"
    else
        print_error "Database connection failed"
        exit 1
    fi
    
    print_success "Installation verification complete"
}

# Print next steps
print_next_steps() {
    echo
    echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Start the development server:"
    echo -e "   ${YELLOW}npm run dev${NC}"
    echo
    echo "2. Open your browser and visit:"
    echo -e "   ${YELLOW}http://localhost:3000${NC}"
    echo
    echo "3. Access Prisma Studio (database GUI):"
    echo -e "   ${YELLOW}npm run db:studio${NC}"
    echo
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "   ${YELLOW}npm run lint${NC}        - Run ESLint"
    echo -e "   ${YELLOW}npm run test${NC}         - Run tests"
    echo -e "   ${YELLOW}npm run build${NC}        - Build for production"
    echo
    echo -e "${BLUE}Documentation:${NC}"
    echo -e "   ${YELLOW}docs/README.md${NC}                    - API documentation"
    echo -e "   ${YELLOW}docs/environments/development.md${NC}  - Development guide"
    echo -e "   ${YELLOW}docs/troubleshooting.md${NC}           - Troubleshooting guide"
    echo
    echo -e "${GREEN}Happy coding! 🚀${NC}"
    echo
    echo -e "${YELLOW}⚠️  Security reminder:${NC}"
    echo "• Never commit your .env file to version control"
    echo "• Your secrets have been generated and saved securely"
    echo "• For production deployment, generate new secrets"
}

# Main setup flow
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║        Astral Core v7 Quick Setup        ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    install_dependencies
    setup_environment
    setup_database
    setup_prisma
    verify_installation
    print_next_steps
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Astral Core v7 Quick Setup Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --skip-db      Skip database setup (use existing)"
        echo "  --docker       Setup for Docker development"
        echo
        exit 0
        ;;
    --skip-db)
        SKIP_DATABASE=true
        ;;
    --docker)
        DOCKER_SETUP=true
        ;;
esac

# Run main setup
main

# Success exit
exit 0