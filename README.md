# Astral Core v7

A complete rewrite of the Astral Core mental health platform with improved architecture, security, and features.

## 🌟 Features

- 🔐 **HIPAA-Compliant Security**: End-to-end encryption for all PHI data
- 🛡️ **Advanced Authentication**: NextAuth.js with OAuth and MFA support
- 📊 **Wellness Tracking**: Comprehensive mood, sleep, and mental health monitoring
- 🆘 **Crisis Support**: 24/7 crisis intervention system
- 💬 **Therapy Management**: Session notes, treatment plans, and progress tracking
- 📱 **Modern UI**: Built with Next.js 15, TypeScript, and Tailwind CSS
- 💳 **Payment Integration**: Stripe-powered subscription management
- 🔔 **Real-time Notifications**: WebSocket-based instant updates
- 📁 **Secure File Storage**: Encrypted document management

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with MFA support
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Security**: AES-256-GCM encryption, rate limiting, session management
- **Payments**: Stripe integration
- **Real-time**: WebSocket (Socket.io)
- **Testing**: Jest with Testing Library
- **Deployment**: Docker ready with multi-stage builds

## 🚀 Quick Start

### Prerequisites

Before starting, ensure you have the following installed:

- **Node.js**: Version 18.17 or higher ([Download](https://nodejs.org/))
- **npm**: Version 9+ (comes with Node.js)
- **PostgreSQL**: Version 14+ ([Download](https://www.postgresql.org/download/))
- **Git**: For version control ([Download](https://git-scm.com/))

### Database Setup

1. **Install PostgreSQL** (if not already installed):

   ```bash
   # macOS with Homebrew
   brew install postgresql@14
   brew services start postgresql@14

   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql

   # Windows - Download installer from postgresql.org
   ```

2. **Create database and user**:

   ```sql
   -- Connect to PostgreSQL
   sudo -u postgres psql

   -- Create database
   CREATE DATABASE astralcore_v7;

   -- Create user with password
   CREATE USER astral_user WITH ENCRYPTED PASSWORD 'secure_password_here';

   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE astralcore_v7 TO astral_user;

   -- Exit PostgreSQL
   \q
   ```

### Installation & Setup

1. **Clone and install**:

   ```bash
   git clone <repository-url>
   cd astral-core-v7
   npm install
   ```

2. **Environment configuration**:

   ```bash
   # Copy environment template
   cp .env.example .env

   # Generate required secrets
   openssl rand -hex 32   # For ENCRYPTION_KEY
   openssl rand -base64 32 # For NEXTAUTH_SECRET
   openssl rand -base64 32 # For JWT_SIGNING_KEY
   ```

3. **Configure environment variables** (edit `.env`):

   ```bash
   # Database
   DATABASE_URL="postgresql://astral_user:secure_password_here@localhost:5432/astralcore_v7"

   # Security (use generated values above)
   ENCRYPTION_KEY="your_generated_hex_key_here"
   NEXTAUTH_SECRET="your_generated_secret_here"
   JWT_SIGNING_KEY="your_generated_jwt_key_here"

   # Application
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Database setup**:

   ```bash
   # Generate Prisma client
   npm run db:generate

   # Run database migrations
   npm run db:migrate

   # (Optional) Seed with sample data
   npm run db:seed
   ```

5. **Start development server**:

   ```bash
   npm run dev
   ```

6. **Verify installation**:
   - Open http://localhost:3000
   - Check database connection: http://localhost:3000/api/health
   - Access Prisma Studio: `npm run db:studio`

### OAuth Setup (Optional)

For Google OAuth integration:

1. **Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add `http://localhost:3000/api/auth/callback/google` to authorized redirects

2. **Update environment**:
   ```bash
   GOOGLE_CLIENT_ID="your_google_client_id"
   GOOGLE_CLIENT_SECRET="your_google_client_secret"
   ```

### Stripe Setup (Optional)

For payment processing:

1. **Stripe Account**:
   - Sign up at [Stripe](https://stripe.com)
   - Get test API keys from dashboard
   - Set up webhook endpoint: `http://localhost:3000/api/webhooks/stripe`

2. **Update environment**:
   ```bash
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── ui/             # Base UI components
│   ├── layouts/        # Layout components
│   └── features/       # Feature-specific components
├── lib/                # Core utilities
│   ├── auth/          # Authentication config
│   ├── db/            # Database client
│   ├── security/      # Security utilities
│   ├── services/      # Business logic
│   ├── types/         # TypeScript types
│   └── constants/     # App constants
├── hooks/             # Custom React hooks
├── store/             # Zustand stores
└── middleware.ts      # Next.js middleware
```

## Security Features

- **PHI Encryption**: All Protected Health Information is encrypted at rest
- **Audit Logging**: Comprehensive audit trail for HIPAA compliance
- **Rate Limiting**: Protection against brute force and DDoS attacks
- **Session Management**: Secure session handling with timeout
- **Input Validation**: Strict validation and sanitization of all inputs
- **RBAC**: Role-based access control for different user types

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run db:studio        # Open Prisma Studio (database GUI)

# Building & Production
npm run build            # Build for production (includes type checking)
npm run start            # Start production server
npm run typecheck        # TypeScript type checking only

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm run format           # Format code with Prettier

# Database Management
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to database
npm run db:migrate       # Create and run new migration
npm run db:migrate:prod  # Deploy migrations in production
npm run db:seed          # Seed database with sample data

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:ci          # Run tests for CI/CD pipeline
npm run test:debug       # Debug failing tests
```

## 🌍 Environment Configuration

### Development Environment

For local development, ensure your `.env` file contains:

```bash
# Development Database
DATABASE_URL="postgresql://astral_user:password@localhost:5432/astralcore_v7"
DIRECT_URL="postgresql://astral_user:password@localhost:5432/astralcore_v7"

# Security Keys (generate new ones!)
NEXTAUTH_SECRET="your-secret-here"
ENCRYPTION_KEY="your-encryption-key-here"
JWT_SIGNING_KEY="your-jwt-key-here"

# Development URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Development Settings
NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="Astral Core Dev"
SESSION_TIMEOUT_MINUTES="30"

# Feature Flags for Development
ENABLE_CRISIS_INTERVENTION="true"
ENABLE_AI_ASSISTANCE="false"
ENABLE_VIDEO_SESSIONS="false"
PHI_ENCRYPTION_ENABLED="true"
```

### Staging Environment

For staging deployments:

```bash
# Staging Database (use separate database)
DATABASE_URL="postgresql://user:pass@staging-db:5432/astralcore_staging"

# Staging URLs
NEXTAUTH_URL="https://staging.astral-core.app"
NEXT_PUBLIC_APP_URL="https://staging.astral-core.app"

# Staging Settings
NODE_ENV="staging"
NEXT_PUBLIC_APP_NAME="Astral Core Staging"

# Use test Stripe keys in staging
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."

# Enable all features in staging
ENABLE_CRISIS_INTERVENTION="true"
ENABLE_AI_ASSISTANCE="true"
ENABLE_VIDEO_SESSIONS="true"
```

### Production Environment

For production deployments:

```bash
# Production Database (secured connection)
DATABASE_URL="postgresql://user:secure_pass@prod-db:5432/astralcore_prod?sslmode=require"

# Production URLs
NEXTAUTH_URL="https://app.astral-core.com"
NEXT_PUBLIC_APP_URL="https://app.astral-core.com"

# Production Settings
NODE_ENV="production"
NEXT_PUBLIC_APP_NAME="Astral Core"
SESSION_TIMEOUT_MINUTES="15"
REQUIRE_MFA="true"

# Use live Stripe keys
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."

# Production Security
AUDIT_LOG_RETENTION_DAYS="2555"
PHI_ENCRYPTION_ENABLED="true"
RATE_LIMIT_MAX_REQUESTS="50"  # Stricter in production
```

## User Roles

- **CLIENT**: Regular users seeking mental health services
- **THERAPIST**: Licensed mental health professionals
- **ADMIN**: System administrators
- **CRISIS_RESPONDER**: Specialized crisis intervention staff
- **SUPERVISOR**: Clinical supervisors

## 🚀 Deployment

### Local Development Deployment

```bash
# Start development server
npm run dev

# Build and test production locally
npm run build
npm run start
```

### Docker Deployment

1. **Build Docker image**:

   ```bash
   docker build -t astral-core-v7 .
   ```

2. **Run with Docker Compose**:

   ```bash
   docker-compose up -d
   ```

3. **Environment variables in Docker**:

   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - '3000:3000'
       environment:
         - DATABASE_URL=postgresql://user:pass@db:5432/astralcore
         - NEXTAUTH_SECRET=your-secret
       depends_on:
         - db

     db:
       image: postgres:14
       environment:
         - POSTGRES_DB=astralcore
         - POSTGRES_USER=user
         - POSTGRES_PASSWORD=pass
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     postgres_data:
   ```

### Production Deployment

#### Option 1: Vercel (Recommended for Next.js)

1. **Connect repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Configure build settings**:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   ```

#### Option 2: AWS/GCP/Azure

1. **Prepare production build**:

   ```bash
   npm run build
   npm run start
   ```

2. **Use PM2 for process management**:

   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

3. **Ecosystem configuration** (`ecosystem.config.js`):
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'astral-core-v7',
         script: 'npm',
         args: 'start',
         instances: 'max',
         exec_mode: 'cluster',
         env: {
           NODE_ENV: 'production',
           PORT: 3000
         }
       }
     ]
   };
   ```

### Database Migrations in Production

```bash
# Deploy migrations safely
npm run db:migrate:prod

# Backup before major migrations
pg_dump -h your-db-host -U user -d database > backup.sql
```

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

```
Error: P1001: Can't reach database server
```

**Solutions**:

1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify connection string in `.env`
3. Check firewall settings
4. Ensure database exists: `psql -U postgres -c "\l"`

#### Migration Failures

**Problem**: Prisma migration fails

```
Error: P3014: The datasource provider is missing
```

**Solutions**:

1. Run `npm run db:generate` first
2. Check DATABASE_URL format
3. Reset database: `npm run db:push --force-reset` (DEV ONLY)

#### Authentication Issues

**Problem**: NextAuth session errors

```
Error: NEXTAUTH_SECRET missing
```

**Solutions**:

1. Generate secret: `openssl rand -base64 32`
2. Add to `.env`: `NEXTAUTH_SECRET="generated-secret"`
3. Restart development server

#### Build Failures

**Problem**: TypeScript build errors

```
Error: Type 'string' is not assignable to type 'never'
```

**Solutions**:

1. Run `npm run typecheck` to identify issues
2. Check `tsconfig.json` configuration
3. Update dependencies: `npm update`

### Performance Issues

#### Slow Database Queries

1. **Check query performance**:

   ```bash
   npm run db:studio  # Use Prisma Studio
   ```

2. **Add database indexes**:

   ```sql
   CREATE INDEX idx_user_email ON "User"(email);
   CREATE INDEX idx_wellness_date ON "WellnessEntry"(date);
   ```

3. **Optimize Prisma queries**:
   ```typescript
   // Use select to limit fields
   const user = await prisma.user.findUnique({
     where: { id },
     select: { id: true, email: true, name: true }
   });
   ```

#### Memory Issues

1. **Monitor memory usage**:

   ```bash
   node --max-old-space-size=4096 node_modules/.bin/next dev
   ```

2. **Optimize bundle size**:
   ```bash
   npm run build  # Check bundle analysis
   ```

### Security Issues

#### Rate Limiting Triggered

**Problem**: "Too Many Requests" errors

```
Status: 429 - Rate limit exceeded
```

**Solutions**:

1. Increase limits in production: Update `RATE_LIMIT_MAX_REQUESTS`
2. Implement exponential backoff in client code
3. Use Redis for distributed rate limiting

#### Encryption Key Issues

**Problem**: Data decryption failures

```
Error: Invalid encryption key
```

**Solutions**:

1. Never change `ENCRYPTION_KEY` in production
2. Backup encryption key securely
3. Use key rotation strategy for security

### Development Environment Issues

#### Port Already in Use

**Problem**: Port 3000 is busy

```
Error: Port 3000 is already in use
```

**Solutions**:

```bash
# Kill process using port
sudo lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

#### Node Version Mismatch

**Problem**: Node.js version incompatibility

```
Error: The engine "node" is incompatible
```

**Solutions**:

```bash
# Check version
node --version

# Use nvm to switch versions
nvm use 18
nvm install 18.17.0
```

### Getting Help

1. **Check logs**:

   ```bash
   # Development logs
   npm run dev

   # Production logs
   pm2 logs astral-core-v7
   ```

2. **Database logs**:

   ```bash
   # PostgreSQL logs
   tail -f /var/log/postgresql/postgresql-14-main.log
   ```

3. **Performance monitoring**:
   - Use Vercel Analytics for web vitals
   - Monitor database performance with pgAdmin
   - Set up error tracking with Sentry

## 📚 API Documentation

Comprehensive API documentation is available at:

- **Development**: http://localhost:3000/api/docs
- **Interactive Docs**: [View API Documentation](./docs/README.md)
- **OpenAPI Spec**: [docs/api/openapi.yaml](./docs/api/openapi.yaml)

### API Structure

All API routes follow RESTful conventions:

- `/api/auth/*` - Authentication and MFA
- `/api/user/*` - User profiles and settings
- `/api/wellness/*` - Wellness tracking and analytics
- `/api/appointments/*` - Session scheduling
- `/api/crisis/*` - Crisis assessment and intervention
- `/api/therapist/*` - Therapist-specific features
- `/api/admin/*` - Administrative functions
- `/api/payments/*` - Stripe integration
- `/api/files/*` - Secure file management
- `/api/notifications/*` - Real-time notifications

## 🔐 Security & Compliance

### HIPAA Compliance

- **PHI Encryption**: All Protected Health Information encrypted at rest
- **Audit Logging**: Comprehensive activity tracking
- **Access Controls**: Role-based permissions
- **Data Retention**: Configurable retention policies
- **Secure Transmission**: TLS 1.3 for all connections

### Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **Database Security**: Use connection pooling and SSL
3. **API Security**: Implement rate limiting and input validation
4. **Session Management**: Secure session handling with timeouts
5. **File Upload**: Virus scanning and type validation
6. **Monitoring**: Real-time security event logging

## 🤝 Contributing

This is a private project. All contributions must follow:

1. **HIPAA Compliance Guidelines**
2. **Code Review Process**
3. **Security Assessment**
4. **Testing Requirements**

### Development Workflow

1. Create feature branch from `main`
2. Implement changes with tests
3. Run full test suite: `npm run test:ci`
4. Submit pull request with description
5. Pass security review
6. Deploy to staging for validation

## 📄 License

**Proprietary** - All rights reserved  
Copyright (c) 2024 Astral Core

## 📊 Version Information

- **Current Version**: v7.0.0
- **Release Date**: January 2024
- **Node.js**: 18.17+ required
- **Next.js**: 15.5.2
- **Database**: PostgreSQL 14+

---

## 🆘 Crisis Support

**If you are in crisis or having thoughts of self-harm:**

- **Call 911** for immediate emergency assistance
- **Call 988** for the Suicide & Crisis Lifeline (24/7)
- **Text HOME to 741741** for Crisis Text Line

**Help is always available. You matter, and your life has value.**
