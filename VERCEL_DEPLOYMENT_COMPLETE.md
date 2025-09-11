# 🚀 Astral Core v7 - Complete Vercel Deployment Configuration

## ✅ Ready-to-Copy Environment Variables for Vercel

Copy this entire block and paste it into Vercel's environment variables:

```env
# Database Configuration (Neon)
DATABASE_URL=postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require

# Security Keys (Generated)
NEXTAUTH_SECRET=tUN2VrCEJ2nkcq78H7WYYjMDoGgOvdEujCdrlCGIu8A=
ENCRYPTION_KEY=3598a3a4c2e8075f0226b402b2fc39e58f50cbe0a095e67919a60839e943a615
JWT_SIGNING_KEY=zYwLMsTPzwGiIYv2eTBrYyZg6+xohlhVtXUJlYj+bRI=

# Application Configuration
NEXTAUTH_URL=https://astral-core-v7.vercel.app
NEXT_PUBLIC_APP_URL=https://astral-core-v7.vercel.app
NEXT_PUBLIC_APP_NAME=Astral Core
NEXT_PUBLIC_APP_VERSION=7.0.0
NODE_ENV=production

# Security & Compliance
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

# Storage & Email
STORAGE_PROVIDER=local
EMAIL_FROM=noreply@astralcore.app
EMAIL_PROVIDER=resend

# Neon Auth (Optional - if using Stack Auth)
NEXT_PUBLIC_STACK_PROJECT_ID=961956bd-18fd-4e37-951a-a2c969f33f30
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_wetw5zyckz7h5qnj3w8tchy9ts8bc5w1atnc8z0tcec3g
STACK_SECRET_SERVER_KEY=ssk_bpmbwv2djcvn470fn7y3qyzwgcy69mr7axbc5nv1bqrh8
```

## 📋 Step-by-Step Deployment Guide

### Step 1: Add Environment Variables to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `astral-core-v7` project
3. Navigate to **Settings** → **Environment Variables**
4. Click **Add Multiple**
5. Paste ALL the environment variables above
6. Select environments: ✅ Production ✅ Preview ✅ Development
7. Click **Save**

### Step 2: Redeploy with New Variables

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋮** menu → **Redeploy**
4. Click **Redeploy** in the dialog

### Step 3: Initialize Database

Once deployed, run the database migrations:

1. Go to your project page on Vercel
2. Click **Functions** tab
3. Open the Vercel CLI or use the web terminal
4. Run: `npx prisma migrate deploy`
5. Run: `npx prisma db seed` (to add demo accounts)

## 🔐 Demo Accounts

After seeding, you can log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.astralcore.com | Demo123!Admin |
| Therapist | therapist@demo.astralcore.com | Demo123!Therapist |
| Client | client@demo.astralcore.com | Demo123!Client |
| Crisis Responder | crisis@demo.astralcore.com | Demo123!Crisis |
| Supervisor | supervisor@demo.astralcore.com | Demo123!Supervisor |

## 🔗 Important URLs

- **Live App**: https://astral-core-v7.vercel.app
- **Vercel Dashboard**: https://vercel.com/damatnic/astral-core-v7
- **GitHub Repo**: https://github.com/Damatnic/astral-core-v7
- **Neon Dashboard**: https://console.neon.tech

## ✅ Verification Checklist

After deployment, verify:

- [ ] Site loads at https://astral-core-v7.vercel.app
- [ ] Login page appears without errors
- [ ] Can log in with demo accounts
- [ ] Dashboard loads after login
- [ ] No console errors in browser
- [ ] Database queries work (check user list)

## 🚨 Troubleshooting

### If build fails:
1. Check Vercel build logs for specific errors
2. Ensure all environment variables are set
3. Verify database connection string is correct

### If login doesn't work:
1. Check NEXTAUTH_SECRET is set
2. Verify DATABASE_URL is correct
3. Ensure database migrations ran successfully

### If pages show errors:
1. Check browser console for errors
2. Verify all NEXT_PUBLIC_* variables are set
3. Check Vercel function logs

## 🛠️ Optional: Advanced Configuration

### Add Stripe (for payments):
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Add Email (Resend):
```env
RESEND_API_KEY=re_...
```

### Add Error Tracking (Sentry):
```env
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

## 📊 Monitoring

Monitor your deployment:
- **Vercel Analytics**: Built-in performance monitoring
- **Neon Dashboard**: Database metrics and query performance
- **Vercel Logs**: Real-time function and build logs

---

**Last Updated**: 2025-09-11
**Status**: Ready for deployment
**Support**: Create an issue at https://github.com/Damatnic/astral-core-v7/issues