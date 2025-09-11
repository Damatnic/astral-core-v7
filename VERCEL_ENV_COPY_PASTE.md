# 🚀 Vercel Deployment - Copy & Paste Guide

## 📋 PART 1: Environment Variables (Copy & Paste Ready)

### 🔴 CRITICAL - Generate These First

Run these commands in your terminal to generate secure values:

```bash
# Generate NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SIGNING_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 📝 Copy This Template and Fill In Your Values

```env
# ============ REQUIRED - MUST SET ALL OF THESE ============

# Database (Get from Neon/Supabase/Your Provider)
DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require
DIRECT_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require

# Authentication (Use generated values from above)
NEXTAUTH_URL=https://astral-core-v7.vercel.app
NEXTAUTH_SECRET=[PASTE YOUR GENERATED BASE64 STRING HERE]
ENCRYPTION_KEY=[PASTE YOUR GENERATED HEX STRING HERE]
JWT_SIGNING_KEY=[PASTE YOUR GENERATED BASE64 STRING HERE]

# ============ STRIPE (Required for Payments) ============

# Get from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_[YOUR_STRIPE_SECRET_KEY]
STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR_STRIPE_PUBLISHABLE_KEY]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR_STRIPE_PUBLISHABLE_KEY]

# Get from: https://dashboard.stripe.com/test/webhooks (after creating endpoint)
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_WEBHOOK_SECRET]

# ============ EMAIL (Recommended) ============

# Option 1: Resend (Recommended - easier setup)
# Get from: https://resend.com/api-keys
RESEND_API_KEY=re_[YOUR_RESEND_API_KEY]
EMAIL_FROM=noreply@astralcore.app
EMAIL_PROVIDER=resend

# Option 2: SendGrid (Alternative)
# SENDGRID_API_KEY=SG.[YOUR_SENDGRID_KEY]
# EMAIL_FROM=noreply@astralcore.app
# EMAIL_PROVIDER=sendgrid

# ============ FIXED VALUES (Copy As-Is) ============

# App Configuration
NEXT_PUBLIC_APP_URL=https://astral-core-v7.vercel.app
NEXT_PUBLIC_APP_NAME=Astral Core
NEXT_PUBLIC_APP_VERSION=7.0.0
NODE_ENV=production

# Security Settings
PHI_ENCRYPTION_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555
SESSION_TIMEOUT_MINUTES=15
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=50
REQUIRE_MFA=false

# Feature Flags
ENABLE_CRISIS_INTERVENTION=true
ENABLE_AI_ASSISTANCE=false
ENABLE_VIDEO_SESSIONS=false
ENABLE_GROUP_THERAPY=false

# Storage
STORAGE_PROVIDER=local

# ============ OPTIONAL SERVICES ============

# Sentry Error Tracking (Optional)
# Get from: https://sentry.io/settings/projects/
# SENTRY_DSN=https://[YOUR_KEY]@sentry.io/[PROJECT_ID]
# SENTRY_AUTH_TOKEN=[YOUR_AUTH_TOKEN]
# SENTRY_ORG=[YOUR_ORG_SLUG]
# SENTRY_PROJECT=[YOUR_PROJECT_NAME]

# PostHog Analytics (Optional)
# Get from: https://app.posthog.com/project/settings
# POSTHOG_KEY=phc_[YOUR_POSTHOG_KEY]
# POSTHOG_HOST=https://app.posthog.com

# OpenAI (Optional - for AI features)
# OPENAI_API_KEY=sk-[YOUR_OPENAI_KEY]
```

---

## 📋 PART 2: Step-by-Step Vercel Setup Guide

### Step 1: Import Project to Vercel

1. **Go to**: https://vercel.com/new
2. **Click**: "Import Git Repository"
3. **Select**: "Import a Third-Party Git Repository"
4. **Enter**: `https://github.com/Damatnic/astral-core-v7`
5. **Click**: "Import"

### Step 2: Configure Project

On the "Configure Project" page:

1. **Project Name**: `astral-core-v7` (or keep default)
2. **Framework Preset**: Next.js (should auto-detect)
3. **Root Directory**: `./` (leave as is)
4. **Build Settings**: (Leave defaults)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Step 3: Add Environment Variables in Vercel

1. **DON'T DEPLOY YET** - Click on "Environment Variables" section
2. **Add Method 1 - Bulk Import** (Easier):
   - Copy the entire filled template from above
   - Click "Add from .env.local"
   - Paste everything
   - Click "Add"

3. **Add Method 2 - One by One**:
   - Click "Add New"
   - Enter Key: `DATABASE_URL`
   - Enter Value: `postgresql://...`
   - Leave environment checkboxes as default (all checked)
   - Click "Add"
   - Repeat for each variable

### Step 4: Deploy

1. **After all variables are added**, click "Deploy"
2. **Wait** for deployment (3-5 minutes)
3. **Visit**: https://astral-core-v7.vercel.app

---

## 📋 PART 3: GitHub Secrets Setup (For Auto-Deploy)

### Step 1: Get Vercel Tokens

1. **Get Vercel Token**:
   - Go to: https://vercel.com/account/tokens
   - Click "Create"
   - Name: `GitHub Actions`
   - Scope: Full Account
   - Expiration: No Expiration
   - Click "Create Token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **Get Project IDs**:
   ```bash
   # In your local project directory, run:
   npx vercel link
   
   # Follow prompts, then run:
   cat .vercel/project.json
   ```
   
   Copy the `orgId` and `projectId` values.

### Step 2: Add to GitHub Secrets

1. **Go to**: https://github.com/Damatnic/astral-core-v7/settings/secrets/actions
2. **Click**: "New repository secret"
3. **Add these secrets**:

```yaml
# Vercel Configuration (Required)
VERCEL_TOKEN: [Your token from Step 1]
VERCEL_ORG_ID: [Your orgId from project.json]
VERCEL_PROJECT_ID: [Your projectId from project.json]

# Database (Required)
DATABASE_URL: [Same as in Vercel]
DIRECT_URL: [Same as in Vercel]

# Authentication (Required)
NEXTAUTH_SECRET: [Same as in Vercel]
ENCRYPTION_KEY: [Same as in Vercel]
JWT_SIGNING_KEY: [Same as in Vercel]

# Stripe (If using payments)
STRIPE_SECRET_KEY: [Same as in Vercel]
STRIPE_PUBLISHABLE_KEY: [Same as in Vercel]
STRIPE_WEBHOOK_SECRET: [Same as in Vercel]

# Email (If configured)
RESEND_API_KEY: [Same as in Vercel]

# Optional
SENTRY_DSN: [If using Sentry]
POSTHOG_KEY: [If using PostHog]
```

---

## 📋 PART 4: Stripe Webhook Setup (For Payments)

### Step 1: Create Webhook Endpoint

1. **Go to**: https://dashboard.stripe.com/test/webhooks
2. **Click**: "Add endpoint"
3. **Endpoint URL**: `https://astral-core-v7.vercel.app/api/payments/webhook`
4. **Description**: `Astral Core v7 Production`
5. **Events to send**: Click "Select events"
6. **Select these events**:
   ```
   ✓ checkout.session.completed
   ✓ customer.subscription.created
   ✓ customer.subscription.updated
   ✓ customer.subscription.deleted
   ✓ invoice.payment_succeeded
   ✓ invoice.payment_failed
   ✓ payment_intent.succeeded
   ✓ payment_intent.payment_failed
   ```
7. **Click**: "Add endpoint"

### Step 2: Get Webhook Secret

1. **On the webhook page**, find "Signing secret"
2. **Click**: "Reveal"
3. **Copy**: The `whsec_...` value
4. **Add to Vercel**: As `STRIPE_WEBHOOK_SECRET`

---

## 📋 PART 5: Database Setup Options

### Option A: Neon (Recommended - Free Tier)

1. **Sign up**: https://neon.tech
2. **Create database**: Name it `astralcore_v7`
3. **Get connection string**: 
   - Go to Dashboard → Connection Details
   - Copy "Connection string"
   - Use for both `DATABASE_URL` and `DIRECT_URL`

### Option B: Supabase

1. **Sign up**: https://supabase.com
2. **Create project**: Name it `astral-core-v7`
3. **Get connection strings**:
   - Settings → Database
   - Connection string → URI
   - Use "Connection pooling" URL for `DATABASE_URL`
   - Use "Direct connection" URL for `DIRECT_URL`

### Option C: Local PostgreSQL

```bash
# Create database
createdb astralcore_v7

# Connection string format:
postgresql://username:password@localhost:5432/astralcore_v7
```

---

## 📋 PART 6: Quick Verification Checklist

After deployment, verify everything works:

```bash
# 1. Check main site
curl https://astral-core-v7.vercel.app
# Should return HTML

# 2. Check health endpoint
curl https://astral-core-v7.vercel.app/api/health
# Should return: {"status":"healthy",...}

# 3. Check login page
curl https://astral-core-v7.vercel.app/auth/login
# Should return HTML

# 4. Test database connection
# Try to register a new account or login with demo accounts
```

---

## 🚨 PART 7: Troubleshooting Commands

### If deployment fails:

```bash
# Check Vercel logs
npx vercel logs --num 100

# Common fixes:
# 1. Missing environment variable - add in Vercel dashboard
# 2. Database connection failed - check DATABASE_URL format
# 3. Build error - check package.json and dependencies
```

### Redeploy with changes:

```bash
# Option 1: Via GitHub (automatic)
git add .
git commit -m "fix: deployment issue"
git push origin master

# Option 2: Via Vercel CLI
npx vercel --prod

# Option 3: Via Dashboard
# Go to Vercel Dashboard → Click "Redeploy"
```

---

## 📞 Quick Support

- **Vercel Issues**: Check https://vercel.com/docs/errors
- **Database Issues**: Ensure SSL is enabled (`?sslmode=require`)
- **Stripe Issues**: Verify webhook secret matches
- **Build Issues**: Run `npm run build` locally first

---

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Site loads at https://astral-core-v7.vercel.app
2. ✅ Login page appears at /auth/login
3. ✅ Health check returns "healthy" status
4. ✅ No errors in Vercel function logs
5. ✅ Can login with demo accounts

---

**Need the demo accounts?**

```
Admin: admin@demo.astralcore.com / Demo123!Admin
Therapist: therapist@demo.astralcore.com / Demo123!Therapist
Client: client@demo.astralcore.com / Demo123!Client
```

---

🎉 **That's it! Your app should now be live at https://astral-core-v7.vercel.app**