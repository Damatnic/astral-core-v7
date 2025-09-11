# Astral Core v7 - Comprehensive Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
4. [Docker Deployment](#docker-deployment)
5. [Database Configuration](#database-configuration)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Production Best Practices](#production-best-practices)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Security Checklist](#security-checklist)

---

## Prerequisites

Before deploying Astral Core v7, ensure you have:

### Required Accounts & Services
- **Vercel Account** (for hosting) - [Sign up](https://vercel.com)
- **PostgreSQL Database** - Choose one:
  - Vercel Postgres (recommended for Vercel deployment)
  - Supabase Database
  - Neon Database
  - AWS RDS PostgreSQL
  - Google Cloud SQL PostgreSQL
- **GitHub Repository** with your code
- **Domain Name** (for production)

### Development Environment
- **Node.js**: Version 18.17+ ([Download](https://nodejs.org/))
- **npm**: Version 9+ (comes with Node.js)
- **Git**: For version control
- **PostgreSQL Client**: For local database management

---

## Environment Setup

### 1. Generate Required Secrets

Before deployment, generate the required cryptographic keys:

```bash
# Generate NextAuth secret (32 characters)
openssl rand -base64 32

# Generate encryption key for PHI data (64 hex characters)
openssl rand -hex 32

# Generate JWT signing key (32 characters)
openssl rand -base64 32
```

**Important:** Save these keys securely - you'll need them for all environments.

### 2. Environment Variables

Create environment variables for each deployment stage:

#### Development (.env.local)
```bash
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://username:password@localhost:5432/astralcore_dev
```

#### Staging (.env.staging)
```bash
NODE_ENV=staging
NEXTAUTH_URL=https://staging.astral-core.app
NEXT_PUBLIC_APP_URL=https://staging.astral-core.app
DATABASE_URL=postgresql://username:password@staging-db:5432/astralcore_staging
```

#### Production (.env.production)
```bash
NODE_ENV=production
NEXTAUTH_URL=https://app.astral-core.com
NEXT_PUBLIC_APP_URL=https://app.astral-core.com
DATABASE_URL=postgresql://username:password@prod-db:5432/astralcore_prod?sslmode=require
```

---

## Vercel Deployment (Recommended)

Vercel provides the best Next.js deployment experience with automatic builds and scaling.

### Step 1: Prepare Your Repository

1. **Push your code** to GitHub/GitLab/Bitbucket
2. **Ensure your code builds locally**:
   ```bash
   npm run build
   ```

### Step 2: Connect to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "Add New..." → "Project"**
3. **Import your Git repository**
4. **Configure build settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install`

### Step 3: Database Setup

#### Option A: Vercel Postgres (Recommended)
1. **In Vercel Dashboard**, go to **Storage** → **Create Database**
2. **Choose "Postgres"**
3. **Copy the connection string** from the dashboard
4. **Add to environment variables** as `DATABASE_URL`

#### Option B: External Database (Supabase/Neon)
1. **Create database** on your chosen provider
2. **Copy connection string**
3. **Add to Vercel environment variables**

### Step 4: Configure Environment Variables

In your Vercel project settings:

1. **Go to Settings** → **Environment Variables**
2. **Add the following variables**:

```bash
# Database
DATABASE_URL=your_postgres_connection_string
DIRECT_URL=your_postgres_connection_string

# Authentication
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_generated_secret_here

# Security
ENCRYPTION_KEY=your_generated_encryption_key_here
JWT_SIGNING_KEY=your_generated_jwt_key_here

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Astral Core
NODE_ENV=production

# Optional: OAuth (if needed)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional: Stripe (if using payments)
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Step 5: Deploy

1. **Click "Deploy"** in Vercel dashboard
2. **Wait for build to complete** (usually 2-5 minutes)
3. **Visit your deployed app** at the provided URL

### Step 6: Database Migration

After deployment, run database migrations:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Run migrations**:
   ```bash
   vercel env pull .env.local
   npm run db:migrate:prod
   ```

### Step 7: Custom Domain (Optional)

1. **In Vercel Settings** → **Domains**
2. **Add your custom domain**
3. **Update DNS records** as instructed
4. **Update environment variables** to use your custom domain

---

## Docker Deployment

For self-hosted deployments, use the provided Docker configuration.

### Step 1: Prepare Environment

1. **Create production environment file**:
   ```bash
   cp .env.example .env.production
   # Edit with production values
   ```

2. **Update docker-compose.prod.yml**:
   ```yaml
   version: '3.8'
   services:
     app:
       build:
         context: .
         dockerfile: Dockerfile
         target: production
       container_name: astral-core-prod
       restart: unless-stopped
       ports:
         - "3000:3000"
       env_file:
         - .env.production
       depends_on:
         - db
       networks:
         - astral-network

     db:
       image: postgres:14-alpine
       container_name: astral-core-db-prod
       restart: unless-stopped
       environment:
         POSTGRES_DB: astralcore_prod
         POSTGRES_USER: ${DATABASE_USER}
         POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
       volumes:
         - postgres_prod_data:/var/lib/postgresql/data
       networks:
         - astral-network

     nginx:
       image: nginx:alpine
       container_name: astral-core-nginx
       restart: unless-stopped
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf:ro
         - ./ssl:/etc/nginx/ssl:ro
       depends_on:
         - app
       networks:
         - astral-network

   volumes:
     postgres_prod_data:
   
   networks:
     astral-network:
       driver: bridge
   ```

### Step 2: Build and Deploy

1. **Build production image**:
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Start services**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Run database migrations**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec app npm run db:migrate:prod
   ```

### Step 3: SSL Configuration

Create `nginx.conf` for SSL termination:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## Database Configuration

### PostgreSQL Setup

#### 1. Database Creation

```sql
-- Connect as superuser
CREATE DATABASE astralcore_prod;
CREATE USER astral_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE astralcore_prod TO astral_user;

-- Set up extensions
\c astralcore_prod;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

#### 2. Connection Security

For production databases, always use SSL:

```bash
DATABASE_URL="postgresql://username:password@hostname:5432/database?sslmode=require"
```

#### 3. Connection Pooling

For high-traffic applications, use connection pooling:

```bash
# PgBouncer example
DATABASE_URL="postgresql://username:password@pgbouncer-host:6432/database"
DIRECT_URL="postgresql://username:password@postgres-host:5432/database"
```

### Database Migration Strategy

#### Development to Production

1. **Test migrations in staging**:
   ```bash
   # In staging environment
   npm run db:migrate
   ```

2. **Backup production database**:
   ```bash
   pg_dump -h prod-host -U username -d database > backup-$(date +%Y%m%d).sql
   ```

3. **Deploy migrations**:
   ```bash
   # In production environment
   npm run db:migrate:prod
   ```

4. **Verify data integrity**:
   ```bash
   npm run db:studio
   ```

---

## Environment Variables Reference

### Core Application Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Application environment | Yes | `production` |
| `NEXTAUTH_URL` | Base URL for authentication | Yes | `https://app.astral-core.com` |
| `NEXT_PUBLIC_APP_URL` | Public application URL | Yes | `https://app.astral-core.com` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host:5432/db` |

### Security Variables

| Variable | Description | Required | Generation |
|----------|-------------|----------|-----------|
| `NEXTAUTH_SECRET` | NextAuth session encryption | Yes | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | PHI data encryption | Yes | `openssl rand -hex 32` |
| `JWT_SIGNING_KEY` | API token signing | Yes | `openssl rand -base64 32` |
| `SESSION_TIMEOUT_MINUTES` | Session duration | No | `15` (production) |

### Optional Service Variables

| Variable | Description | Required | Notes |
|----------|-------------|----------|--------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No | For Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | No | Keep secure |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | No | For payments |
| `STRIPE_SECRET_KEY` | Stripe secret key | No | Keep secure |
| `SENTRY_DSN` | Error monitoring | No | For error tracking |

### Feature Flags

| Variable | Description | Default | Production |
|----------|-------------|---------|------------|
| `ENABLE_CRISIS_INTERVENTION` | Crisis support features | `true` | `true` |
| `REQUIRE_MFA` | Multi-factor authentication | `false` | `true` |
| `PHI_ENCRYPTION_ENABLED` | Encrypt sensitive data | `true` | `true` |
| `AUDIT_LOG_RETENTION_DAYS` | Audit log retention | `2555` | `2555` |

---

## Production Best Practices

### 1. Security Configuration

#### Environment Variables Security
- **Never commit** secrets to version control
- **Use different keys** for each environment
- **Store production secrets** in secure vault services
- **Rotate keys regularly** (quarterly recommended)

#### Application Security
```bash
# Production security settings
REQUIRE_MFA=true
SESSION_TIMEOUT_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=50
PHI_ENCRYPTION_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555
```

#### SSL/TLS Configuration
- **Use HTTPS only** in production
- **Enable HSTS headers**
- **Configure proper SSL certificates**
- **Use secure cookie settings**

### 2. Performance Optimization

#### Database Optimization
```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_user_email ON "User"(email);
CREATE INDEX CONCURRENTLY idx_wellness_user_date ON "WellnessEntry"(user_id, date);
CREATE INDEX CONCURRENTLY idx_appointment_date ON "Appointment"(scheduled_for);
```

#### Application Optimization
- **Enable gzip compression**
- **Use CDN for static assets**
- **Implement proper caching headers**
- **Optimize image delivery**

#### Monitoring Setup
```bash
# Environment variables for monitoring
SENTRY_DSN=your_sentry_dsn
POSTHOG_KEY=your_posthog_key
```

### 3. Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d)
pg_dump $DATABASE_URL > backups/astralcore-$DATE.sql
aws s3 cp backups/astralcore-$DATE.sql s3://your-backup-bucket/
```

#### File Backups
- **Backup user uploads** regularly
- **Store backups** in different geographic locations
- **Test restore procedures** monthly

### 4. Scaling Considerations

#### Horizontal Scaling
- **Use load balancer** for multiple instances
- **Implement session store** (Redis) for shared sessions
- **Use CDN** for static asset distribution

#### Database Scaling
- **Implement read replicas** for high read loads
- **Use connection pooling** (PgBouncer)
- **Monitor query performance** regularly

---

## Monitoring and Maintenance

### 1. Health Monitoring

#### Application Health Checks
The application includes built-in health endpoints:

- **Basic Health**: `GET /api/health`
- **Database Health**: `GET /api/health/database`
- **Detailed Status**: `GET /api/health/detailed`

#### Monitoring Setup with Vercel
1. **Enable Vercel Analytics** in dashboard
2. **Set up custom monitoring**:
   ```javascript
   // pages/api/health/monitor.js
   export default async function handler(req, res) {
     // Check database connection
     // Check external services
     // Return status
   }
   ```

### 2. Error Tracking

#### Sentry Integration
```bash
# Environment variables
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
```

#### Custom Error Handling
```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function logError(error: Error, context?: any) {
  Sentry.captureException(error, {
    extra: context
  });
}
```

### 3. Performance Monitoring

#### Key Metrics to Track
- **Response times** for critical endpoints
- **Database query performance**
- **Memory usage** and CPU utilization
- **Error rates** and user satisfaction
- **Core Web Vitals** (LCP, FID, CLS)

#### Alerting Setup
```bash
# Set up alerts for:
# - Response time > 2 seconds
# - Error rate > 1%
# - Database connection failures
# - SSL certificate expiration
```

### 4. Maintenance Tasks

#### Daily Tasks
- **Monitor error logs** and alerts
- **Check system performance** metrics
- **Verify backup completion**

#### Weekly Tasks
- **Review security logs** for anomalies
- **Update dependencies** with security patches
- **Performance optimization** review

#### Monthly Tasks
- **Security audit** and penetration testing
- **Backup restore testing**
- **Dependency vulnerability** scanning
- **SSL certificate** renewal check

---

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**Problem**: TypeScript compilation errors
```bash
Error: Type errors found
```

**Solution**:
```bash
# Run type checking locally
npm run typecheck

# Fix type errors before deployment
# Check tsconfig.json configuration
```

**Problem**: Missing environment variables
```bash
Error: NEXTAUTH_SECRET is required
```

**Solution**:
1. Verify all required environment variables are set
2. Check variable names for typos
3. Ensure secrets are properly generated

#### Database Connection Issues

**Problem**: Unable to connect to database
```bash
Error: P1001: Can't reach database server
```

**Solutions**:
1. **Verify connection string** format
2. **Check database server** is running
3. **Verify network access** and firewall rules
4. **Test connection** with database client

**Problem**: Migration failures
```bash
Error: Migration failed to apply
```

**Solutions**:
1. **Check database permissions**
2. **Verify schema changes** are compatible
3. **Run migrations manually** with detailed output
4. **Restore from backup** if necessary

#### Runtime Errors

**Problem**: 500 Internal Server Error
```bash
Error: Unexpected token in JSON
```

**Solutions**:
1. **Check application logs** for detailed errors
2. **Verify environment variables** are correctly set
3. **Test API endpoints** individually
4. **Check database connectivity**

### Performance Issues

#### Slow Database Queries

**Diagnosis**:
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
```

**Solutions**:
```sql
-- Add indexes for slow queries
CREATE INDEX CONCURRENTLY idx_slow_query ON table_name(column_name);

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM table_name WHERE condition;
```

#### High Memory Usage

**Diagnosis**:
```bash
# Monitor memory usage
docker stats
# or for Vercel
vercel logs --follow
```

**Solutions**:
- **Optimize database queries** to reduce memory
- **Implement pagination** for large datasets
- **Use lazy loading** for heavy components
- **Increase instance size** if necessary

### Security Issues

#### Rate Limiting Triggered

**Problem**: Users getting 429 errors
```bash
Status: 429 - Rate limit exceeded
```

**Solutions**:
1. **Review rate limit settings**:
   ```bash
   RATE_LIMIT_MAX_REQUESTS=100  # Increase if needed
   ```
2. **Implement user-specific** rate limiting
3. **Use Redis** for distributed rate limiting
4. **Add retry logic** with exponential backoff

#### SSL Certificate Issues

**Problem**: SSL certificate expired
```bash
Error: SSL certificate verify failed
```

**Solutions**:
1. **Renew SSL certificate**
2. **Update certificate** in load balancer/proxy
3. **Set up automatic renewal**
4. **Monitor certificate expiration**

---

## Security Checklist

### Pre-Deployment Security

- [ ] **Environment Variables**
  - [ ] All secrets use strong, randomly generated values
  - [ ] No secrets committed to version control
  - [ ] Different keys for each environment
  - [ ] Secrets stored in secure vault services

- [ ] **Database Security**
  - [ ] Database uses SSL/TLS connections
  - [ ] Strong database passwords
  - [ ] Limited database user permissions
  - [ ] Database firewall rules configured

- [ ] **Application Security**
  - [ ] HTTPS enforced for all connections
  - [ ] Security headers configured
  - [ ] Input validation implemented
  - [ ] Rate limiting enabled

### Post-Deployment Security

- [ ] **Monitoring**
  - [ ] Error tracking configured (Sentry)
  - [ ] Security event logging enabled
  - [ ] Audit trail functional
  - [ ] Performance monitoring active

- [ ] **Access Control**
  - [ ] Admin access restricted
  - [ ] MFA enabled for sensitive accounts
  - [ ] Role-based permissions working
  - [ ] Session management secure

- [ ] **Data Protection**
  - [ ] PHI encryption verified
  - [ ] Backup encryption enabled
  - [ ] Data retention policies active
  - [ ] GDPR/HIPAA compliance verified

### Ongoing Security

- [ ] **Regular Updates**
  - [ ] Dependencies updated weekly
  - [ ] Security patches applied immediately
  - [ ] SSL certificates monitored
  - [ ] Vulnerability scans monthly

- [ ] **Incident Response**
  - [ ] Security incident plan documented
  - [ ] Contact information updated
  - [ ] Backup restoration tested
  - [ ] Recovery procedures validated

---

## Support and Resources

### Documentation
- **API Documentation**: [/docs/README.md](./docs/README.md)
- **Troubleshooting Guide**: [/docs/troubleshooting.md](./docs/troubleshooting.md)
- **Environment Guides**: [/docs/environments/](./docs/environments/)

### External Resources
- **Next.js Deployment**: [https://nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Vercel Documentation**: [https://vercel.com/docs](https://vercel.com/docs)
- **PostgreSQL Setup**: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)
- **HIPAA Compliance**: [https://www.hhs.gov/hipaa/](https://www.hhs.gov/hipaa/)

### Emergency Contacts
- **Technical Issues**: Check application logs and error monitoring
- **Security Issues**: Follow incident response plan
- **Database Issues**: Contact database administrator

---

## Changelog

### Version 7.0.0 (January 2024)
- Complete rewrite with Next.js 15
- HIPAA-compliant architecture
- Enhanced security features
- Docker containerization
- Comprehensive monitoring

---

**Copyright (c) 2024 Astral Core. All rights reserved.**