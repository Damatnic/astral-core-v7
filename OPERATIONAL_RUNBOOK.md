# Astral Core v7 - Operational Runbook

## 🚨 Emergency Contacts & Escalation

### Incident Response Team
| Role | Contact | Availability |
|------|---------|--------------|
| Primary On-Call | Configure in PagerDuty | 24/7 |
| Secondary On-Call | Configure in PagerDuty | 24/7 |
| Engineering Lead | Via Slack #engineering | Business Hours |
| Security Team | security@astralcore.app | 24/7 |

### Severity Levels
- **SEV1**: Complete service outage, data breach, or security incident
- **SEV2**: Major feature unavailable, significant performance degradation
- **SEV3**: Minor feature issues, non-critical bugs
- **SEV4**: Documentation, minor improvements

---

## 🔥 Common Issues & Solutions

### 1. Application Not Responding

**Symptoms:**
- Health check endpoint returns 503
- Users cannot access the application
- Timeout errors in logs

**Immediate Actions:**
```bash
# 1. Check Vercel deployment status
vercel list --count 5

# 2. Check health endpoint
curl -f https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health

# 3. Review recent deployments
vercel logs --follow

# 4. If needed, rollback immediately
vercel rollback
```

**Root Cause Analysis:**
- Check deployment logs for build failures
- Verify environment variables are set correctly
- Check database connectivity
- Review recent code changes

### 2. Database Connection Issues

**Symptoms:**
- "Database connection failed" errors
- Slow query performance
- Connection pool exhaustion

**Immediate Actions:**
```bash
# 1. Test database connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect().then(() => {
  console.log('Connected successfully');
  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err);
  process.exit(1);
});
"

# 2. Check connection pool status
curl https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health | jq '.checks.database'

# 3. Reset connections if needed
# Restart the application by triggering a new deployment
vercel --prod
```

**Resolution Steps:**
1. Verify DATABASE_URL is correct in Vercel environment
2. Check database server status
3. Review connection pool settings
4. Scale database if needed
5. Implement connection retry logic

### 3. Authentication Failures

**Symptoms:**
- Users cannot log in
- Session expires immediately
- MFA not working

**Immediate Actions:**
```bash
# 1. Verify NextAuth configuration
vercel env ls production | grep NEXTAUTH

# 2. Check session storage
curl -X POST https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health \
  -H "Content-Type: application/json" \
  -d '{"check": "cache"}'

# 3. Regenerate secrets if compromised
node scripts/setup-vercel-env.js
```

### 4. High Memory Usage

**Symptoms:**
- Memory utilization > 85%
- Frequent garbage collection
- Application crashes with OOM errors

**Immediate Actions:**
```bash
# 1. Check memory metrics
curl https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health | jq '.checks.memory'

# 2. Clear cache if needed
curl -X POST https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. Scale application
# Update vercel.json with increased memory limits
```

### 5. Performance Degradation

**Symptoms:**
- Slow page loads (LCP > 4s)
- High response times
- Poor Web Vitals scores

**Immediate Actions:**
```bash
# 1. Check performance metrics
npm run perf:analyze

# 2. Review cache hit rates
curl https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/monitoring/performance

# 3. Enable emergency caching
vercel env add EMERGENCY_CACHE_MODE production
echo "true" | vercel env add EMERGENCY_CACHE_MODE production
```

---

## 📊 Monitoring & Alerts

### Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/api/health` | Overall system health | HTTP 200, status: "healthy" |
| `/api/status` | Application status | HTTP 200, basic status info |
| `/api/monitoring/metrics` | Detailed metrics | HTTP 200, performance data |
| `/api/monitoring/performance` | Web Vitals | HTTP 200, LCP/FID/CLS data |

### Monitoring Commands

```bash
# Real-time monitoring
vercel logs --follow

# Check deployment status
vercel inspect [deployment-url]

# View environment variables (without values)
vercel env ls production

# Database monitoring
npx prisma studio

# Performance monitoring
npm run perf:full
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Response Time | > 1000ms | > 3000ms | Scale resources |
| Error Rate | > 1% | > 5% | Check logs, rollback if needed |
| Memory Usage | > 70% | > 85% | Clear cache, scale up |
| Database Connections | > 80% | > 95% | Increase pool size |
| Cache Hit Rate | < 70% | < 50% | Review caching strategy |

---

## 🔄 Deployment Procedures

### Standard Deployment

```bash
# 1. Run pre-deployment checks
npm run lint
npm run typecheck
npm run test

# 2. Deploy to preview
vercel

# 3. Test preview deployment
curl [preview-url]/api/health

# 4. Deploy to production
vercel --prod

# 5. Verify production
npm run health:check
```

### Emergency Hotfix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-issue

# 2. Make minimal changes
# ... edit files ...

# 3. Skip tests for emergency (use cautiously!)
SKIP_TYPE_CHECK=true vercel --prod

# 4. Verify fix
curl https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health

# 5. Create PR for proper review
gh pr create --title "Hotfix: [Issue]" --body "Emergency fix for..."
```

### Rollback Procedure

```bash
# 1. List recent deployments
vercel list --count 10

# 2. Identify last working deployment
# Look for the deployment URL/ID

# 3. Rollback
vercel rollback [deployment-url]

# 4. Verify rollback
curl https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health

# 5. Investigate issue
vercel logs [failed-deployment-url]
```

---

## 🔐 Security Procedures

### Suspected Security Breach

1. **Immediate Actions:**
   ```bash
   # Rotate all secrets immediately
   node scripts/setup-vercel-env.js
   
   # Invalidate all sessions
   # Update NEXTAUTH_SECRET to force re-authentication
   ```

2. **Investigation:**
   - Review access logs
   - Check for unauthorized database access
   - Audit recent code changes
   - Review user activity logs

3. **Recovery:**
   - Reset all user passwords
   - Notify affected users
   - File incident report
   - Implement additional security measures

### Secret Rotation

```bash
# 1. Generate new secrets
node scripts/setup-vercel-env.js

# 2. Update in Vercel
vercel env rm NEXTAUTH_SECRET production
echo "[new-secret]" | vercel env add NEXTAUTH_SECRET production

# 3. Trigger redeployment
vercel --prod

# 4. Verify new secrets are active
curl https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health
```

---

## 🗄️ Database Operations

### Backup Procedures

```bash
# Manual backup (adapt for your provider)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
pg_restore --list backup_*.sql

# Store in secure location
# Upload to S3/Cloud Storage with encryption
```

### Migration Procedures

```bash
# 1. Test migration locally
npx prisma migrate dev

# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Deploy to production
npx prisma migrate deploy

# 4. Rollback if needed
npx prisma migrate reset --skip-seed
```

### Data Recovery

```bash
# 1. Identify backup to restore
ls -la backups/

# 2. Create new database for testing
createdb astral_recovery

# 3. Restore backup
pg_restore -d astral_recovery backup_file.sql

# 4. Verify data integrity
psql astral_recovery -c "SELECT COUNT(*) FROM users;"

# 5. Switch application to recovery database
# Update DATABASE_URL in Vercel
```

---

## 📈 Performance Optimization

### Cache Management

```bash
# Clear all caches
curl -X POST https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/cache/clear

# Clear specific cache patterns
node -e "
const { cache } = require('./src/lib/caching/cache-strategies');
cache.invalidatePattern('user:*');
"

# Monitor cache performance
curl https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/monitoring/performance | jq '.cache'
```

### Bundle Optimization

```bash
# Analyze bundle size
npm run analyze:bundle

# Identify large dependencies
npx depcheck

# Remove unused dependencies
npm uninstall [package-name]

# Optimize images
npm run optimize:images
```

---

## 📝 Maintenance Windows

### Planned Maintenance Checklist

- [ ] Schedule maintenance window (off-peak hours)
- [ ] Notify users 48 hours in advance
- [ ] Create maintenance page
- [ ] Backup database
- [ ] Document rollback plan
- [ ] Perform maintenance tasks
- [ ] Verify all services operational
- [ ] Remove maintenance page
- [ ] Send completion notification

### Maintenance Mode

```bash
# Enable maintenance mode
vercel env add MAINTENANCE_MODE production
echo "true" | vercel env add MAINTENANCE_MODE production
vercel --prod

# Disable maintenance mode
vercel env rm MAINTENANCE_MODE production
vercel --prod
```

---

## 📚 Troubleshooting Tools

### Useful Commands

```bash
# View real-time logs
vercel logs --follow

# SSH into function (if available)
vercel dev

# Test API endpoints
curl -X POST https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/[endpoint] \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check DNS resolution
nslookup astral-core-v7-r7s1g00qe-astral-productions.vercel.app

# Test SSL certificate
openssl s_client -connect astral-core-v7-r7s1g00qe-astral-productions.vercel.app:443

# Performance testing
npm run perf:lighthouse
```

### Log Analysis

```bash
# Search for errors
vercel logs | grep ERROR

# Filter by time range
vercel logs --since 2h

# Export logs for analysis
vercel logs --output logs.txt
```

---

## 🆘 Disaster Recovery

### Full System Recovery

1. **Assessment:**
   - Determine extent of failure
   - Identify affected components
   - Estimate recovery time

2. **Recovery Steps:**
   ```bash
   # 1. Restore database from backup
   pg_restore -d $DATABASE_URL backup_latest.sql
   
   # 2. Redeploy application
   git checkout last-known-good-commit
   vercel --prod
   
   # 3. Verify core functionality
   npm run health:check
   
   # 4. Run integrity checks
   npm run test:integration
   ```

3. **Post-Recovery:**
   - Document incident
   - Identify root cause
   - Implement preventive measures
   - Update runbook with learnings

---

## 📞 Support Escalation

### Escalation Matrix

| Issue Type | First Response | Escalation | Time Limit |
|------------|---------------|------------|------------|
| SEV1 | On-call Engineer | Engineering Lead | 15 min |
| SEV2 | On-call Engineer | Team Lead | 30 min |
| SEV3 | Support Team | On-call Engineer | 2 hours |
| SEV4 | Support Team | Product Team | Next business day |

### External Support

- **Vercel Support**: https://vercel.com/support
- **Database Provider**: [Your provider's support]
- **Monitoring Provider**: [Your provider's support]

---

## 📅 Regular Maintenance Tasks

### Daily
- [ ] Review error logs
- [ ] Check health endpoints
- [ ] Monitor performance metrics
- [ ] Review security alerts

### Weekly
- [ ] Database backup verification
- [ ] Performance report review
- [ ] Security audit log review
- [ ] Dependency updates check

### Monthly
- [ ] Full system backup
- [ ] Security patches
- [ ] Performance optimization
- [ ] Capacity planning review
- [ ] Disaster recovery drill

### Quarterly
- [ ] Security audit
- [ ] Performance baseline update
- [ ] Runbook review and update
- [ ] Team training on procedures

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Next Review**: January 2025

---

## Quick Reference Card

```bash
# Emergency Commands
vercel rollback                          # Rollback deployment
vercel logs --follow                     # View live logs
curl .../api/health                      # Check health
node scripts/setup-vercel-env.js         # Regenerate secrets
vercel env add MAINTENANCE_MODE prod     # Enable maintenance
```

**Remember**: Stay calm, follow procedures, document everything.