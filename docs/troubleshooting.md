# Troubleshooting Guide

This comprehensive guide covers common issues and solutions for Astral Core v7 across all environments.

## Quick Reference

### Emergency Contacts
- **Crisis Support**: Always available at 988 or 911
- **Technical Support**: tech-support@astral-core.com
- **Security Issues**: security@astral-core.com
- **HIPAA Compliance**: compliance@astral-core.com

### Health Check URLs
- **Development**: http://localhost:3000/api/health
- **Staging**: https://staging.astral-core.app/api/health
- **Production**: https://app.astral-core.com/api/health

## Installation & Setup Issues

### Node.js Version Issues

#### Problem: Node.js version incompatibility
```bash
Error: The engine "node" is incompatible with this module.
```

**Solution**:
```bash
# Check current version
node --version

# Install correct version using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18.17.0
nvm use 18.17.0
nvm alias default 18.17.0

# Verify installation
node --version  # Should show v18.17.0 or higher
npm --version   # Should show 9.0.0 or higher
```

### Package Installation Issues

#### Problem: npm install fails
```bash
npm ERR! peer dep missing
```

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps flag
npm install --legacy-peer-deps

# Or use exact versions
npm ci
```

#### Problem: Sharp installation fails on M1 Mac
```bash
Error: Cannot find module '@img/sharp-darwin-arm64'
```

**Solution**:
```bash
# Reinstall Sharp with correct architecture
npm uninstall sharp
npm install sharp --platform=darwin --arch=arm64

# Or use Rosetta for x64 compatibility
arch -x86_64 npm install sharp
```

## Database Issues

### Connection Problems

#### Problem: Cannot connect to PostgreSQL
```bash
Error: P1001: Can't reach database server at `localhost:5432`
```

**Solutions**:
1. **Check PostgreSQL is running**:
   ```bash
   # macOS
   brew services list | grep postgresql
   brew services start postgresql@14
   
   # Ubuntu/Debian
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   
   # Windows
   net start postgresql-x64-14
   ```

2. **Verify connection string**:
   ```bash
   # Test connection manually
   psql -h localhost -U your_user -d astralcore_v7
   
   # Check DATABASE_URL format
   echo $DATABASE_URL
   ```

3. **Check firewall settings**:
   ```bash
   # Allow PostgreSQL port
   sudo ufw allow 5432
   
   # Check if port is listening
   netstat -an | grep 5432
   lsof -i :5432
   ```

#### Problem: Authentication failed
```bash
Error: P1001: Authentication failed against database server
```

**Solution**:
```bash
# Reset user password
sudo -u postgres psql
ALTER USER your_user WITH PASSWORD 'new_password';

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://your_user:new_password@localhost:5432/astralcore_v7"

# Check pg_hba.conf authentication method
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Ensure line exists: local   all   all   md5
sudo systemctl restart postgresql
```

### Migration Issues

#### Problem: Migration fails with "relation already exists"
```bash
Error: P3005: The database schema is not empty
```

**Solution**:
```bash
# Option 1: Reset database (DEVELOPMENT ONLY)
npm run db:push --force-reset

# Option 2: Mark migrations as applied
npx prisma migrate resolve --applied "20240101000000_migration_name"

# Option 3: Manual schema sync
npx prisma db pull
npx prisma generate
```

#### Problem: Migration fails due to data
```bash
Error: Migration cannot be applied because data would be lost
```

**Solution**:
```bash
# Create custom migration
npx prisma migrate dev --create-only

# Edit generated migration file to preserve data
# Example: Add data migration steps before schema changes

# Apply the corrected migration
npx prisma migrate dev
```

### Performance Issues

#### Problem: Slow database queries
```bash
# Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**Solution**:
```bash
# Add missing indexes
CREATE INDEX CONCURRENTLY idx_user_email ON "User"(email);
CREATE INDEX CONCURRENTLY idx_wellness_user_date ON "WellnessEntry"(userId, date);

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "User" WHERE email = 'user@example.com';

# Update table statistics
ANALYZE;
```

## Authentication Issues

### NextAuth.js Problems

#### Problem: Session not persisting
```bash
Error: No session found
```

**Solutions**:
1. **Check NEXTAUTH_SECRET**:
   ```bash
   # Generate new secret
   openssl rand -base64 32
   
   # Add to .env
   NEXTAUTH_SECRET="generated_secret_here"
   
   # Restart development server
   npm run dev
   ```

2. **Check NEXTAUTH_URL**:
   ```bash
   # Must match your domain
   NEXTAUTH_URL="http://localhost:3000"  # Development
   NEXTAUTH_URL="https://staging.astral-core.app"  # Staging
   ```

3. **Clear browser cookies**:
   - Open Developer Tools → Application → Cookies
   - Delete `next-auth.session-token` and related cookies

#### Problem: OAuth provider errors
```bash
Error: OAuthCallback error
```

**Solutions**:
1. **Google OAuth setup**:
   ```bash
   # Verify redirect URI in Google Console
   # Must be: http://localhost:3000/api/auth/callback/google
   
   # Check credentials
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

2. **GitHub OAuth setup**:
   ```bash
   # Verify callback URL in GitHub App settings
   # Must be: http://localhost:3000/api/auth/callback/github
   
   # Check credentials
   GITHUB_ID="your-github-app-id"
   GITHUB_SECRET="your-github-app-secret"
   ```

### MFA Issues

#### Problem: TOTP codes not working
```bash
Error: Invalid TOTP token
```

**Solutions**:
1. **Check time synchronization**:
   ```bash
   # Sync system time
   sudo ntpdate -s time.nist.gov  # Linux/Mac
   w32tm /resync  # Windows
   ```

2. **Verify TOTP secret**:
   ```bash
   # Generate test token
   node -e "
   const speakeasy = require('speakeasy');
   console.log(speakeasy.totp({
     secret: 'YOUR_SECRET_HERE',
     encoding: 'base32'
   }));
   "
   ```

## Build & Deployment Issues

### Next.js Build Problems

#### Problem: Type errors during build
```bash
Error: Type 'string | undefined' is not assignable to type 'string'
```

**Solutions**:
1. **Run type checking**:
   ```bash
   npm run typecheck
   
   # Fix specific errors
   # Add type guards or default values
   const value = process.env.SOME_VAR || 'default';
   ```

2. **Check tsconfig.json**:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "skipLibCheck": true,
       "noUnusedLocals": false,
       "noUnusedParameters": false
     }
   }
   ```

#### Problem: Out of memory during build
```bash
Error: JavaScript heap out of memory
```

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# Or modify package.json
"scripts": {
  "build": "node --max-old-space-size=8192 node_modules/.bin/next build"
}
```

### Docker Issues

#### Problem: Docker build fails
```bash
Error: COPY failed: no source files were specified
```

**Solution**:
```dockerfile
# Check Dockerfile syntax
# Ensure .dockerignore doesn't exclude necessary files
# Verify COPY paths are correct

# Build with verbose output
docker build -t astral-core --progress=plain .
```

#### Problem: Container exits immediately
```bash
Error: Container exits with code 0
```

**Solution**:
```bash
# Check container logs
docker logs container_id

# Run interactively for debugging
docker run -it astral-core /bin/bash

# Check environment variables
docker run astral-core env
```

## Runtime Issues

### Application Crashes

#### Problem: Unhandled promise rejection
```bash
UnhandledPromiseRejectionWarning: Error: Connection lost
```

**Solution**:
```typescript
// Add proper error handling
try {
  const result = await someAsyncOperation();
} catch (error) {
  console.error('Operation failed:', error);
  // Handle error appropriately
}

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
```

#### Problem: Memory leaks
```bash
# Monitor memory usage
node --inspect server.js
# Open chrome://inspect in Chrome browser
```

**Solution**:
```bash
# Use clinic.js for diagnosis
npm install -g clinic
clinic doctor -- npm start

# Check for common causes
# - Event listeners not removed
# - Timers not cleared
# - Circular references
# - Large objects in closures
```

### Performance Issues

#### Problem: Slow API responses
```bash
# Add performance monitoring
const start = Date.now();
// ... operation ...
console.log(`Operation took ${Date.now() - start}ms`);
```

**Solutions**:
1. **Database query optimization**:
   ```typescript
   // Use select to limit fields
   const user = await prisma.user.findUnique({
     where: { id },
     select: { id: true, email: true, name: true }
   });
   
   // Add indexes for frequent queries
   // Use database query analysis
   ```

2. **Enable caching**:
   ```typescript
   // Add Redis caching
   const cached = await redis.get(key);
   if (cached) return JSON.parse(cached);
   
   const result = await expensiveOperation();
   await redis.setex(key, 300, JSON.stringify(result));
   ```

#### Problem: High CPU usage
```bash
# Profile CPU usage
node --prof app.js
# Generate readable profile
node --prof-process isolate-0x103800000-v8.log > processed.txt
```

**Solution**:
```bash
# Common causes and fixes
# - Synchronous operations (use async)
# - Inefficient algorithms (optimize)
# - Too many concurrent requests (add rate limiting)
# - Memory leaks causing GC pressure (fix leaks)
```

## Security Issues

### SSL/TLS Problems

#### Problem: SSL certificate errors
```bash
Error: UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

**Solutions**:
1. **Check certificate chain**:
   ```bash
   # Test SSL configuration
   openssl s_client -connect your-domain.com:443 -servername your-domain.com
   
   # Check certificate expiration
   echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

2. **Renew certificates**:
   ```bash
   # Using Certbot
   sudo certbot renew
   
   # Manual certificate update
   sudo certbot certonly --nginx -d your-domain.com
   ```

### Rate Limiting Issues

#### Problem: Rate limit false positives
```bash
Error: Too many requests from this IP
```

**Solutions**:
1. **Check rate limiting configuration**:
   ```typescript
   // Adjust limits in production
   const rateLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // Increase for production
     skipFailedRequests: true,
     skipSuccessfulRequests: false
   });
   ```

2. **Whitelist known IPs**:
   ```typescript
   const rateLimiter = rateLimit({
     skip: (req) => {
       const allowedIPs = ['192.168.1.100', '10.0.0.5'];
       return allowedIPs.includes(req.ip);
     }
   });
   ```

## Environment-Specific Issues

### Development Environment

#### Problem: Hot reload not working
```bash
# Next.js not detecting file changes
```

**Solution**:
```bash
# Increase file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Check polling settings
# Add to next.config.js
module.exports = {
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
};
```

### Staging Environment

#### Problem: Different behavior than development
```bash
# Environment-specific issues
```

**Solution**:
```bash
# Check environment variables
printenv | grep -i astral

# Compare configurations
diff .env.example .env.staging

# Check build differences
NODE_ENV=staging npm run build
NODE_ENV=production npm run build
```

### Production Environment

#### Problem: Application not starting after deployment
```bash
Error: Cannot find module 'next'
```

**Solutions**:
1. **Check dependencies**:
   ```bash
   # Install production dependencies
   npm ci --only=production
   
   # Check for missing peer dependencies
   npm ls
   ```

2. **Verify build artifacts**:
   ```bash
   # Ensure .next directory exists and is not empty
   ls -la .next/
   
   # Check build logs
   npm run build 2>&1 | tee build.log
   ```

## Crisis System Issues

### Crisis Assessment Problems

#### Problem: Crisis assessment not triggering alerts
```bash
# No crisis response generated
```

**Solutions**:
1. **Check crisis configuration**:
   ```bash
   # Verify feature flag
   ENABLE_CRISIS_INTERVENTION="true"
   
   # Check crisis thresholds in code
   ```

2. **Verify notification system**:
   ```typescript
   // Test crisis alert system
   await notificationService.sendCrisisAlert({
     userId: 'test-user-id',
     severity: 'HIGH',
     assessment: testAssessment
   });
   ```

3. **Check audit logging**:
   ```bash
   # Verify crisis events are logged
   tail -f /var/log/astral-core/crisis.log
   ```

## Payment System Issues

### Stripe Integration Problems

#### Problem: Webhook verification fails
```bash
Error: Webhook signature verification failed
```

**Solutions**:
1. **Check webhook secret**:
   ```bash
   # Verify STRIPE_WEBHOOK_SECRET
   echo $STRIPE_WEBHOOK_SECRET
   
   # Test webhook endpoint
   curl -X POST http://localhost:3000/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. **Verify endpoint URL**:
   ```bash
   # Stripe Dashboard → Webhooks → Endpoint details
   # Should match: https://your-domain.com/api/webhooks/stripe
   ```

#### Problem: Payment methods not saving
```bash
Error: Payment intent creation failed
```

**Solutions**:
1. **Check Stripe keys**:
   ```bash
   # Use test keys in development/staging
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_SECRET_KEY="sk_test_..."
   
   # Use live keys only in production
   STRIPE_PUBLISHABLE_KEY="pk_live_..."
   STRIPE_SECRET_KEY="sk_live_..."
   ```

2. **Test with Stripe CLI**:
   ```bash
   # Install Stripe CLI
   stripe login
   
   # Test webhook locally
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   
   # Trigger test events
   stripe trigger payment_intent.succeeded
   ```

## Monitoring & Debugging

### Logging Issues

#### Problem: Logs not appearing
```bash
# No application logs visible
```

**Solutions**:
1. **Check log configuration**:
   ```typescript
   // Ensure console.log/error are not suppressed
   if (process.env.NODE_ENV !== 'production') {
     console.log('Debug info:', debugData);
   }
   
   // Use proper logging library
   import winston from 'winston';
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' }),
     ],
   });
   ```

2. **Check log rotation**:
   ```bash
   # Ensure logs aren't being truncated
   tail -f /var/log/astral-core/app.log
   
   # Check disk space
   df -h
   ```

### Performance Monitoring

#### Problem: High response times
```bash
# API endpoints responding slowly
```

**Solutions**:
1. **Add performance monitoring**:
   ```typescript
   // Add timing middleware
   app.use((req, res, next) => {
     const start = Date.now();
     res.on('finish', () => {
       const duration = Date.now() - start;
       console.log(`${req.method} ${req.path} - ${duration}ms`);
     });
     next();
   });
   ```

2. **Monitor database performance**:
   ```sql
   -- Enable query logging
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   SELECT pg_reload_conf();
   
   -- Check slow queries
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

## Emergency Procedures

### System Down

1. **Immediate Response**:
   ```bash
   # Check system status
   curl -f https://app.astral-core.com/api/health
   
   # Check server status
   systemctl status astral-core
   
   # Check database
   pg_isready -h localhost -p 5432
   ```

2. **Emergency Restart**:
   ```bash
   # Restart application
   pm2 restart astral-core-prod
   
   # Restart database (if necessary)
   sudo systemctl restart postgresql
   
   # Check logs
   pm2 logs astral-core-prod --lines 100
   ```

### Data Recovery

1. **Database Recovery**:
   ```bash
   # Restore from backup
   pg_restore --clean --if-exists --verbose \
     -h localhost -U postgres -d astralcore_prod \
     latest-backup.sql
   ```

2. **File Recovery**:
   ```bash
   # Restore files from S3
   aws s3 sync s3://astral-core-backups/files/latest/ \
     s3://astral-core-prod-files/
   ```

## Getting Help

### Internal Resources

1. **Documentation**:
   - API Documentation: `/docs/README.md`
   - Environment Setup: `/docs/environments/`
   - Code Examples: `/docs/examples/`

2. **Logs and Monitoring**:
   ```bash
   # Application logs
   tail -f /var/log/astral-core/app.log
   
   # Database logs
   tail -f /var/log/postgresql/postgresql-14-main.log
   
   # System logs
   journalctl -u astral-core -f
   ```

### External Support

1. **Technical Support**: tech-support@astral-core.com
2. **Security Issues**: security@astral-core.com  
3. **HIPAA Compliance**: compliance@astral-core.com
4. **Emergency Hotline**: +1-XXX-XXX-XXXX

### Community Resources

1. **Next.js Issues**: https://github.com/vercel/next.js/issues
2. **Prisma Issues**: https://github.com/prisma/prisma/issues
3. **PostgreSQL Support**: https://postgresql.org/support/
4. **Stack Overflow**: Tag questions with `astral-core` and relevant technology tags

## Prevention

### Best Practices

1. **Regular Maintenance**:
   - Keep dependencies updated
   - Monitor security advisories
   - Regular backup testing
   - Performance monitoring

2. **Code Quality**:
   - Write comprehensive tests
   - Use TypeScript strictly
   - Follow linting rules
   - Code review process

3. **Security**:
   - Regular security audits
   - Dependency vulnerability scanning
   - Access control reviews
   - Encryption key rotation

4. **Documentation**:
   - Keep documentation current
   - Document all configuration changes
   - Maintain runbooks for common procedures
   - Share knowledge across team

---

## Emergency Crisis Support

**If you are in crisis or having thoughts of self-harm:**

- **Call 911** for immediate emergency assistance
- **Call 988** for the Suicide & Crisis Lifeline (24/7)  
- **Text HOME to 741741** for Crisis Text Line

**Help is always available. You matter, and your life has value.**

---

*Last updated: January 2024*