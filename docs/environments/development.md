# Development Environment Setup

This guide covers setting up Astral Core v7 for local development.

## Prerequisites

### Required Software

- **Node.js**: 18.17.0 or higher
- **npm**: 9.0.0 or higher  
- **PostgreSQL**: 14.0 or higher
- **Git**: Latest version

### System Requirements

- **OS**: Windows 10+, macOS 12+, or Ubuntu 20.04+
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **Network**: Internet connection for dependencies

## Installation Steps

### 1. Database Setup

#### Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

#### Create Database and User

```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database
CREATE DATABASE astralcore_v7;

-- Create user
CREATE USER astral_dev WITH ENCRYPTED PASSWORD 'dev_password_2024';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE astralcore_v7 TO astral_dev;
ALTER USER astral_dev CREATEDB;

-- Exit
\q
```

### 2. Project Setup

```bash
# Clone repository
git clone <repository-url>
cd astral-core-v7

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3. Environment Configuration

Edit `.env` with development-specific values:

```bash
# Database
DATABASE_URL="postgresql://astral_dev:dev_password_2024@localhost:5432/astralcore_v7"
DIRECT_URL="postgresql://astral_dev:dev_password_2024@localhost:5432/astralcore_v7"

# Generate secrets
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
JWT_SIGNING_KEY="$(openssl rand -base64 32)"

# Development URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Development settings
NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="Astral Core Dev"
SESSION_TIMEOUT_MINUTES="60"  # Longer for development

# Security (relaxed for development)
REQUIRE_MFA="false"
MAX_LOGIN_ATTEMPTS="10"
RATE_LIMIT_MAX_REQUESTS="200"

# Features (enable all for testing)
ENABLE_CRISIS_INTERVENTION="true"
ENABLE_AI_ASSISTANCE="false"  # Keep disabled unless testing
ENABLE_VIDEO_SESSIONS="false"
ENABLE_GROUP_THERAPY="false"

# File storage (local for development)
STORAGE_PROVIDER="local"

# Analytics (disabled for development)
POSTHOG_KEY=""
SENTRY_DSN=""
```

### 4. Database Initialization

```bash
# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:migrate

# Optional: Seed with test data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Development Tools

### Database Management

```bash
# Open Prisma Studio (database GUI)
npm run db:studio
# Visit http://localhost:5555

# View database in terminal
psql -U astral_dev -d astralcore_v7
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format

# Run tests
npm run test
npm run test:watch
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ... code changes ...

# Run tests
npm run test

# Check types and lint
npm run typecheck
npm run lint

# Commit changes
git add .
git commit -m "feat: add your feature description"
```

### 2. Database Changes

```bash
# Modify prisma/schema.prisma
# ... make schema changes ...

# Create migration
npm run db:migrate

# The migration will be created and applied automatically
```

### 3. Environment Variables

```bash
# Add new variable to .env.example with description
# Update .env with your value
# Restart development server
npm run dev
```

## Common Development Tasks

### Reset Database

```bash
# Reset and reseed database (development only)
npm run db:push --force-reset
npm run db:seed
```

### Debug Database Issues

```bash
# Check database connection
psql -U astral_dev -d astralcore_v7 -c "SELECT version();"

# View active connections
psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE datname='astralcore_v7';"

# Check Prisma connection
npx prisma db pull
```

### Testing OAuth Integration

For Google OAuth testing:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Astral Core Dev"
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Add credentials to `.env`:
   ```bash
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

### Testing Stripe Integration

1. Sign up at [Stripe](https://stripe.com)
2. Get test API keys from dashboard
3. Add to `.env`:
   ```bash
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_SECRET_KEY="sk_test_..."
   ```
4. Use test cards:
   - Success: `4242424242424242`
   - Decline: `4000000000000002`

## Performance Optimization

### Development Server Performance

```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 node_modules/.bin/next dev

# Enable webpack cache
# (Already configured in next.config.js)
```

### Database Performance

```bash
# Monitor slow queries
psql -U astral_dev -d astralcore_v7 -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"
```

## Troubleshooting

### Port Issues

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Use different port
PORT=3001 npm run dev
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database exists
psql -U postgres -c "\l" | grep astralcore_v7
```

### Memory Issues

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Security Considerations

### Development Security

1. **Never commit real secrets** to version control
2. **Use separate database** from staging/production
3. **Keep development dependencies** updated
4. **Use HTTPS** for OAuth testing (use ngrok if needed)
5. **Regularly rotate** development secrets

### HIPAA Compliance in Development

Even in development:

1. **Enable PHI encryption**: `PHI_ENCRYPTION_ENABLED="true"`
2. **Use test data only** - never use real patient information
3. **Secure your development machine** with full-disk encryption
4. **Use VPN** if working remotely
5. **Follow data handling policies**

## Next Steps

After successful setup:

1. **Explore the codebase**: Start with `src/app/layout.tsx`
2. **Run the test suite**: `npm run test`
3. **Review API documentation**: Visit `/docs/README.md`
4. **Check staging environment**: See `docs/environments/staging.md`
5. **Learn deployment**: See `docs/environments/production.md`

## Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/for-professionals/security/index.html)