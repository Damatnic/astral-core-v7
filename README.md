# Astral Core v7 🧠

**A HIPAA-compliant mental health platform built with Next.js 15, TypeScript, and PostgreSQL**

Astral Core v7 is a complete rewrite of our mental health platform, featuring enterprise-grade security, modern architecture, and comprehensive wellness tracking capabilities. Designed for therapists, clients, and healthcare organizations with strict compliance requirements.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue?logo=postgresql)](https://postgresql.org)
[![HIPAA](https://img.shields.io/badge/HIPAA-Compliant-green)](https://www.hhs.gov/hipaa/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

---

## ✨ Key Features

### 🔐 Security & Compliance
- **HIPAA-Compliant Architecture**: End-to-end encryption for all Protected Health Information (PHI)
- **Advanced Authentication**: NextAuth.js with OAuth, MFA, and session management
- **Audit Logging**: Comprehensive activity tracking for compliance requirements
- **Role-Based Access Control**: Granular permissions for different user types
- **Data Encryption**: AES-256-GCM encryption for sensitive data at rest

### 🏥 Clinical Features
- **Therapy Management**: Session notes, treatment plans, and progress tracking
- **Crisis Intervention**: 24/7 crisis assessment and response system
- **Wellness Tracking**: Comprehensive mood, sleep, and mental health monitoring
- **Treatment Planning**: Collaborative care planning with automated reminders
- **Clinical Analytics**: Insights and reporting for treatment effectiveness

### 💻 Technical Excellence
- **Modern Architecture**: Built with Next.js 15, TypeScript, and App Router
- **Real-time Features**: WebSocket-powered notifications and live updates
- **Progressive Web App**: Mobile-optimized experience with offline capabilities
- **Payment Processing**: Secure Stripe integration for subscription management
- **File Management**: Encrypted document storage with virus scanning
- **API-First Design**: RESTful APIs with comprehensive documentation

---

## 🛠️ Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|----------|
| **Next.js** | 15.5.2 | Full-stack React framework with App Router |
| **TypeScript** | 5.0+ | Type-safe development with strict mode |
| **React** | 19.1.0 | User interface library |
| **Node.js** | 18.17+ | Server runtime environment |

### Database & ORM
| Technology | Version | Purpose |
|------------|---------|----------|
| **PostgreSQL** | 14+ | Primary database with ACID compliance |
| **Prisma** | 6.15.0 | Type-safe database ORM and migrations |
| **Redis** | 7+ | Session storage and caching |

### Authentication & Security
| Technology | Version | Purpose |
|------------|---------|----------|
| **NextAuth.js** | 4.24.11 | Authentication with OAuth providers |
| **bcryptjs** | 3.0.2 | Password hashing |
| **jsonwebtoken** | 9.0.2 | JWT token management |
| **Speakeasy** | 2.0.0 | Two-factor authentication (TOTP) |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|----------|
| **Tailwind CSS** | 4.0 | Utility-first CSS framework |
| **Headless UI** | 2.2.7 | Accessible UI components |
| **Heroicons** | 2.2.0 | SVG icon library |
| **Lucide React** | 0.543.0 | Additional icon set |

### State Management & Utils
| Technology | Version | Purpose |
|------------|---------|----------|
| **Zustand** | 5.0.8 | Lightweight state management |
| **React Hot Toast** | 2.6.0 | Toast notifications |
| **date-fns** | 4.1.0 | Date manipulation utilities |
| **Zod** | 4.1.5 | Runtime type validation |

### Payment & External Services
| Technology | Version | Purpose |
|------------|---------|----------|
| **Stripe** | 18.5.0 | Payment processing |
| **Socket.io** | 4.8.1 | Real-time communication |
| **Sharp** | 0.34.3 | Image optimization |
| **QRCode** | 1.5.4 | QR code generation for MFA |

### Development & Testing
| Technology | Version | Purpose |
|------------|---------|----------|
| **Jest** | 30.1.3 | Testing framework |
| **Testing Library** | 16.3.0 | React component testing |
| **ESLint** | 9.0 | Code linting |
| **Prettier** | 3.6.2 | Code formatting |
| **Husky** | 9.1.7 | Git hooks |

### Deployment & DevOps
| Technology | Version | Purpose |
|------------|---------|----------|
| **Docker** | Latest | Containerization |
| **Vercel** | Latest | Hosting and deployment |
| **GitHub Actions** | Latest | CI/CD pipeline |

---

## 🚀 Quick Start Guide

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

---

## 📁 Project Architecture

```
astral-core-v7/
├── 📂 src/
│   ├── 📂 app/                    # Next.js 15 App Router
│   │   ├── 📂 (auth)/            # Authentication routes
│   │   ├── 📂 (dashboard)/       # Dashboard routes
│   │   ├── 📂 api/              # API endpoints
│   │   ├── 📂 globals.css       # Global styles
│   │   └── 📂 layout.tsx        # Root layout
│   │
│   ├── 📂 components/            # React Components
│   │   ├── 📂 ui/               # Base UI components (buttons, inputs)
│   │   ├── 📂 forms/            # Form components
│   │   ├── 📂 layouts/          # Layout components
│   │   ├── 📂 auth/             # Authentication components
│   │   ├── 📂 dashboard/        # Dashboard-specific components
│   │   ├── 📂 therapy/          # Therapy management components
│   │   ├── 📂 wellness/         # Wellness tracking components
│   │   └── 📂 crisis/           # Crisis intervention components
│   │
│   ├── 📂 lib/                   # Core Utilities
│   │   ├── 📂 auth/             # Authentication configuration
│   │   ├── 📂 db/               # Database client & utilities
│   │   ├── 📂 security/         # Security utilities & encryption
│   │   ├── 📂 services/         # Business logic services
│   │   ├── 📂 types/            # TypeScript type definitions
│   │   ├── 📂 constants/        # Application constants
│   │   ├── 📂 utils/            # Helper utilities
│   │   └── 📂 validations/      # Zod validation schemas
│   │
│   ├── 📂 hooks/                 # Custom React Hooks
│   │   ├── 📄 useAuth.ts        # Authentication hook
│   │   ├── 📄 useWellness.ts    # Wellness tracking hook
│   │   └── 📄 useTherapy.ts     # Therapy management hook
│   │
│   ├── 📂 store/                 # Zustand State Management
│   │   ├── 📄 authStore.ts      # Authentication state
│   │   ├── 📄 uiStore.ts        # UI state
│   │   └── 📄 wellnessStore.ts  # Wellness data state
│   │
│   └── 📄 middleware.ts          # Next.js middleware
│
├── 📂 prisma/                    # Database Schema
│   ├── 📄 schema.prisma         # Database schema definition
│   ├── 📂 migrations/           # Database migrations
│   └── 📄 seed.ts               # Database seeding script
│
├── 📂 public/                    # Static Assets
│   ├── 📂 images/               # Image assets
│   ├── 📂 icons/                # Icon assets
│   └── 📄 favicon.ico           # Favicon
│
├── 📂 docs/                      # Documentation
│   ├── 📄 README.md             # Comprehensive docs
│   ├── 📄 API.md                # API documentation
│   └── 📂 examples/             # Usage examples
│
├── 📂 scripts/                   # Utility Scripts
│   ├── 📄 docker-entrypoint.sh  # Docker startup script
│   └── 📄 setup-dev.sh          # Development setup
│
├── 📂 tests/                     # Test Files
│   ├── 📂 __tests__/            # Unit tests
│   ├── 📂 fixtures/             # Test data
│   └── 📄 setup.ts              # Test setup
│
├── 📄 package.json               # Dependencies
├── 📄 tsconfig.json              # TypeScript config
├── 📄 tailwind.config.ts         # Tailwind CSS config
├── 📄 next.config.ts             # Next.js configuration
├── 📄 Dockerfile                 # Docker configuration
├── 📄 docker-compose.yml         # Docker Compose setup
├── 📄 .env.example               # Environment template
└── 📄 DEPLOYMENT_GUIDE.md        # Deployment instructions
```

---

## 🔒 Security & Compliance Features

### HIPAA Compliance
- ✅ **PHI Encryption**: All Protected Health Information encrypted with AES-256-GCM
- ✅ **Audit Logging**: Comprehensive audit trail with 7-year retention
- ✅ **Access Controls**: Role-based permissions with principle of least privilege
- ✅ **Data Integrity**: Checksums and validation for all sensitive data
- ✅ **Backup Encryption**: Encrypted backups with geographic distribution
- ✅ **Business Associate Agreements**: Ready for BAA compliance

### Application Security
- 🛡️ **Authentication**: Multi-factor authentication (TOTP) support
- 🛡️ **Session Management**: Secure sessions with automatic timeout
- 🛡️ **Rate Limiting**: Advanced protection against brute force and DDoS
- 🛡️ **Input Validation**: Comprehensive sanitization and validation
- 🛡️ **SQL Injection Protection**: Parameterized queries with Prisma ORM
- 🛡️ **XSS Prevention**: Content Security Policy and output encoding

### Network Security
- 🔐 **TLS 1.3**: End-to-end encryption for all communications
- 🔐 **HSTS**: HTTP Strict Transport Security headers
- 🔐 **CORS**: Properly configured cross-origin resource sharing
- 🔐 **Security Headers**: Comprehensive security header implementation
- 🔐 **API Security**: JWT tokens with refresh rotation
- 🔐 **Firewall Rules**: Network-level protection and monitoring

---

## 👥 User Roles & Permissions

| Role | Description | Key Permissions | Access Level |
|------|-------------|----------------|---------------|
| **CLIENT** | Individuals seeking mental health services | - View own data<br>- Schedule appointments<br>- Complete assessments<br>- Access wellness tools | Personal Data Only |
| **THERAPIST** | Licensed mental health professionals | - Manage client sessions<br>- Create treatment plans<br>- Access client records<br>- Generate reports | Assigned Clients |
| **SUPERVISOR** | Clinical supervisors and managers | - Oversee therapists<br>- Review treatment plans<br>- Access aggregated data<br>- Manage clinical workflows | Department/Team |
| **CRISIS_RESPONDER** | Specialized crisis intervention staff | - Access crisis assessments<br>- Manage emergency contacts<br>- Override normal restrictions<br>- Emergency interventions | Crisis-Related Data |
| **ADMIN** | System administrators | - User management<br>- System configuration<br>- Audit log access<br>- Compliance reporting | Full System Access |
| **BILLING** | Billing and insurance staff | - Payment processing<br>- Insurance claims<br>- Financial reporting<br>- Billing records | Financial Data Only |

---

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

---

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

---

## 🚀 Deployment Options

### Quick Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-org%2Fastral-core-v7)

1. **Click "Deploy with Vercel"** above
2. **Connect your database** (Vercel Postgres recommended)
3. **Set environment variables** from `.env.example`
4. **Deploy automatically** with zero configuration

### Other Deployment Options

**📋 Complete Deployment Guide**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

#### Local Development Deployment

```bash
# Start development server
npm run dev

# Build and test production locally
npm run build
npm run start
```

#### Docker Deployment

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

---

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

---

## 📚 Documentation & Resources

### API Documentation
- 🔗 **Interactive API Docs**: [View Documentation](./docs/README.md)
- 🔗 **OpenAPI Specification**: [docs/api/openapi.yaml](./docs/api/openapi.yaml)
- 🔗 **Development Server**: http://localhost:3000/api/docs
- 🔗 **Postman Collection**: [Download Collection](./docs/api/Astral-Core-v7.postman_collection.json)

### Development Guides
- 📖 **Getting Started**: [Quick Start](#-quick-start-guide)
- 📖 **Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- 📖 **Troubleshooting**: [docs/troubleshooting.md](./docs/troubleshooting.md)
- 📖 **Environment Setup**: [docs/environments/](./docs/environments/)
- 📖 **API Examples**: [docs/examples/](./docs/examples/)

### Architecture Documentation
- 🏗️ **System Architecture**: [docs/architecture.md](./docs/architecture.md)
- 🏗️ **Database Schema**: [View in Prisma Studio](http://localhost:5555)
- 🏗️ **Security Model**: [docs/security.md](./docs/security.md)
- 🏗️ **Compliance Guide**: [docs/hipaa-compliance.md](./docs/hipaa-compliance.md)

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

---

## 🔐 Security & Compliance

### HIPAA Compliance Certification
- ✅ **Risk Assessment**: Annual security risk assessments
- ✅ **Physical Safeguards**: Secure data centers with access controls
- ✅ **Administrative Safeguards**: Policies and procedures documentation
- ✅ **Technical Safeguards**: Encryption, access controls, audit logs
- ✅ **Organizational Requirements**: Business Associate Agreements (BAAs)
- ✅ **Breach Notification**: Automated incident response procedures

### Security Certifications & Standards
- 🏆 **SOC 2 Type II**: Service Organization Control compliance
- 🏆 **GDPR**: European data protection regulation compliance
- 🏆 **CCPA**: California Consumer Privacy Act compliance
- 🏆 **PCI DSS**: Payment Card Industry Data Security Standard
- 🏆 **ISO 27001**: Information Security Management System

### Security Monitoring
```bash
# Security monitoring endpoints
GET /api/security/audit-logs     # View audit trail
GET /api/security/health        # Security health check
POST /api/security/incident     # Report security incident
GET /api/security/compliance    # Compliance status
```

### Data Protection Features
- 🔒 **Encryption at Rest**: AES-256-GCM for all sensitive data
- 🔒 **Encryption in Transit**: TLS 1.3 for all communications
- 🔒 **Key Management**: Hardware Security Modules (HSM)
- 🔒 **Data Anonymization**: Automatic PII redaction in logs
- 🔒 **Right to be Forgotten**: GDPR-compliant data deletion
- 🔒 **Data Residency**: Geographic data storage controls

---

## 🤝 Contributing

### Development Standards

This project follows strict development standards due to its healthcare nature:

- ✅ **HIPAA Compliance**: All changes must maintain HIPAA compliance
- ✅ **Security Review**: Security assessment required for all PRs
- ✅ **Test Coverage**: Minimum 80% test coverage required
- ✅ **Type Safety**: 100% TypeScript coverage with strict mode
- ✅ **Code Review**: All changes require peer review
- ✅ **Documentation**: All features must be documented

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Implement changes with tests
npm run test:watch  # Run tests in watch mode

# 3. Ensure code quality
npm run lint        # Check code style
npm run typecheck   # Verify TypeScript
npm run test:ci     # Run full test suite

# 4. Submit pull request
git push origin feature/your-feature-name
# Create PR with detailed description
```

### Code Quality Requirements

- 📊 **Test Coverage**: Minimum 80% coverage
- 🔍 **Linting**: ESLint with strict rules
- 📝 **TypeScript**: Strict mode with no `any` types
- 🎨 **Formatting**: Prettier for consistent code style
- 📚 **Documentation**: JSDoc comments for all functions
- 🔒 **Security**: SAST scanning with CodeQL

### Pull Request Process

1. **Branch Naming**: `feature/`, `bugfix/`, `hotfix/`, `docs/`
2. **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/)
3. **PR Template**: Use the provided template
4. **Reviews Required**: 2 approvals minimum
5. **Checks**: All CI/CD checks must pass
6. **Staging**: Deploy to staging for validation

---

## 📊 Version & Compatibility

### Current Release
- **Version**: v7.0.0
- **Release Date**: January 2024
- **Stability**: Production Ready
- **License**: Proprietary
- **Support Level**: Enterprise

### System Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Node.js** | 18.17.0 | 20.x LTS | Active LTS version |
| **npm** | 9.0.0 | 10.x | Latest stable |
| **PostgreSQL** | 14.0 | 15.x | Latest stable |
| **Redis** | 6.2 | 7.x | For session storage |
| **Memory** | 2GB RAM | 8GB RAM | For production |
| **Storage** | 10GB | 100GB | Including database |

### Browser Compatibility

| Browser | Version | Support Level |
|---------|---------|---------------|
| **Chrome** | 90+ | ✅ Full Support |
| **Firefox** | 88+ | ✅ Full Support |
| **Safari** | 14+ | ✅ Full Support |
| **Edge** | 90+ | ✅ Full Support |
| **Mobile Safari** | iOS 14+ | ✅ Full Support |
| **Chrome Mobile** | Android 8+ | ✅ Full Support |

### Dependencies

```json
{
  "engines": {
    "node": ">=18.17.0",
    "npm": ">=9.0.0"
  },
  "os": ["darwin", "linux", "win32"]
}
```

---

## 🆘 Crisis Support Resources

> **Important**: This application includes built-in crisis intervention features, but if you are in immediate danger, please contact emergency services.

### Immediate Emergency
- 🚨 **Emergency Services**: Call **911** (US) or your local emergency number
- 🚨 **Crisis Hotline**: Call **988** - Suicide & Crisis Lifeline (24/7)
- 🚨 **Crisis Text**: Text **HOME** to **741741** - Crisis Text Line
- 🚨 **International**: Visit [findahelpline.com](https://findahelpline.com)

### Crisis Features in Application
- 🔴 **Crisis Assessment**: Built-in risk assessment tools
- 🔴 **Emergency Contacts**: Automatic notification system
- 🔴 **Safety Planning**: Collaborative safety plan creation
- 🔴 **24/7 Monitoring**: Crisis responder alert system
- 🔴 **Resource Directory**: Local mental health resources

### Professional Support
- 📞 **National Suicide Prevention Lifeline**: 988
- 📞 **SAMHSA National Helpline**: 1-800-662-4357
- 📞 **Crisis Text Line**: Text HOME to 741741
- 📞 **LGBTQ+ Crisis Hotline**: 1-866-488-7386
- 📞 **Veterans Crisis Line**: 1-800-273-8255

**Remember: Help is always available. Your life has value, and recovery is possible.**

---

## 📞 Support & Contact

### Technical Support
- 📧 **Email**: support@astral-core.com
- 📚 **Documentation**: [docs/README.md](./docs/README.md)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-org/astral-core-v7/issues)
- 💬 **Community**: [Discord Server](https://discord.gg/astral-core)

### Business Inquiries
- 📧 **Sales**: sales@astral-core.com
- 📧 **Partnerships**: partnerships@astral-core.com
- 📧 **Compliance**: compliance@astral-core.com
- 📧 **Security**: security@astral-core.com

---

**Copyright © 2024 Astral Core. All rights reserved.**

*Built with ❤️ for mental health professionals and their clients.*