# Environment Variables Checklist
## Astral Core v7 - Production Deployment

This checklist ensures all required environment variables are properly configured for production deployment on Vercel.

---

## 🔧 Quick Setup Commands

### Automated Setup (Recommended)
```bash
# Set all variables automatically from .env.production.local
node scripts/vercel-env-setup.js

# Dry run to see what would be executed
node scripts/vercel-env-setup.js --dry-run

# Set for specific environment
node scripts/vercel-env-setup.js --env=production
```

### Verification
```bash
# Verify all variables are set correctly
node scripts/verify-env-vars.js
```

---

## 📋 Environment Variables Checklist

### ✅ Authentication & Security
- [ ] **NEXTAUTH_SECRET** - NextAuth.js secret key
  - Value: `tGT9qh2PwtBo0u1tso8FiX0YQYwgYxoKDYN/9JErJ4A=`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **ENCRYPTION_KEY** - Data encryption key
  - Value: `85479d9b447b1de38322be569041d672a9b6088981698321adeca7933c2e1a01`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **JWT_SIGNING_KEY** - JWT token signing key
  - Value: `EV1bALKJ/7PfsdGhYT3/dGZaLtzubjtVd2m+RRfsmug=`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **CSRF_SECRET** - CSRF protection secret
  - Value: `NT3emQ18NRRQeCC+RpydWItUWjFiur79FvOxvswYI4Y=`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **SESSION_SECRET** - Session encryption secret
  - Value: `rxsM3VG4tOJ7StqciOnA4gvANNi+c6vUvxydr7KdyRU=`
  - Environment: production, preview
  - Critical: Yes

### ✅ Application URLs
- [ ] **NEXTAUTH_URL** - NextAuth callback URL
  - Value: `https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **NEXT_PUBLIC_APP_URL** - Public app URL
  - Value: `https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app`
  - Environment: production, preview
  - Critical: Yes

### ✅ Application Configuration
- [ ] **NODE_ENV** - Environment mode
  - Value: `production`
  - Environment: production
  - Critical: Yes
  
- [ ] **NEXT_PUBLIC_APP_NAME** - Application name
  - Value: `Astral Core`
  - Environment: production, preview, development
  - Critical: No

### ✅ Session & Security Settings
- [ ] **SESSION_TIMEOUT_MINUTES** - Session timeout
  - Value: `15`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **SESSION_MAX_AGE** - Maximum session age
  - Value: `86400`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **PHI_ENCRYPTION_ENABLED** - Enable PHI encryption
  - Value: `true`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **AUDIT_LOG_RETENTION_DAYS** - Audit log retention
  - Value: `2555`
  - Environment: production, preview
  - Critical: Yes

### ✅ Database Configuration
- [ ] **DATABASE_URL** - Primary database connection
  - Value: `postgresql://user:password@host:port/database?sslmode=require`
  - Environment: production, preview
  - Critical: Yes
  - Note: Replace with actual database credentials
  
- [ ] **DIRECT_URL** - Direct database connection
  - Value: `postgresql://user:password@host:port/database?sslmode=require`
  - Environment: production, preview
  - Critical: Yes
  - Note: Replace with actual database credentials

### ✅ External Services
- [ ] **SENTRY_DSN** - Sentry error tracking
  - Value: `` (empty - configure if using Sentry)
  - Environment: production, preview
  - Critical: No
  
- [ ] **MONITORING_WEBHOOK_URL** - Monitoring webhook
  - Value: `` (empty - configure if using monitoring)
  - Environment: production
  - Critical: No
  
- [ ] **VERCEL_ANALYTICS_ID** - Vercel Analytics
  - Value: `` (empty - configure if using Vercel Analytics)
  - Environment: production
  - Critical: No

### ✅ Email Configuration
- [ ] **EMAIL_FROM** - From email address
  - Value: `noreply@astralcore.app`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **EMAIL_PROVIDER** - Email service provider
  - Value: `resend`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **RESEND_API_KEY** - Resend service API key
  - Value: `` (empty - add your Resend API key)
  - Environment: production, preview
  - Critical: Yes (for email functionality)

### ✅ Payment Processing
- [ ] **STRIPE_PUBLISHABLE_KEY** - Stripe public key
  - Value: `` (empty - add if using Stripe)
  - Environment: production, preview
  - Critical: No (unless payments enabled)
  
- [ ] **STRIPE_SECRET_KEY** - Stripe secret key
  - Value: `` (empty - add if using Stripe)
  - Environment: production
  - Critical: No (unless payments enabled)
  
- [ ] **STRIPE_WEBHOOK_SECRET** - Stripe webhook secret
  - Value: `` (empty - add if using Stripe webhooks)
  - Environment: production
  - Critical: No (unless payments enabled)

### ✅ OAuth Providers
- [ ] **GOOGLE_CLIENT_ID** - Google OAuth client ID
  - Value: `` (empty - add if enabling Google OAuth)
  - Environment: production, preview
  - Critical: No (unless Google login enabled)
  
- [ ] **GOOGLE_CLIENT_SECRET** - Google OAuth secret
  - Value: `` (empty - add if enabling Google OAuth)
  - Environment: production, preview
  - Critical: No (unless Google login enabled)
  
- [ ] **GITHUB_ID** - GitHub OAuth client ID
  - Value: `` (empty - add if enabling GitHub OAuth)
  - Environment: production, preview
  - Critical: No (unless GitHub login enabled)
  
- [ ] **GITHUB_SECRET** - GitHub OAuth secret
  - Value: `` (empty - add if enabling GitHub OAuth)
  - Environment: production, preview
  - Critical: No (unless GitHub login enabled)

### ✅ Feature Flags
- [ ] **ENABLE_MFA** - Multi-factor authentication
  - Value: `true`
  - Environment: production, preview, development
  - Critical: No
  
- [ ] **ENABLE_CRISIS_INTERVENTION** - Crisis intervention features
  - Value: `true`
  - Environment: production, preview, development
  - Critical: No
  
- [ ] **ENABLE_WELLNESS_TRACKING** - Wellness tracking features
  - Value: `true`
  - Environment: production, preview, development
  - Critical: No
  
- [ ] **ENABLE_TELETHERAPY** - Teletherapy features
  - Value: `true`
  - Environment: production, preview, development
  - Critical: No
  
- [ ] **ENABLE_PAYMENT_PROCESSING** - Payment processing
  - Value: `false`
  - Environment: production, preview, development
  - Critical: No

### ✅ Performance & Rate Limiting
- [ ] **RATE_LIMIT_ENABLED** - Enable rate limiting
  - Value: `true`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **RATE_LIMIT_WINDOW_MS** - Rate limit window
  - Value: `60000`
  - Environment: production, preview
  - Critical: Yes
  
- [ ] **RATE_LIMIT_MAX_REQUESTS** - Max requests per window
  - Value: `100`
  - Environment: production, preview
  - Critical: Yes

### ✅ CORS Configuration
- [ ] **CORS_ALLOWED_ORIGINS** - Allowed CORS origins
  - Value: `https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app`
  - Environment: production, preview
  - Critical: Yes

### ✅ Build & Deployment
- [ ] **SKIP_TYPE_CHECK** - Skip TypeScript checks in build
  - Value: `false`
  - Environment: production, preview, development
  - Critical: No
  
- [ ] **NEXT_TELEMETRY_DISABLED** - Disable Next.js telemetry
  - Value: `1`
  - Environment: production, preview, development
  - Critical: No

### ✅ Caching Configuration
- [ ] **CACHE_TTL_DEFAULT** - Default cache TTL
  - Value: `300`
  - Environment: production, preview
  - Critical: No
  
- [ ] **CACHE_TTL_USER** - User data cache TTL
  - Value: `600`
  - Environment: production, preview
  - Critical: No
  
- [ ] **CACHE_TTL_DASHBOARD** - Dashboard cache TTL
  - Value: `60`
  - Environment: production, preview
  - Critical: No

### ✅ Logging & Monitoring
- [ ] **LOG_LEVEL** - Application log level
  - Value: `info`
  - Environment: production, preview, development
  - Critical: No
  
- [ ] **LOG_FORMAT** - Log output format
  - Value: `json`
  - Environment: production, preview
  - Critical: No

### ✅ Health Checks
- [ ] **HEALTH_CHECK_INTERVAL** - Health check interval
  - Value: `30000`
  - Environment: production, preview
  - Critical: No
  
- [ ] **HEALTH_CHECK_TIMEOUT** - Health check timeout
  - Value: `5000`
  - Environment: production, preview
  - Critical: No

---

## 🚨 Critical Variables (Must be set)

These variables are essential for the application to function:

1. **NEXTAUTH_SECRET** - Authentication will fail without this
2. **ENCRYPTION_KEY** - Data encryption/decryption will fail
3. **JWT_SIGNING_KEY** - Token validation will fail
4. **DATABASE_URL** - Database connections will fail
5. **DIRECT_URL** - Database migrations will fail
6. **NEXTAUTH_URL** - OAuth callbacks will fail
7. **NEXT_PUBLIC_APP_URL** - Client-side routing will fail

---

## 🔄 Manual Setup Instructions

### Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) → Your Project
2. Navigate to **Settings** → **Environment Variables**
3. For each variable above:
   - Click **Add New**
   - Enter the **Name** (e.g., NEXTAUTH_SECRET)
   - Enter the **Value**
   - Select **Environment** (production, preview, or development)
   - Click **Save**

### Via Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add individual variables
vercel env add NEXTAUTH_SECRET production
vercel env add ENCRYPTION_KEY production
# ... continue for each variable

# List all environment variables
vercel env ls production
```

---

## ✅ Verification Steps

1. **Run verification script:**
   ```bash
   node scripts/verify-env-vars.js
   ```

2. **Check Vercel environment variables:**
   ```bash
   vercel env ls production
   ```

3. **Test deployment:**
   ```bash
   vercel --prod
   ```

4. **Monitor deployment logs:**
   ```bash
   vercel logs --follow
   ```

---

## 📞 Troubleshooting

### Common Issues:

1. **"Missing environment variable" error**
   - Check variable name spelling
   - Ensure variable is set for correct environment
   - Verify variable value is not empty

2. **"Authentication failed" error**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Ensure JWT_SIGNING_KEY is valid

3. **"Database connection failed" error**
   - Verify DATABASE_URL is correct
   - Check database is accessible from Vercel
   - Ensure connection string includes SSL settings

4. **"Build failed" error**
   - Check SKIP_TYPE_CHECK if TypeScript errors exist
   - Verify all required build-time variables are set

### Getting Help:
- Check Vercel deployment logs: `vercel logs`
- Review function logs in Vercel dashboard
- Run local verification: `npm run build`

---

**Total Variables:** 41
**Critical Variables:** 7
**Optional Variables:** 34

**Last Updated:** September 12, 2025