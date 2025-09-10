# 🚨 VERCEL DEPLOYMENT FIX - Stripe API Key Configuration

## ❌ Current Build Error
```
Error: Neither apiKey nor config.authenticator provided
```

## 🔧 SOLUTION: Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Select your `astral-core-v7` project

### Step 2: Navigate to Settings
1. Click on the "Settings" tab
2. Go to "Environment Variables" in the left sidebar

### Step 3: Add Required Environment Variables

Add these essential variables for production:

| Variable Name | Description | Required |
|--------------|-------------|----------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key | ✅ YES |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint secret | ✅ YES |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | ✅ YES |
| `DATABASE_URL` | PostgreSQL connection string | ✅ YES |
| `NEXTAUTH_SECRET` | NextAuth.js secret | ✅ YES |
| `NEXTAUTH_URL` | Your production URL | ✅ YES |

### Step 4: Get Your Stripe Keys

1. **Login to Stripe Dashboard**: https://dashboard.stripe.com
2. **API Keys**: 
   - Go to Developers → API keys
   - Copy your **Secret key** (starts with `sk_live_` or `sk_test_`)
   - Copy your **Publishable key** (starts with `pk_live_` or `pk_test_`)
3. **Webhook Secret**:
   - Go to Developers → Webhooks
   - Click on your endpoint
   - Copy the **Signing secret** (starts with `whsec_`)

### Step 5: Example Environment Variables

```env
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_51...your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_51...your_key_here
STRIPE_WEBHOOK_SECRET=whsec_...your_secret_here

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/database

# NextAuth (REQUIRED)
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-domain.vercel.app

# Optional but Recommended
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Step 6: Generate NEXTAUTH_SECRET

Run this command locally to generate a secure secret:
```bash
openssl rand -base64 32
```

### Step 7: Add Variables in Vercel

1. For each variable:
   - Enter the **Name** (e.g., `STRIPE_SECRET_KEY`)
   - Enter the **Value** (your actual key)
   - Select environments: ✅ Production, ✅ Preview, ✅ Development
   - Click "Save"

### Step 8: Redeploy

After adding all environment variables:
1. Go to the "Deployments" tab
2. Click on the three dots (...) next to the failed deployment
3. Select "Redeploy"
4. Or push a new commit to trigger a fresh deployment

## 🔍 Quick Checklist

- [ ] STRIPE_SECRET_KEY added
- [ ] STRIPE_PUBLISHABLE_KEY added
- [ ] STRIPE_WEBHOOK_SECRET added
- [ ] DATABASE_URL added
- [ ] NEXTAUTH_SECRET added
- [ ] NEXTAUTH_URL added
- [ ] All variables set for Production environment
- [ ] Redeployment triggered

## 💡 Tips

1. **Use Test Keys First**: Start with Stripe test keys (`sk_test_`, `pk_test_`) to verify everything works
2. **Database**: If you don't have a database yet, use Vercel Postgres or Supabase
3. **Domain**: Update NEXTAUTH_URL once you have your final domain

## 🚀 Alternative: Use .env.production.local

If you prefer, create a `.env.production.local` file with all variables and upload it via Vercel CLI:
```bash
vercel env pull .env.production.local
# Edit the file with your values
vercel env push production
```

## ✅ Expected Result

Once environment variables are configured, the build should succeed with:
- ✅ Stripe initialized properly
- ✅ Database connected
- ✅ Authentication configured
- ✅ All API routes functional
- ✅ Deployment successful

---

*After adding environment variables, your deployment will succeed!*