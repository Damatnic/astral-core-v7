# Vercel Environment Variables Configuration Guide

## Overview
This guide provides complete environment variable setup for Vercel deployment of Astral Core v7.

## Required Environment Variables for Vercel

### 🔥 Critical Production Variables
These MUST be set for deployment to work:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://username:password@host:port/database"

# Authentication
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="32-char-base64-secret"

# Security Keys
ENCRYPTION_KEY="64-char-hex-key"
JWT_SIGNING_KEY="32-char-base64-key"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

### 🛠️ Build-Time Variables
Set these in Vercel dashboard:

```bash
# Build Optimization
NEXT_TELEMETRY_DISABLED="1"
SKIP_ENV_VALIDATION="1"
PRISMA_SKIP_POSTINSTALL_GENERATE="1"
PRISMA_GENERATE_SKIP_AUTOINSTALL="true"
SKIP_TYPE_CHECK="true"

# Performance
NODE_OPTIONS="--max-old-space-size=8192"
NEXT_SHARP="0"
NEXT_BUNDLE_ANALYZE="false"
```

### 📦 Prisma Configuration
For Vercel Edge compatibility:

```bash
# Prisma Engine
PRISMA_CLI_QUERY_ENGINE_TYPE="binary"
PRISMA_CLIENT_ENGINE_TYPE="binary"

# Database Connection
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:pass@host:5432/db"
```

## Quick Setup Commands

### 1. Generate Required Secrets
```bash
# NextAuth Secret
openssl rand -base64 32

# Encryption Key for PHI
openssl rand -hex 32

# JWT Signing Key
openssl rand -base64 32
```

### 2. Vercel CLI Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add ENCRYPTION_KEY
vercel env add JWT_SIGNING_KEY
```

### 3. Database Setup (Vercel Postgres)
```bash
# Create Vercel Postgres database
vercel postgres create astral-core-v7

# Get connection strings
vercel env pull .env.vercel

# Run migrations
vercel env add DIRECT_URL
npx prisma migrate deploy
```

## Environment Variable Categories

### 🔐 Security (Required)
- `NEXTAUTH_SECRET` - Session encryption
- `ENCRYPTION_KEY` - PHI data encryption
- `JWT_SIGNING_KEY` - API token signing
- `RATE_LIMIT_MAX_REQUESTS` - DDoS protection

### 🗄️ Database (Required)
- `DATABASE_URL` - Main connection (with pooling)
- `DIRECT_URL` - Direct connection (for migrations)

### 🎯 Application (Required)
- `NEXTAUTH_URL` - Auth callback URL
- `NEXT_PUBLIC_APP_URL` - Public app URL
- `NODE_ENV` - Environment mode

### 📧 Email (Optional)
- `EMAIL_FROM` - Sender address
- `RESEND_API_KEY` - Email service
- `EMAIL_PROVIDER` - Service type

### 💳 Payments (Optional)
- `STRIPE_PUBLISHABLE_KEY` - Client-side key
- `STRIPE_SECRET_KEY` - Server-side key
- `STRIPE_WEBHOOK_SECRET` - Webhook verification

### 📊 Monitoring (Optional)
- `SENTRY_DSN` - Error tracking
- `POSTHOG_KEY` - Analytics

## Vercel-Specific Optimizations

### Connection Pooling
For Vercel serverless functions, use PgBouncer:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1"
```

### Build Performance
```bash
NODE_OPTIONS="--max-old-space-size=8192 --max-http-header-size=32768"
NEXT_TELEMETRY_DISABLED="1"
SKIP_TYPE_CHECK="true"
```

### Prisma Edge Compatibility
```bash
PRISMA_SKIP_POSTINSTALL_GENERATE="1"
PRISMA_GENERATE_SKIP_AUTOINSTALL="true"
```

## Deployment Checklist

### Pre-deployment
- [ ] All required environment variables set in Vercel dashboard
- [ ] Database connection strings tested
- [ ] Secrets generated with proper entropy
- [ ] Domain configured in NEXTAUTH_URL and NEXT_PUBLIC_APP_URL

### Post-deployment
- [ ] Database migrations applied
- [ ] Health check endpoint responds
- [ ] Authentication flow tested
- [ ] Error monitoring configured
- [ ] Performance monitoring active

## Troubleshooting

### Build Failures
1. **Prisma generation fails**: Ensure `PRISMA_GENERATE_SKIP_AUTOINSTALL="true"`
2. **Out of memory**: Increase `NODE_OPTIONS="--max-old-space-size=8192"`
3. **TypeScript errors**: Set `SKIP_TYPE_CHECK="true"`

### Runtime Issues
1. **Database connection**: Check connection limits and pooling
2. **Authentication**: Verify NEXTAUTH_URL matches domain
3. **CORS errors**: Ensure proper domain configuration

### Performance Issues
1. **Cold starts**: Use connection pooling
2. **Memory usage**: Optimize NODE_OPTIONS
3. **Build time**: Enable build optimizations

## Security Best Practices

### Secret Management
- Use Vercel's encrypted environment variables
- Rotate secrets quarterly
- Different secrets per environment
- Never commit secrets to code

### Database Security
- Use read-only replicas where possible
- Enable connection pooling
- Set appropriate connection limits
- Regular security audits

### HIPAA Compliance
- Enable PHI encryption: `PHI_ENCRYPTION_ENABLED="true"`
- Set audit retention: `AUDIT_LOG_RETENTION_DAYS="2555"`
- Require MFA in production: `REQUIRE_MFA="true"`

## Production Checklist

### Required for Launch
- [ ] Database: Postgres with SSL
- [ ] Authentication: NextAuth configured
- [ ] Encryption: PHI encryption enabled
- [ ] Monitoring: Error tracking active
- [ ] Security: Rate limiting configured
- [ ] Compliance: Audit logging enabled

### Performance Optimization
- [ ] Connection pooling enabled
- [ ] CDN configured
- [ ] Image optimization active
- [ ] Bundle analysis completed
- [ ] Core Web Vitals monitored

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Prisma Edge**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- **NextAuth**: https://next-auth.js.org/configuration/options
- **Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables