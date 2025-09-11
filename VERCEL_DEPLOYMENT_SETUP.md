# 🚀 Vercel Deployment Setup for Astral Core v7

This guide will help you configure automatic deployment to **astral-core-v7.vercel.app** with proper environment variable management.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Already set up at `https://github.com/Damatnic/astral-core-v7`
3. **Database**: PostgreSQL database (Neon, Supabase, or similar)
4. **Stripe Account**: For payment processing (optional but recommended)

## 🔧 Step 1: Connect to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select **GitHub** and authorize Vercel
4. Choose `Damatnic/astral-core-v7` repository
5. Click **Import**

### Option B: Via CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Follow the prompts to connect to astral-core-v7
```

## 🔐 Step 2: Configure Environment Variables

### Required Variables (MUST SET)

Go to your [Vercel Project Settings](https://vercel.com/dashboard) → **Settings** → **Environment Variables** and add:

| Variable | Description | How to Get |
|----------|-------------|------------|
| `DATABASE_URL` | PostgreSQL connection string | From your database provider |
| `DIRECT_URL` | Direct database connection | Usually same as DATABASE_URL |
| `NEXTAUTH_SECRET` | Session encryption key | Generate: `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | PHI encryption key | Generate: `openssl rand -hex 32` |
| `JWT_SIGNING_KEY` | JWT signing key | Generate: `openssl rand -base64 32` |

### Stripe Configuration (Required for Payments)

| Variable | Description | Get From |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Server-side Stripe key | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_PUBLISHABLE_KEY` | Client-side Stripe key | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public Stripe key | Same as STRIPE_PUBLISHABLE_KEY |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature key | [Stripe Webhooks](https://dashboard.stripe.com/webhooks) |

### Email Configuration (Recommended)

| Variable | Description | Get From |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend email API key | [Resend Dashboard](https://resend.com/api-keys) |
| `EMAIL_FROM` | From email address | `noreply@yourdomain.com` |

### Optional Services

| Variable | Description | Get From |
|----------|-------------|----------|
| `SENTRY_DSN` | Error tracking | [Sentry](https://sentry.io) |
| `POSTHOG_KEY` | Analytics | [PostHog](https://posthog.com) |
| `OPENAI_API_KEY` | AI features | [OpenAI](https://platform.openai.com) |

## 🤖 Step 3: Automatic Environment Sync

### Using the Sync Script

We've created a script to automatically sync environment variables:

```bash
# Run the sync script
npm run vercel:env

# This will:
# 1. Check for required variables
# 2. Generate secure values for missing secrets
# 3. Apply production configurations
# 4. Sync all variables to Vercel
```

### Manual Sync (Alternative)

```bash
# Add individual variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
# ... repeat for each variable

# Or use the .env.local file
vercel env pull .env.local
```

## 🚀 Step 4: Deploy

### Automatic Deployment (GitHub Push)

Every push to `master` branch will automatically deploy:

```bash
git add .
git commit -m "feat: your changes"
git push origin master
# Vercel will automatically deploy
```

### Manual Deployment

```bash
# Deploy to production
npm run deploy

# Or using Vercel CLI directly
vercel --prod
```

## 🔗 Step 5: Configure Webhooks

### Stripe Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter: `https://astral-core-v7.vercel.app/api/payments/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** and add as `STRIPE_WEBHOOK_SECRET` in Vercel

## 📊 Step 6: Verify Deployment

### Health Checks

```bash
# Check main application
curl https://astral-core-v7.vercel.app/api/health

# Check specific endpoints
curl https://astral-core-v7.vercel.app/api/health/live
curl https://astral-core-v7.vercel.app/api/health/ready
```

### Expected Response

```json
{
  "status": "healthy",
  "timestamp": "2024-12-11T...",
  "version": "7.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "stripe": "configured"
  }
}
```

## 🛠️ Step 7: GitHub Actions Setup

### Required GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** in your GitHub repo:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Get from [Vercel Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Found in `.vercel/project.json` after linking |
| `VERCEL_PROJECT_ID` | Found in `.vercel/project.json` after linking |
| All env variables from Step 2 | Add each as a GitHub secret |

### Get Vercel IDs

```bash
# After linking with vercel link
cat .vercel/project.json
# Copy orgId and projectId
```

## 🔍 Step 8: Monitor & Maintain

### Vercel Dashboard

- **Deployments**: View all deployments at [vercel.com/dashboard](https://vercel.com/dashboard)
- **Functions**: Monitor API routes and edge functions
- **Analytics**: Track performance and usage
- **Logs**: Real-time logs for debugging

### Useful Commands

```bash
# View recent deployments
vercel ls

# View logs
vercel logs

# Rollback to previous deployment
vercel rollback

# Remove a deployment
vercel rm [deployment-url]
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Fails

```bash
# Check build logs
vercel logs --output raw

# Common fixes:
# - Ensure all environment variables are set
# - Check package.json for correct build command
# - Verify Prisma schema is valid
```

#### 2. Database Connection Issues

```bash
# Verify DATABASE_URL format:
postgresql://user:password@host:port/database?sslmode=require

# For Neon/Supabase, ensure connection pooling is enabled
```

#### 3. Environment Variables Not Working

```bash
# Pull current variables
vercel env pull

# List all variables
vercel env ls

# Remove and re-add
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
```

#### 4. Stripe Webhooks Failing

- Ensure `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard
- Verify the endpoint URL is correct
- Check webhook logs in Stripe Dashboard

## 📝 Configuration Files

### vercel.json (Already Created)
- Production settings
- Security headers
- Environment variables
- Build configuration

### GitHub Actions (Already Created)
- `.github/workflows/vercel-deploy.yml`
- Automatic deployment on push
- Health checks
- Lighthouse CI integration

### Package.json Scripts (Already Added)
- `npm run vercel:env` - Sync environment variables
- `npm run vercel:deploy` - Deploy to production
- `npm run deploy` - Shortcut for deployment

## 🎯 Quick Start Summary

1. **Connect Vercel**: Import repository at [vercel.com/new](https://vercel.com/new)
2. **Set Variables**: Add required environment variables in Vercel dashboard
3. **Run Sync**: `npm run vercel:env` to sync all variables
4. **Deploy**: `npm run deploy` or push to GitHub
5. **Verify**: Check https://astral-core-v7.vercel.app

## 🔒 Security Notes

- **Never commit** `.env.local` or any file with real secrets
- **Rotate keys** quarterly (set reminders)
- **Use different keys** for development and production
- **Enable 2FA** on Vercel and GitHub accounts
- **Monitor** deployment logs for suspicious activity

## 📞 Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **GitHub Issues**: [github.com/Damatnic/astral-core-v7/issues](https://github.com/Damatnic/astral-core-v7/issues)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

---

Your Astral Core v7 is now configured for automatic deployment to **astral-core-v7.vercel.app**! 🎉