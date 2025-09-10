# Staging Environment Setup

This guide covers deploying and configuring Astral Core v7 for staging environments.

## Overview

The staging environment mirrors production as closely as possible while allowing for testing and validation before production deployment.

## Prerequisites

### Infrastructure Requirements

- **Server**: 4 vCPU, 8GB RAM minimum
- **Database**: PostgreSQL 14+ with SSL
- **Storage**: 50GB SSD storage
- **Network**: HTTPS/SSL certificate
- **Domain**: staging.astral-core.app (or your staging domain)

### Software Requirements

- **Node.js**: 18.17.0 LTS
- **PM2**: Process manager
- **Nginx**: Reverse proxy
- **Certbot**: SSL certificates
- **Git**: For deployment

## Environment Configuration

### Environment Variables

Create `.env.staging` with staging-specific values:

```bash
# ==============================================================================
# STAGING ENVIRONMENT CONFIGURATION
# ==============================================================================

# Database (separate staging database)
DATABASE_URL="postgresql://astral_staging:secure_password@staging-db.internal:5432/astralcore_staging?sslmode=require"
DIRECT_URL="postgresql://astral_staging:secure_password@staging-db.internal:5432/astralcore_staging?sslmode=require"

# Authentication
NEXTAUTH_URL="https://staging.astral-core.app"
NEXTAUTH_SECRET="staging-secret-different-from-prod"

# Security (production-like but separate keys)
ENCRYPTION_KEY="staging-encryption-key-32-bytes"
JWT_SIGNING_KEY="staging-jwt-key-different-from-prod"
SESSION_TIMEOUT_MINUTES="30"
MAX_LOGIN_ATTEMPTS="5"
LOCKOUT_DURATION_MINUTES="15"

# HIPAA Compliance (same as production)
AUDIT_LOG_RETENTION_DAYS="2555"
PHI_ENCRYPTION_ENABLED="true"
REQUIRE_MFA="true"  # Enable for testing MFA flows

# Rate Limiting (slightly more permissive than production)
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="75"

# Email Configuration
EMAIL_FROM="noreply@staging.astral-core.app"
EMAIL_PROVIDER="resend"
RESEND_API_KEY="your-staging-resend-key"

# File Storage (staging S3 bucket)
STORAGE_PROVIDER="s3"
AWS_S3_BUCKET="astral-core-staging-files"
AWS_S3_REGION="us-east-1"
AWS_ACCESS_KEY_ID="staging-aws-key-id"
AWS_SECRET_ACCESS_KEY="staging-aws-secret"

# Analytics & Monitoring
POSTHOG_KEY="staging-posthog-key"
POSTHOG_HOST="https://app.posthog.com"
SENTRY_DSN="https://staging-sentry-dsn@sentry.io/project"
SENTRY_ORG="your-org"
SENTRY_PROJECT="astral-core-staging"

# Feature Flags (enable all for testing)
ENABLE_CRISIS_INTERVENTION="true"
ENABLE_AI_ASSISTANCE="true"
ENABLE_VIDEO_SESSIONS="true"
ENABLE_GROUP_THERAPY="true"

# AI Integration (using separate staging keys)
OPENAI_API_KEY="staging-openai-key"
ANTHROPIC_API_KEY="staging-anthropic-key"

# Payment Processing (STRIPE TEST MODE)
STRIPE_PUBLISHABLE_KEY="pk_test_staging_key"
STRIPE_SECRET_KEY="sk_test_staging_key"
STRIPE_WEBHOOK_SECRET="whsec_staging_webhook_secret"

# Application Environment
NODE_ENV="staging"
NEXT_PUBLIC_APP_URL="https://staging.astral-core.app"
NEXT_PUBLIC_APP_NAME="Astral Core Staging"
NEXT_PUBLIC_APP_VERSION="7.0.0-staging"

# OAuth Providers (separate staging apps)
GOOGLE_CLIENT_ID="staging-google-client-id"
GOOGLE_CLIENT_SECRET="staging-google-client-secret"
GITHUB_ID="staging-github-app-id"
GITHUB_SECRET="staging-github-app-secret"
```

## Deployment Methods

### Option 1: Docker Deployment

#### 1. Create Docker Configuration

**docker-compose.staging.yml:**
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    container_name: astral-core-staging
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env.staging
    depends_on:
      - db
    networks:
      - astral-network

  db:
    image: postgres:14-alpine
    container_name: astral-core-db-staging
    restart: unless-stopped
    environment:
      POSTGRES_DB: astralcore_staging
      POSTGRES_USER: astral_staging
      POSTGRES_PASSWORD: secure_staging_password
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    networks:
      - astral-network

  nginx:
    image: nginx:alpine
    container_name: astral-core-nginx-staging
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/staging.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - app
    networks:
      - astral-network

volumes:
  postgres_staging_data:

networks:
  astral-network:
    driver: bridge
```

#### 2. Deploy with Docker

```bash
# Build and deploy
docker-compose -f docker-compose.staging.yml up -d

# Run migrations
docker-compose -f docker-compose.staging.yml exec app npm run db:migrate:prod

# Check logs
docker-compose -f docker-compose.staging.yml logs -f app
```

### Option 2: PM2 Deployment

#### 1. Server Setup

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt update
sudo apt install nginx

# Install Certbot
sudo apt install certbot python3-certbot-nginx
```

#### 2. Application Deployment

```bash
# Clone and build
git clone <repository-url> /opt/astral-core-staging
cd /opt/astral-core-staging
npm install
npm run build

# Configure environment
cp .env.example .env.staging
# Edit .env.staging with staging values

# Run migrations
npm run db:migrate:prod

# Start with PM2
pm2 start ecosystem.staging.config.js
```

**ecosystem.staging.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'astral-core-staging',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'staging',
      PORT: 3000
    },
    env_file: '.env.staging',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048'
  }]
};
```

#### 3. Nginx Configuration

**/etc/nginx/sites-available/astral-core-staging:**
```nginx
server {
    listen 80;
    server_name staging.astral-core.app;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.astral-core.app;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/staging.astral-core.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.astral-core.app/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
```

#### 4. SSL Certificate Setup

```bash
# Get SSL certificate
sudo certbot --nginx -d staging.astral-core.app

# Enable site
sudo ln -s /etc/nginx/sites-available/astral-core-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Database Setup

### PostgreSQL Configuration

```sql
-- Create staging database
CREATE DATABASE astralcore_staging;

-- Create staging user
CREATE USER astral_staging WITH ENCRYPTED PASSWORD 'secure_staging_password_2024';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE astralcore_staging TO astral_staging;

-- Enable SSL (in postgresql.conf)
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

### Database Security

```bash
# Configure pg_hba.conf for SSL connections
echo "hostssl astralcore_staging astral_staging 0.0.0.0/0 md5" >> /etc/postgresql/14/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Monitoring & Logging

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Application logs
pm2 logs astral-core-staging

# System monitoring
htop
df -h
free -h
```

### Database Monitoring

```sql
-- Monitor connections
SELECT count(*) as active_connections FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('astralcore_staging'));
```

### Log Management

```bash
# Rotate PM2 logs
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## Testing Procedures

### Automated Testing

```bash
# Run full test suite
npm run test:ci

# API integration tests
npm run test:integration

# Load testing (optional)
artillery run tests/load/staging.yml
```

### Manual Testing Checklist

#### Authentication
- [ ] User registration works
- [ ] Email verification works
- [ ] Login with email/password
- [ ] OAuth login (Google, GitHub)
- [ ] MFA setup and verification
- [ ] Password reset flow
- [ ] Account lockout after failed attempts

#### Core Features
- [ ] Wellness data entry and retrieval
- [ ] Crisis assessment flow
- [ ] Appointment scheduling
- [ ] File upload and download
- [ ] Notification system
- [ ] Real-time updates (WebSocket)

#### Payment Testing
- [ ] Subscription creation
- [ ] Payment method setup
- [ ] Webhook handling
- [ ] Failed payment scenarios
- [ ] Subscription cancellation

#### Security Testing
- [ ] Rate limiting works
- [ ] Data encryption/decryption
- [ ] Audit logging
- [ ] HIPAA compliance checks
- [ ] SSL/TLS configuration

## Deployment Automation

### CI/CD Pipeline

**GitHub Actions (.github/workflows/staging.yml):**
```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to staging
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.STAGING_HOST }}
        username: ${{ secrets.STAGING_USER }}
        key: ${{ secrets.STAGING_SSH_KEY }}
        script: |
          cd /opt/astral-core-staging
          git pull origin develop
          npm ci
          npm run build
          npm run db:migrate:prod
          pm2 reload astral-core-staging
```

### Database Migrations

```bash
# Backup before migration
pg_dump -h staging-db -U astral_staging astralcore_staging > backup-$(date +%Y%m%d-%H%M%S).sql

# Run migrations
npm run db:migrate:prod

# Verify migration
npm run db:studio
```

## Security Considerations

### Staging Security Checklist

- [ ] Separate encryption keys from production
- [ ] SSL/TLS enabled and configured
- [ ] Firewall rules configured
- [ ] Database access restricted
- [ ] Regular security updates
- [ ] Log monitoring enabled
- [ ] Backup procedures in place

### Access Control

```bash
# SSH key-based access only
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# UFW firewall rules
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

## Backup & Recovery

### Database Backups

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
pg_dump -h localhost -U astral_staging astralcore_staging | gzip > /backups/staging-db-$DATE.sql.gz

# Retention policy (keep 30 days)
find /backups -name "staging-db-*.sql.gz" -mtime +30 -delete
```

### Application Backups

```bash
# Backup application files
tar -czf /backups/staging-app-$(date +%Y%m%d-%H%M%S).tar.gz /opt/astral-core-staging

# Backup uploaded files
aws s3 sync s3://astral-core-staging-files /backups/staging-files/
```

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs astral-core-staging

# Check environment variables
pm2 show astral-core-staging

# Restart application
pm2 restart astral-core-staging
```

#### Database Connection Issues
```bash
# Test connection
psql -h localhost -U astral_staging -d astralcore_staging

# Check PostgreSQL status
sudo systemctl status postgresql

# Check SSL configuration
openssl s_client -connect localhost:5432 -starttls postgres
```

#### SSL Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test SSL configuration
curl -I https://staging.astral-core.app
```

## Performance Optimization

### Application Performance

```bash
# Enable production optimizations
NODE_ENV=staging
NODE_OPTIONS="--max-old-space-size=2048"

# Use PM2 cluster mode
pm2 start ecosystem.staging.config.js
```

### Database Performance

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_wellness_date ON "WellnessEntry"(date);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON "Appointment"("scheduledAt");

-- Analyze performance
ANALYZE;
```

## Maintenance

### Regular Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash

# Update system packages
sudo apt update && sudo apt upgrade -y

# PM2 maintenance
pm2 update
pm2 save

# Database maintenance
psql -h localhost -U astral_staging -d astralcore_staging -c "VACUUM ANALYZE;"

# Clear old logs
pm2 flush

# SSL certificate renewal (automated by certbot)
sudo certbot renew --quiet
```

### Monitoring Alerts

Set up alerts for:
- Application downtime
- High memory usage (>80%)
- High CPU usage (>80%)
- Database connection failures
- SSL certificate expiration
- Failed backup jobs

## Next Steps

After staging deployment:

1. **Run comprehensive tests** using the checklist above
2. **Performance testing** with realistic load
3. **Security audit** of the staging environment  
4. **Stakeholder review** of new features
5. **Production deployment** after approval

## Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt SSL](https://letsencrypt.org/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)