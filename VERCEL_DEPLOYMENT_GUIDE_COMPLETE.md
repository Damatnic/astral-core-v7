# Complete Vercel Deployment Guide for Astral Core v7

## Overview
This guide provides comprehensive instructions for deploying Astral Core v7 to Vercel with all authentication and environment configuration properly set up.

## Prerequisites
- Vercel account with CLI installed
- GitHub repository connected to Vercel
- PostgreSQL database (Vercel Postgres or external)

## 🔑 Required Environment Variables

### 1. Critical Security Variables (MUST BE SET)

```bash
# NextAuth secret for session encryption (REQUIRED)
NEXTAUTH_SECRET=zelhX05PnFJqWGXnLHP9n1cIktEDEzBq4b317GVDKQo=

# Encryption key for PHI data (REQUIRED - NEVER CHANGE AFTER PRODUCTION)
ENCRYPTION_KEY=2635448ecd67115a9650ab942040fbb24f106bd5238f45aec3dac045fb45a268

# JWT signing key for API tokens (REQUIRED)
JWT_SIGNING_KEY=Paq1zH5MQeRKy4VSE70Uu3G79qsHVExLrOSH8pFiOlU=
```

### 2. Database Configuration (AUTO-SET BY VERCEL)

```bash
# These are automatically set when you add Vercel Postgres integration
# DO NOT SET MANUALLY - Vercel will inject these
# DATABASE_URL=postgresql://username:password@hostname:port/database_name
# DIRECT_URL=postgresql://username:password@hostname:port/database_name
```

### 3. Authentication Configuration (AUTO-SET BY VERCEL)

```bash
# These are automatically set by Vercel based on your deployment URL
# DO NOT SET MANUALLY - Vercel will inject these
# NEXTAUTH_URL=https://your-app.vercel.app
# NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 4. Application Settings (REQUIRED)

```bash
# Node environment
NODE_ENV=production

# App information
NEXT_PUBLIC_APP_NAME=Astral Core
NEXT_PUBLIC_APP_VERSION=7.0.0
NEXT_PUBLIC_APP_ENV=production

# Build optimizations
SKIP_ENV_VALIDATION=1
NEXT_TELEMETRY_DISABLED=1
```

### 5. Security & Compliance Settings (REQUIRED)

```bash
# HIPAA compliance
PHI_ENCRYPTION_ENABLED=true
REQUIRE_MFA=true
AUDIT_LOG_RETENTION_DAYS=2555

# Session security
SESSION_TIMEOUT_MINUTES=15
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=50
```

### 6. Feature Flags (REQUIRED)

```bash
# Core features
ENABLE_CRISIS_INTERVENTION=true
ENABLE_AI_ASSISTANCE=false
ENABLE_VIDEO_SESSIONS=false
ENABLE_GROUP_THERAPY=false
```

### 7. Demo Accounts Configuration (OPTIONAL)

**For Production (Recommended):**
```bash
# Disable demo accounts in production
ALLOW_DEMO_ACCOUNTS=false
```

**For Staging/Demo Environment:**
```bash
# Enable demo accounts for staging/demo
ALLOW_DEMO_ACCOUNTS=true

# Demo account passwords (only needed if ALLOW_DEMO_ACCOUNTS=true)
DEMO_CLIENT_PASSWORD=hIcLhbdxVxZe8tQRSpsqOQ==
DEMO_THERAPIST_PASSWORD=CGA1JESRbe1duz4AZzXUPw==
DEMO_ADMIN_PASSWORD=ZTXfJNgXmOLofYdXap3Rvw==
DEMO_CRISIS_PASSWORD=PDLxSNu5nQxt31oy4keZFw==
DEMO_SUPERVISOR_PASSWORD=69bLeIVrzFctVCroA4RdBQ==
```

### 8. Optional Integrations

```bash
# Email delivery (optional)
EMAIL_FROM=noreply@astral-core.com
EMAIL_PROVIDER=resend
# RESEND_API_KEY=your_resend_api_key_here

# OAuth providers (optional)
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# GITHUB_ID=your_github_client_id
# GITHUB_SECRET=your_github_client_secret

# File storage (optional)
STORAGE_PROVIDER=local

# Analytics (optional)
# POSTHOG_KEY=your_posthog_key
# POSTHOG_HOST=https://app.posthog.com

# Error monitoring (optional)
# SENTRY_DSN=your_sentry_dsn
# SENTRY_AUTH_TOKEN=your_sentry_auth_token
# SENTRY_ORG=your_sentry_org
# SENTRY_PROJECT=your_sentry_project

# Payment processing (optional)
# STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
# STRIPE_SECRET_KEY=sk_live_your_secret_key
# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 🚀 Deployment Steps

### Step 1: Set Up Vercel Project

1. **Connect Repository to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Add Vercel Postgres Database:**
   - Go to your Vercel dashboard
   - Select your project
   - Go to Storage tab
   - Add Postgres database
   - This automatically sets DATABASE_URL and DIRECT_URL

### Step 2: Configure Environment Variables

**Option A: Using Vercel Dashboard (Recommended)**

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add each required variable from the list above

**Option B: Using Vercel CLI**

```bash
# Set critical security variables
vercel env add NEXTAUTH_SECRET production
vercel env add ENCRYPTION_KEY production
vercel env add JWT_SIGNING_KEY production

# Set application settings
vercel env add NODE_ENV production
vercel env add NEXT_PUBLIC_APP_NAME production
vercel env add NEXT_PUBLIC_APP_VERSION production
vercel env add NEXT_PUBLIC_APP_ENV production
vercel env add SKIP_ENV_VALIDATION production
vercel env add NEXT_TELEMETRY_DISABLED production

# Set security settings
vercel env add PHI_ENCRYPTION_ENABLED production
vercel env add REQUIRE_MFA production
vercel env add AUDIT_LOG_RETENTION_DAYS production
vercel env add SESSION_TIMEOUT_MINUTES production
vercel env add MAX_LOGIN_ATTEMPTS production
vercel env add LOCKOUT_DURATION_MINUTES production
vercel env add RATE_LIMIT_WINDOW_MS production
vercel env add RATE_LIMIT_MAX_REQUESTS production

# Set feature flags
vercel env add ENABLE_CRISIS_INTERVENTION production
vercel env add ENABLE_AI_ASSISTANCE production
vercel env add ENABLE_VIDEO_SESSIONS production
vercel env add ENABLE_GROUP_THERAPY production

# Demo accounts (choose based on environment)
vercel env add ALLOW_DEMO_ACCOUNTS production
# Only add demo passwords if ALLOW_DEMO_ACCOUNTS=true
vercel env add DEMO_CLIENT_PASSWORD production
vercel env add DEMO_THERAPIST_PASSWORD production
vercel env add DEMO_ADMIN_PASSWORD production
vercel env add DEMO_CRISIS_PASSWORD production
vercel env add DEMO_SUPERVISOR_PASSWORD production
```

### Step 3: Deploy and Verify

1. **Trigger Deployment:**
   ```bash
   vercel --prod
   ```

2. **Verify Environment Variables:**
   ```bash
   vercel env ls
   ```

3. **Check Deployment Logs:**
   ```bash
   vercel logs --follow
   ```

### Step 4: Database Migration

After successful deployment:

1. **Run Database Migrations:**
   ```bash
   # Using Vercel CLI
   vercel env pull .env.production.local
   npx prisma migrate deploy
   ```

   Or create a build script that runs migrations automatically.

### Step 5: Create Demo Accounts (Optional)

If you enabled demo accounts (`ALLOW_DEMO_ACCOUNTS=true`):

```bash
curl -X POST https://your-app.vercel.app/api/auth/demo/create
```

## 🔐 Security Checklist

- [ ] All required environment variables are set
- [ ] `NEXTAUTH_SECRET` is unique and secure (32+ chars)
- [ ] `ENCRYPTION_KEY` is unique and will never change
- [ ] `JWT_SIGNING_KEY` is unique and secure
- [ ] Database connection is secure (SSL enabled)
- [ ] Demo accounts are disabled in production (`ALLOW_DEMO_ACCOUNTS=false`)
- [ ] Rate limiting is enabled and configured
- [ ] Session timeout is appropriate (15 minutes recommended)
- [ ] MFA is required (`REQUIRE_MFA=true`)
- [ ] PHI encryption is enabled (`PHI_ENCRYPTION_ENABLED=true`)

## 🚨 Important Security Notes

1. **NEVER** commit real environment variables to version control
2. **NEVER** change `ENCRYPTION_KEY` after production deployment
3. **ALWAYS** use different secrets for different environments
4. **ROTATE** secrets regularly (quarterly recommended)
5. **USE** strong, randomly generated passwords and keys
6. **ENABLE** SSL/TLS (automatically handled by Vercel)
7. **MONITOR** access to secrets and rotate compromised keys

## 📋 Environment Variable Summary

### Production Environment (14 Required Variables)

**Auto-set by Vercel (3):**
- `DATABASE_URL` (Postgres integration)
- `DIRECT_URL` (Postgres integration)  
- `NEXTAUTH_URL` (Deployment URL)
- `NEXT_PUBLIC_APP_URL` (Deployment URL)

**Must Set in Dashboard (10):**
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `JWT_SIGNING_KEY`
- `NODE_ENV`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_VERSION`
- `NEXT_PUBLIC_APP_ENV`
- `PHI_ENCRYPTION_ENABLED`
- `REQUIRE_MFA`
- `ENABLE_CRISIS_INTERVENTION`

**Recommended Settings (11):**
- `SKIP_ENV_VALIDATION=1`
- `NEXT_TELEMETRY_DISABLED=1`
- `AUDIT_LOG_RETENTION_DAYS=2555`
- `SESSION_TIMEOUT_MINUTES=15`
- `MAX_LOGIN_ATTEMPTS=5`
- `LOCKOUT_DURATION_MINUTES=15`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX_REQUESTS=50`
- `ENABLE_AI_ASSISTANCE=false`
- `ENABLE_VIDEO_SESSIONS=false`
- `ENABLE_GROUP_THERAPY=false`

**Demo Environment Only (6 additional):**
- `ALLOW_DEMO_ACCOUNTS=true`
- `DEMO_CLIENT_PASSWORD`
- `DEMO_THERAPIST_PASSWORD`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_CRISIS_PASSWORD`
- `DEMO_SUPERVISOR_PASSWORD`

## 🔧 Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check all required environment variables are set
   - Verify database connection
   - Review build logs for specific errors

2. **Authentication Issues:**
   - Verify `NEXTAUTH_SECRET` is set
   - Check `NEXTAUTH_URL` matches deployment URL
   - Ensure database is accessible

3. **Demo Account Issues:**
   - Verify `ALLOW_DEMO_ACCOUNTS` setting
   - Check demo password environment variables
   - Ensure database connection for account creation

4. **Database Connection:**
   - Verify Postgres integration is properly configured
   - Check `DATABASE_URL` and `DIRECT_URL` are set
   - Ensure migrations have been run

### Support

For additional support:
- Check Vercel deployment logs
- Review application error logs
- Verify all environment variables are correctly set
- Test with minimal configuration first, then add optional features

## ✅ Deployment Complete

Once deployed successfully:
1. Test authentication with all user types
2. Verify all features work as expected
3. Monitor logs for any errors
4. Set up monitoring and alerting
5. Configure backup procedures
6. Document access credentials securely

Your Astral Core v7 application should now be fully deployed and operational on Vercel!