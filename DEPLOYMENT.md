# Astral Core v7 - Deployment Guide

## 🚀 Production Deployment Status

**Latest Deployment:** https://astral-core-v7.vercel.app  
**Health Score:** 85/100  
**Status:** ✅ Ready for Production (with configuration required)

## 📋 Pre-Deployment Checklist

### ✅ Completed Items
- [x] Security enhancements implemented (rate limiting, encryption)
- [x] Database backup strategy configured
- [x] TypeScript configuration fixed
- [x] Environment variable template created
- [x] Vercel deployment pipeline established
- [x] Authentication system implemented
- [x] HIPAA compliance features added

### ⚠️ Required Before Production
- [ ] Configure production database credentials
- [ ] Set up actual NEXTAUTH_SECRET
- [ ] Configure custom domain
- [ ] Enable automated backups
- [ ] Set up monitoring alerts

## 🔧 Environment Configuration

### 1. Database Setup (Neon PostgreSQL)

```bash
# In Vercel Dashboard, set these environment variables:
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
DIRECT_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### 2. Authentication Keys

Generate secure keys:
```bash
# Generate NEXTAUTH_SECRET (minimum 32 characters)
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32

# Generate JWT_SIGNING_KEY
openssl rand -base64 48
```

### 3. Required Environment Variables

Copy `.env.example` and configure:
- `NEXTAUTH_URL` - Your production domain
- `NEXT_PUBLIC_APP_URL` - Your production domain
- `ALLOW_DEMO_ACCOUNTS` - Set to `false` for production
- `NODE_ENV` - Set to `production`

## 🛠️ Deployment Commands

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Check TypeScript
npm run typecheck
```

### Production Build
```bash
# Build for production
npm run build

# Build with Vercel optimizations
npm run build:vercel

# Test production build locally
npm run build && npm start
```

### Database Management
```bash
# Run migrations
npm run db:migrate:prod

# Generate Prisma client
npm run prisma:generate

# Create backup
npm run db:backup

# Open Prisma Studio
npm run db:studio
```

## 📊 Security Features

### Rate Limiting Configuration
- **Authentication:** 5 attempts per 15 minutes
- **Password Reset:** 3 attempts per hour
- **API Endpoints:** 100 requests per 15 minutes
- **MFA Verification:** 5 attempts per 10 minutes

### Data Protection
- **PHI Encryption:** AES-256-GCM
- **Session Security:** JWT with secure cookies
- **Audit Logging:** 7-year retention policy
- **CSRF Protection:** Enabled on all forms

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows
1. **PR Validation** - Runs on all pull requests
2. **Production Deploy** - Automatic deployment to Vercel
3. **Code Quality** - ESLint, TypeScript, and security checks

### Vercel Integration
- Automatic deployments on push to `master`
- Preview deployments for pull requests
- Environment variable management
- Edge runtime support

## 🗄️ Database Backup Strategy

### Automated Backups
```javascript
// Configuration in scripts/database-backup.js
- Frequency: Daily
- Retention: 30 days
- Encryption: AES-256
- Storage: Local + Cloud (S3 optional)
```

### Manual Backup
```bash
npm run db:backup
```

## 📈 Monitoring & Health Checks

### Health Check Endpoints
- `/api/health` - Basic health check
- `/api/health/db` - Database connectivity
- `/api/health/auth` - Authentication system

### Performance Monitoring
- Web Vitals tracking
- Bundle size analysis
- Lighthouse CI integration
- Error boundary implementation

## 🚨 Troubleshooting

### Common Issues

#### 1. 500 Errors on Production
- Check DATABASE_URL configuration
- Verify NEXTAUTH_SECRET is set
- Ensure Prisma client is generated

#### 2. Authentication Failures
- Verify NEXTAUTH_URL matches domain
- Check OAuth provider configurations
- Ensure session cookies are secure

#### 3. Build Failures
- Clear node_modules and reinstall
- Check TypeScript errors with `npm run typecheck`
- Verify all environment variables are set

### Debug Commands
```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs --follow

# Check environment variables
vercel env ls

# Test database connection
npm run db:test
```

## 📝 Post-Deployment Tasks

1. **Verify Production Site**
   - Test authentication flow
   - Check database connectivity
   - Verify email sending (if configured)

2. **Configure Monitoring**
   - Set up Sentry error tracking
   - Configure uptime monitoring
   - Enable performance alerts

3. **Security Hardening**
   - Review security headers
   - Configure WAF rules
   - Set up DDoS protection

4. **Documentation**
   - Update API documentation
   - Document deployment process
   - Create runbook for incidents

## 🔗 Important Links

- **Production Site:** https://astral-core-v7.vercel.app
- **GitHub Repository:** https://github.com/Damatnic/astral-core-v7
- **Vercel Dashboard:** https://vercel.com/astral-productions/astral-core-v7
- **Neon Database:** https://console.neon.tech

## 📞 Support

For deployment issues or questions:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check GitHub Actions workflow status
4. Contact the development team

## 🎯 Performance Targets

- **Lighthouse Score:** >80
- **First Contentful Paint:** <2s
- **Time to Interactive:** <3.5s
- **Bundle Size:** <500KB initial

## ✅ Final Checklist

Before marking deployment as complete:
- [ ] All environment variables configured
- [ ] Database migrations successful
- [ ] Authentication working
- [ ] Rate limiting active
- [ ] Backup strategy tested
- [ ] Monitoring configured
- [ ] Security scan passed
- [ ] Performance targets met

---

**Last Updated:** September 13, 2025  
**Version:** 0.1.0  
**Status:** Ready for Production Configuration