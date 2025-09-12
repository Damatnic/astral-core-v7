# Astral Core v7 - Production Setup Guide

## 🚀 Quick Start - Production Environment Configuration

Your application is **LIVE** at: https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app

Follow these steps to complete the production setup:

---

## 1. DATABASE SETUP (Required) 🗄️

### Option A: Vercel Postgres (Recommended)
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `astral-core-v7`
3. Navigate to "Storage" tab
4. Click "Create Database" → Select "Postgres"
5. Choose your region (select closest to your users)
6. Copy the connection strings provided

### Option B: External PostgreSQL
Use any PostgreSQL provider (Supabase, Neon, Railway, etc.)
- Minimum version: PostgreSQL 14+
- Required extensions: uuid-ossp, pgcrypto

### Database Connection Variables
Add these to Vercel Environment Variables:
```
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require"
DIRECT_URL="postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require"
```

---

## 2. CRITICAL ENVIRONMENT VARIABLES 🔐

Go to: Project Settings → Environment Variables

### Security Keys (REQUIRED - Generate New!)
```bash
# Generate these values using the commands shown:

NEXTAUTH_SECRET=$(openssl rand -base64 32)
# Example: "k3yP9mNx2vB8qL7wZ5jT1aR6cF4uS0hD"

ENCRYPTION_KEY=$(openssl rand -hex 32)
# Example: "a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234"

JWT_SIGNING_KEY=$(openssl rand -base64 32)
# Example: "m9N2kP3xvB8qL7wZ5jT1aR6cF4uS0hD"

CSRF_SECRET=$(openssl rand -base64 32)
# Example: "x2P9mNk3vB8qL7wZ5jT1aR6cF4uS0hD"
```

### Application URLs
```
NEXTAUTH_URL=https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app
NEXT_PUBLIC_APP_URL=https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app
```

### Core Settings
```
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="Astral Core"
SESSION_TIMEOUT_MINUTES=15
PHI_ENCRYPTION_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555
```

---

## 3. DATABASE MIGRATIONS 🔄

After setting up your database, run migrations:

### Local Machine Method:
```bash
# Install dependencies locally
npm install

# Set your production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Generate Prisma Client
npx prisma generate

# Deploy migrations to production
npx prisma migrate deploy

# (Optional) Seed with demo data
npx prisma db seed
```

### Direct Database Method:
Connect to your database and run the SQL from `prisma/migrations/`

---

## 4. OPTIONAL INTEGRATIONS 🔌

### Email Notifications (Resend)
```
EMAIL_FROM=noreply@yourdomain.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### Payment Processing (Stripe)
```
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### Error Tracking (Sentry)
```
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=xxxxxxxxxxxx
```

### OAuth Providers (Optional)
```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxx

GITHUB_ID=xxxxxxxxxxxx
GITHUB_SECRET=xxxxxxxxxxxx
```

---

## 5. VERIFY DEPLOYMENT ✅

### Health Check
Visit: https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health

### Expected Response:
```json
{
  "status": "HEALTHY",
  "timestamp": "2024-XX-XX",
  "environment": "production",
  "checks": [
    {"service": "database", "status": "HEALTHY"},
    {"service": "memory", "status": "HEALTHY"}
  ]
}
```

---

## 6. DEMO ACCOUNTS 🧪

After database setup, these demo accounts are available:

### Demo Therapist
- Email: `demo.therapist@astralcore.app`
- Password: `DemoTherapist2024!`
- Role: THERAPIST

### Demo Client
- Email: `demo.client@astralcore.app`
- Password: `DemoClient2024!`
- Role: CLIENT

### Demo Admin
- Email: `demo.admin@astralcore.app`
- Password: `DemoAdmin2024!`
- Role: ADMIN

---

## 7. MONITORING & ALERTS 📊

### Vercel Analytics
Already enabled - check your Vercel dashboard

### Custom Monitoring Endpoints
- Health: `/api/health`
- Metrics: `/api/monitoring/metrics`
- Status: `/api/status`

### Recommended Monitoring Services
1. **UptimeRobot** - Free uptime monitoring
2. **Sentry** - Error tracking
3. **LogDNA/Datadog** - Log aggregation

---

## 8. SECURITY CHECKLIST 🔒

- [ ] All environment variables set with strong values
- [ ] Database using SSL connections
- [ ] NEXTAUTH_SECRET is unique and secure
- [ ] ENCRYPTION_KEY is unique and never shared
- [ ] PHI_ENCRYPTION_ENABLED set to true
- [ ] Rate limiting enabled (automatic)
- [ ] CORS configured (automatic)
- [ ] CSP headers active (automatic)

---

## 9. TROUBLESHOOTING 🔧

### Database Connection Issues
- Ensure DATABASE_URL includes `?sslmode=require`
- Check IP allowlist if using external database
- Verify connection pooling settings

### Authentication Issues
- Verify NEXTAUTH_URL matches your deployment URL
- Ensure NEXTAUTH_SECRET is set
- Check OAuth redirect URLs if using providers

### Build Failures
- Clear build cache in Vercel dashboard
- Check environment variables are set for all environments
- Review build logs in Vercel dashboard

---

## 10. SUPPORT & MAINTENANCE 🛠️

### Daily Tasks
- Monitor error logs
- Check health endpoints
- Review security alerts

### Weekly Tasks
- Database backup verification
- Performance metrics review
- Security audit logs review

### Monthly Tasks
- Dependency updates
- Security patches
- Performance optimization

---

## 📞 Need Help?

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)

### Common Issues
Check `/docs/troubleshooting.md` for solutions

### Critical Issues
For production emergencies:
1. Check Vercel Status: https://www.vercel-status.com/
2. Review error logs in Vercel dashboard
3. Check database connectivity
4. Verify environment variables

---

## ✅ Ready for Production!

Once you complete steps 1-3, your application will be fully operational with:
- ✅ Secure authentication system
- ✅ HIPAA-compliant data encryption
- ✅ Crisis intervention features
- ✅ Therapy management tools
- ✅ Wellness tracking
- ✅ Appointment scheduling
- ✅ Real-time notifications

**Your mental health platform is ready to help people!** 🎉