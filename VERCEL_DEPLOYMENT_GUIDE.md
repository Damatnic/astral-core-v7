# 🚀 Astral Core v7 - Vercel Deployment Made Easy

## ✨ Quick Start - One Command Deployment

```bash
npm run deploy
```

This interactive command will:
- ✅ Check Vercel login status
- ✅ Set up all environment variables
- ✅ Deploy to production or preview
- ✅ Configure monitoring
- ✅ Run health checks

---

## 📋 Available Commands

### 🎯 Deployment Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Interactive deployment wizard |
| `npm run deploy:prod` | Direct production deployment |
| `npm run deploy:preview` | Preview deployment |
| `vercel` | Basic deployment (preview) |
| `vercel --prod` | Production deployment |

### 📊 Monitoring Commands

| Command | Description |
|---------|-------------|
| `npm run monitor` | Interactive monitoring dashboard |
| `npm run vercel:logs` | View real-time logs |
| `npm run vercel:status` | Check deployment status |
| `vercel analytics` | View analytics |
| `vercel logs --error` | View error logs only |

### 🔧 Management Commands

| Command | Description |
|---------|-------------|
| `npm run vercel:promote` | Promote preview to production |
| `npm run vercel:rollback` | Rollback to previous version |
| `vercel env ls` | List environment variables |
| `vercel domains ls` | List configured domains |
| `vercel alias set [alias]` | Set custom domain alias |

---

## 🚀 Step-by-Step Deployment

### Step 1: First-Time Setup

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login
```

### Step 2: Deploy with Interactive Wizard

```bash
npm run deploy
```

The wizard will ask you:
1. **Deploy to production or preview?** → Type `prod` for production
2. **Setup environment variables?** → Type `y` (first time only)
3. **Setup monitoring?** → Type `y` to enable analytics
4. **Run post-deployment checks?** → Type `y` to verify

### Step 3: Monitor Your Deployment

```bash
npm run monitor
```

This opens an interactive dashboard where you can:
- View real-time logs
- Check API health
- Monitor performance
- View error logs

---

## 🔐 Environment Variables

All environment variables are pre-configured in the deployment script with your Neon database:

### Database (Already Configured)
- `DATABASE_URL` - Neon PostgreSQL connection
- `DIRECT_URL` - Direct database connection

### Security Keys (Auto-Generated)
- `NEXTAUTH_SECRET` - Authentication secret
- `ENCRYPTION_KEY` - Data encryption key
- `JWT_SIGNING_KEY` - JWT signing key

### Application Settings
- `NEXT_PUBLIC_APP_URL` - https://astral-core-v7.vercel.app
- `NEXT_PUBLIC_APP_NAME` - Astral Core
- `PHI_ENCRYPTION_ENABLED` - true
- `ENABLE_CRISIS_INTERVENTION` - true

---

## 📊 Monitoring Dashboard

Run `npm run monitor` to access:

```
📊 Astral Core v7 - Vercel Monitoring Dashboard
============================================================

📋 Monitoring Options:
  1. View Real-time Logs
  2. Check Deployment Status
  3. View Analytics Summary
  4. Monitor API Health
  5. Check Error Logs
  6. View Performance Metrics
  7. List Recent Deployments
  8. View Environment Variables
  9. Check Domain Configuration
  0. Exit
```

---

## 🏥 Health Check Endpoints

Your app includes built-in health monitoring:

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Basic health check |
| `/api/health/ready` | Readiness probe |
| `/api/status` | Detailed status info |
| `/api/monitoring/uptime` | Uptime monitoring |
| `/api/monitoring/performance` | Performance metrics |
| `/api/monitoring/errors` | Error tracking |

---

## 🔄 Common Workflows

### Deploy a New Version
```bash
git add .
git commit -m "Your changes"
git push
npm run deploy:prod
```

### Preview Changes Before Production
```bash
npm run deploy:preview
# Test your preview deployment
npm run vercel:promote  # Promote to production
```

### Rollback a Bad Deployment
```bash
npm run vercel:rollback
```

### View Logs for Debugging
```bash
npm run vercel:logs  # All logs
vercel logs --error  # Errors only
vercel logs --follow  # Real-time logs
```

### Update Environment Variables
```bash
vercel env add KEY_NAME production
# Enter the value when prompted
```

---

## 🎯 Quick Deployment Checklist

- [ ] Code committed to GitHub
- [ ] Environment variables configured
- [ ] Tests passing locally
- [ ] Run `npm run deploy`
- [ ] Verify health checks pass
- [ ] Check monitoring dashboard

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Check build logs
vercel logs --output build

# Try local build
npm run build
```

### Environment Variables Missing
```bash
# List current variables
vercel env ls

# Add missing variable
vercel env add VARIABLE_NAME production
```

### Domain Issues
```bash
# Check domain configuration
vercel domains ls

# Add custom domain
vercel domains add yourdomain.com
```

---

## 📱 Demo Accounts

After deployment, use these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.astralcore.com | Demo123!Admin |
| Therapist | therapist@demo.astralcore.com | Demo123!Therapist |
| Client | client@demo.astralcore.com | Demo123!Client |

---

## 🔗 Important URLs

- **Live App**: https://astral-core-v7.vercel.app
- **Vercel Dashboard**: https://vercel.com/damatnic/astral-core-v7
- **Analytics**: https://vercel.com/damatnic/astral-core-v7/analytics
- **Logs**: https://vercel.com/damatnic/astral-core-v7/logs

---

## 💡 Pro Tips

1. **Use Preview Deployments** - Test changes before production
2. **Monitor Performance** - Check Speed Insights regularly
3. **Set Up Alerts** - Configure notifications for errors
4. **Use Aliases** - Create custom domains for different environments
5. **Enable Analytics** - Track user behavior and performance

---

## 🎉 You're All Set!

Your Vercel deployment is now fully configured with:
- ✅ One-command deployment
- ✅ Interactive monitoring dashboard
- ✅ Automatic environment variables
- ✅ Health checks and analytics
- ✅ Easy rollback capabilities

**Deploy with confidence using:**
```bash
npm run deploy
```

Need help? Check the monitoring dashboard:
```bash
npm run monitor
```