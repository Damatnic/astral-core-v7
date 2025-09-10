# Production Environment Setup

This guide covers deploying and configuring Astral Core v7 for production environments with HIPAA compliance and enterprise security.

## Overview

The production environment requires the highest level of security, performance, and reliability for handling Protected Health Information (PHI) in compliance with HIPAA regulations.

## Prerequisites

### Infrastructure Requirements

#### Minimum Specifications

- **Application Servers**: 2x 8 vCPU, 16GB RAM, 100GB SSD
- **Database**: PostgreSQL 14+ with 4 vCPU, 8GB RAM, 500GB SSD
- **Load Balancer**: Application Load Balancer with SSL termination
- **Storage**: Encrypted S3 bucket for file storage
- **CDN**: CloudFront for static assets
- **Monitoring**: CloudWatch, Sentry for error tracking

#### Network Security

- **VPC**: Isolated network with private subnets
- **Security Groups**: Restrictive firewall rules
- **WAF**: Web Application Firewall
- **DDoS Protection**: AWS Shield Advanced
- **SSL/TLS**: TLS 1.3 with strong ciphers

### Compliance Requirements

#### HIPAA Technical Safeguards

- Data encryption at rest and in transit
- Access controls and audit logging
- Automatic logoff and unique user identification
- Data integrity and transmission security

#### Security Certifications

- SOC 2 Type II compliance
- Regular penetration testing
- Vulnerability assessments
- Business Associate Agreements (BAAs)

## Environment Configuration

### Production Environment Variables

Create `.env.production` with production-specific values:

```bash
# ==============================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================

# Database (high-availability cluster with SSL)
DATABASE_URL="postgresql://astral_prod:STRONG_PROD_PASSWORD@prod-db-cluster.amazonaws.com:5432/astralcore_prod?sslmode=require&sslcert=client-cert.pem&sslkey=client-key.pem&sslrootcert=server-ca.pem"
DIRECT_URL="postgresql://astral_prod:STRONG_PROD_PASSWORD@prod-db-cluster.amazonaws.com:5432/astralcore_prod?sslmode=require&sslcert=client-cert.pem&sslkey=client-key.pem&sslrootcert=server-ca.pem"

# Authentication (production domain)
NEXTAUTH_URL="https://app.astral-core.com"
NEXTAUTH_SECRET="PRODUCTION_SECRET_64_CHARS_LONG_NEVER_SHARE_THIS_KEY_ROTATE_QUARTERLY"

# Security (strong production keys - rotate quarterly)
ENCRYPTION_KEY="PRODUCTION_ENCRYPTION_KEY_64_CHARS_LONG_AES_256_GCM_COMPLIANT"
JWT_SIGNING_KEY="PRODUCTION_JWT_KEY_64_CHARS_LONG_ROTATE_QUARTERLY_HIGH_ENTROPY"
SESSION_TIMEOUT_MINUTES="15"  # Strict for production
MAX_LOGIN_ATTEMPTS="3"        # Strict for security
LOCKOUT_DURATION_MINUTES="30" # Longer lockout for production

# HIPAA Compliance (strict production settings)
AUDIT_LOG_RETENTION_DAYS="2555"  # 7 years as required
PHI_ENCRYPTION_ENABLED="true"    # MUST be true for HIPAA
REQUIRE_MFA="true"               # MUST be true for production

# Rate Limiting (strict for production)
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="50"    # Stricter than staging

# Email Configuration (production)
EMAIL_FROM="noreply@astral-core.com"
EMAIL_PROVIDER="resend"
RESEND_API_KEY="PRODUCTION_RESEND_API_KEY"

# File Storage (encrypted S3 production)
STORAGE_PROVIDER="s3"
AWS_S3_BUCKET="astral-core-prod-files-encrypted"
AWS_S3_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIAI***PROD***KEY***ID"
AWS_SECRET_ACCESS_KEY="PRODUCTION_AWS_SECRET_KEY_NEVER_COMMIT_TO_GIT"

# Analytics & Monitoring (production)
POSTHOG_KEY="phc_PRODUCTION_POSTHOG_KEY"
POSTHOG_HOST="https://app.posthog.com"
SENTRY_DSN="https://PRODUCTION_SENTRY_DSN@sentry.io/project"
SENTRY_ORG="astral-core"
SENTRY_PROJECT="astral-core-production"
SENTRY_AUTH_TOKEN="PRODUCTION_SENTRY_TOKEN"

# Feature Flags (production-ready features only)
ENABLE_CRISIS_INTERVENTION="true"  # Critical feature
ENABLE_AI_ASSISTANCE="true"        # If approved for production
ENABLE_VIDEO_SESSIONS="true"       # If infrastructure ready
ENABLE_GROUP_THERAPY="false"       # Still in development

# AI Integration (production keys with usage limits)
OPENAI_API_KEY="sk-PRODUCTION_OPENAI_KEY_WITH_LIMITS"
ANTHROPIC_API_KEY="PRODUCTION_ANTHROPIC_KEY_WITH_MONITORING"

# Payment Processing (STRIPE LIVE MODE)
STRIPE_PUBLISHABLE_KEY="pk_live_PRODUCTION_STRIPE_PUBLISHABLE_KEY"
STRIPE_SECRET_KEY="sk_live_PRODUCTION_STRIPE_SECRET_KEY_NEVER_SHARE"
STRIPE_WEBHOOK_SECRET="whsec_PRODUCTION_WEBHOOK_SECRET_FROM_STRIPE"

# Application Environment
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://app.astral-core.com"
NEXT_PUBLIC_APP_NAME="Astral Core"
NEXT_PUBLIC_APP_VERSION="7.0.0"

# OAuth Providers (production applications)
GOOGLE_CLIENT_ID="PRODUCTION_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="PRODUCTION_GOOGLE_CLIENT_SECRET"
GITHUB_ID="PRODUCTION_GITHUB_APP_ID"
GITHUB_SECRET="PRODUCTION_GITHUB_APP_SECRET"

# Additional Production Settings
REDIS_URL="rediss://prod-redis-cluster.amazonaws.com:6380?ssl_cert_reqs=required"
BACKUP_ENCRYPTION_KEY="SEPARATE_KEY_FOR_BACKUP_ENCRYPTION_ROTATE_MONTHLY"
AUDIT_WEBHOOK_URL="https://audit-service.internal.com/webhook"
COMPLIANCE_API_KEY="COMPLIANCE_MONITORING_API_KEY"
```

## Deployment Architecture

### AWS Infrastructure

#### Application Architecture

```
Internet Gateway
    ↓
Application Load Balancer (ALB)
    ↓
Auto Scaling Group (2-4 instances)
    ↓
Private Subnets (Multi-AZ)
    ↓
RDS PostgreSQL (Multi-AZ)
    ↓
Encrypted Storage (EBS/S3)
```

#### Infrastructure as Code (Terraform)

**main.tf:**

```hcl
# VPC Configuration
resource "aws_vpc" "astral_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "astral-core-vpc"
    Environment = "production"
    Compliance  = "hipaa"
  }
}

# Application Load Balancer
resource "aws_lb" "astral_alb" {
  name               = "astral-core-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = true

  tags = {
    Environment = "production"
    Compliance  = "hipaa"
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "astral_asg" {
  name                = "astral-core-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = 2
  max_size            = 4
  desired_capacity    = 2
  health_check_type   = "ELB"
  target_group_arns   = [aws_lb_target_group.astral_tg.arn]

  launch_template {
    id      = aws_launch_template.astral_lt.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "astral-core-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = "production"
    propagate_at_launch = true
  }
}

# RDS PostgreSQL (Multi-AZ)
resource "aws_db_instance" "astral_db" {
  identifier     = "astral-core-prod-db"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.r5.xlarge"

  allocated_storage     = 500
  max_allocated_storage = 2000
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.astral_db_key.arn

  db_name  = "astralcore_prod"
  username = "astral_prod"
  password = var.db_password

  multi_az               = true
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  security_group_names = [aws_security_group.db_sg.name]
  db_subnet_group_name = aws_db_subnet_group.astral_db_subnet_group.name

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "astral-core-prod-db"
    Environment = "production"
    Compliance  = "hipaa"
  }
}

# S3 Bucket (Encrypted)
resource "aws_s3_bucket" "astral_files" {
  bucket = "astral-core-prod-files-encrypted"

  tags = {
    Name        = "astral-core-prod-files"
    Environment = "production"
    Compliance  = "hipaa"
  }
}

resource "aws_s3_bucket_encryption" "astral_files_encryption" {
  bucket = aws_s3_bucket.astral_files.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.astral_s3_key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}
```

### Container Deployment (ECS Fargate)

**docker-compose.production.yml:**

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    image: astral-core:production
    container_name: astral-core-prod
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    ports:
      - '3000:3000'
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: 'awslogs'
      options:
        awslogs-group: '/ecs/astral-core-prod'
        awslogs-region: 'us-east-1'
        awslogs-stream-prefix: 'ecs'
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### Application Deployment Steps

#### 1. Infrastructure Setup

```bash
# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan -var-file="production.tfvars"

# Apply infrastructure
terraform apply -var-file="production.tfvars"
```

#### 2. Database Setup

```bash
# Create database migration user
psql -h prod-db-cluster.amazonaws.com -U postgres -c "
CREATE USER migration_user WITH PASSWORD 'SECURE_MIGRATION_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE astralcore_prod TO migration_user;
"

# Run production migrations
NODE_ENV=production npm run db:migrate:prod
```

#### 3. Application Deployment

```bash
# Build production image
docker build -t astral-core:production .

# Tag for ECR
docker tag astral-core:production $ECR_REGISTRY/astral-core:production

# Push to ECR
docker push $ECR_REGISTRY/astral-core:production

# Deploy to ECS
aws ecs update-service --cluster astral-core-prod --service astral-core-service --force-new-deployment
```

#### 4. Load Balancer Configuration

```bash
# Create SSL certificate
aws acm request-certificate \
  --domain-name app.astral-core.com \
  --validation-method DNS \
  --region us-east-1

# Update ALB listener for HTTPS
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERTIFICATE_ARN \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
```

## Security Configuration

### SSL/TLS Configuration

**nginx.production.conf:**

```nginx
server {
    listen 80;
    server_name app.astral-core.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.astral-core.com;

    # SSL Configuration (TLS 1.3 only for maximum security)
    ssl_certificate /etc/ssl/certs/astral-core.crt;
    ssl_certificate_key /etc/ssl/private/astral-core.key;
    ssl_protocols TLSv1.3;
    ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;

    # Security Headers (HIPAA compliance)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src 'self' https://js.stripe.com;" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    # Main application
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
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings ...
    }

    # Auth endpoints (stricter rate limiting)
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings ...
    }

    # Health check (no rate limiting)
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
```

### Database Security

```sql
-- Production database security configuration

-- Create audit user for logging
CREATE USER audit_user WITH PASSWORD 'AUDIT_USER_PASSWORD';
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO audit_user;

-- Enable row-level security
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WellnessEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY user_isolation ON "User"
    USING (id = current_setting('app.current_user')::uuid);

CREATE POLICY wellness_isolation ON "WellnessEntry"
    USING (userId = current_setting('app.current_user')::uuid);

-- Enable audit logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Reload configuration
SELECT pg_reload_conf();
```

### Network Security

```bash
# Security group rules (restrictive)

# ALB Security Group (Internet-facing)
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Application Security Group (ALB only)
aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID

# Database Security Group (Application only)
aws ec2 authorize-security-group-ingress \
  --group-id $DB_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $APP_SG_ID
```

## Monitoring & Alerting

### CloudWatch Monitoring

```bash
# Create custom metrics
aws cloudwatch put-metric-data \
  --namespace "AstralCore/Application" \
  --metric-data MetricName=ActiveUsers,Value=100,Unit=Count

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "AstralCore-HighErrorRate" \
  --alarm-description "Alert when error rate is high" \
  --metric-name ErrorRate \
  --namespace "AstralCore/Application" \
  --statistic Average \
  --period 300 \
  --threshold 5.0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Application Monitoring

**monitoring/production.js:**

```javascript
// Production monitoring configuration
const monitoring = {
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1, // 10% sampling for performance
    beforeSend: event => {
      // Filter out non-critical errors in production
      if (event.level === 'warning') return null;
      return event;
    }
  },

  metrics: {
    // Custom application metrics
    userSessions: new prometheus.Histogram({
      name: 'user_session_duration_seconds',
      help: 'Duration of user sessions',
      buckets: [60, 300, 900, 1800, 3600] // 1min to 1hour
    }),

    apiLatency: new prometheus.Histogram({
      name: 'api_request_duration_seconds',
      help: 'API request duration',
      labelNames: ['method', 'route', 'status']
    }),

    crisisAssessments: new prometheus.Counter({
      name: 'crisis_assessments_total',
      help: 'Total crisis assessments performed',
      labelNames: ['severity', 'outcome']
    })
  }
};
```

### Health Checks

**pages/api/health/index.ts:**

```typescript
// Comprehensive production health check
export default async function handler(req: Request, res: Response) {
  const checks = {
    database: false,
    redis: false,
    s3: false,
    stripe: false,
    encryption: false
  };

  try {
    // Database health check
    const dbResult = await prisma.$queryRaw`SELECT 1`;
    checks.database = !!dbResult;

    // Redis health check
    const redisResult = await redis.ping();
    checks.redis = redisResult === 'PONG';

    // S3 health check
    await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
    checks.s3 = true;

    // Stripe health check
    await stripe.accounts.retrieve();
    checks.stripe = true;

    // Encryption health check
    const testData = 'test';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    checks.encryption = testData === decrypted;

    const allHealthy = Object.values(checks).every(check => check);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      checks
    });
  }
}
```

## Backup & Disaster Recovery

### Automated Backups

**scripts/backup.sh:**

```bash
#!/bin/bash
set -euo pipefail

# Configuration
BACKUP_BUCKET="astral-core-backups-encrypted"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=90

# Database backup
echo "Starting database backup..."
pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d astralcore_prod \
  --verbose \
  --clean \
  --no-owner \
  --no-privileges \
  | gzip > "db-backup-${DATE}.sql.gz"

# Encrypt database backup
gpg --cipher-algo AES256 \
    --compress-algo 1 \
    --symmetric \
    --passphrase "$BACKUP_ENCRYPTION_KEY" \
    "db-backup-${DATE}.sql.gz"

# Upload to S3
aws s3 cp "db-backup-${DATE}.sql.gz.gpg" \
  "s3://${BACKUP_BUCKET}/database/" \
  --server-side-encryption aws:kms \
  --ssekms-key-id "$BACKUP_KMS_KEY"

# Files backup (S3 to S3 with versioning)
aws s3 sync \
  "s3://astral-core-prod-files-encrypted" \
  "s3://${BACKUP_BUCKET}/files/${DATE}/" \
  --delete

# Cleanup old backups
aws s3 ls "s3://${BACKUP_BUCKET}/database/" | \
  while read -r line; do
    file_date=$(echo $line | awk '{print $1}')
    file_name=$(echo $line | awk '{print $4}')

    if [[ $(date -d "$file_date" +%s) -lt $(date -d "$RETENTION_DAYS days ago" +%s) ]]; then
      aws s3 rm "s3://${BACKUP_BUCKET}/database/${file_name}"
    fi
  done

# Send backup notification
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ Astral Core production backup completed successfully: ${DATE}\"}"

echo "Backup completed successfully"
```

### Disaster Recovery Plan

```bash
# Recovery procedures

# 1. Database recovery
pg_restore \
  --host=$NEW_DB_HOST \
  --username=$DB_USER \
  --dbname=astralcore_prod \
  --clean \
  --if-exists \
  --verbose \
  "db-backup-latest.sql"

# 2. File recovery
aws s3 sync \
  "s3://astral-core-backups-encrypted/files/latest/" \
  "s3://astral-core-prod-files-encrypted/" \
  --delete

# 3. Application deployment
terraform apply -var-file="disaster-recovery.tfvars"
kubectl apply -f k8s/production/

# 4. Verify recovery
curl -f https://app.astral-core.com/api/health
npm run test:e2e:production
```

## Compliance & Auditing

### HIPAA Audit Logging

**lib/audit/audit-logger.ts:**

```typescript
// Production audit logger for HIPAA compliance
export class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async logPHIAccess(event: PHIAccessEvent) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'PHI_ACCESS',
      userId: event.userId,
      resourceId: event.resourceId,
      resourceType: event.resourceType,
      action: event.action,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      sessionId: event.sessionId,
      outcome: event.outcome,
      details: event.details
    };

    // Write to CloudWatch Logs
    await this.writeToCloudWatch(auditEntry);

    // Write to immutable audit store
    await this.writeToAuditStore(auditEntry);

    // Send to compliance monitoring
    await this.sendToComplianceMonitoring(auditEntry);
  }

  private async writeToAuditStore(entry: AuditEntry) {
    // Store in append-only S3 bucket with object lock
    const key = `audit-logs/${entry.timestamp.split('T')[0]}/${entry.timestamp}.json`;

    await s3
      .putObject({
        Bucket: 'astral-core-audit-logs-immutable',
        Key: key,
        Body: JSON.stringify(entry),
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: process.env.AUDIT_KMS_KEY,
        ObjectLockMode: 'GOVERNANCE',
        ObjectLockRetainUntilDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years
      })
      .promise();
  }
}
```

### Compliance Monitoring

```bash
# Daily compliance check script
#!/bin/bash

# Check encryption status
echo "Checking encryption compliance..."
aws s3api get-bucket-encryption --bucket astral-core-prod-files-encrypted
aws rds describe-db-instances --db-instance-identifier astral-core-prod-db | jq '.DBInstances[0].StorageEncrypted'

# Check access logs
echo "Checking access log retention..."
aws logs describe-log-groups --log-group-name-prefix "/aws/applicationloadbalancer/astral-core"

# Check backup status
echo "Checking backup compliance..."
aws s3 ls s3://astral-core-backups-encrypted/database/ | tail -7

# Check SSL/TLS configuration
echo "Checking SSL/TLS compliance..."
curl -I https://app.astral-core.com | grep -i "strict-transport-security"

# Generate compliance report
python scripts/generate-compliance-report.py --env production
```

## Performance Optimization

### Application Performance

```bash
# Production performance settings
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
export UV_THREADPOOL_SIZE=16

# PM2 production configuration
pm2 start ecosystem.production.js --env production
```

**ecosystem.production.js:**

```javascript
module.exports = {
  apps: [
    {
      name: 'astral-core-prod',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '2G',
      node_args: '--max-old-space-size=4096',
      error_file: '/var/log/astral-core/error.log',
      out_file: '/var/log/astral-core/out.log',
      log_file: '/var/log/astral-core/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

### Database Performance

```sql
-- Production database optimizations

-- Connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Memory settings
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- Checkpoint settings
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '64MB';

-- Logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Apply settings
SELECT pg_reload_conf();

-- Production indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email_hash ON "User" USING hash(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wellness_user_date ON "WellnessEntry"(userId, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_therapist_date ON "Appointment"(therapistId, scheduledAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_timestamp ON "AuditLog"(timestamp DESC);

-- Update statistics
ANALYZE;
```

## Deployment Checklist

### Pre-Deployment

- [ ] All secrets rotated and secured
- [ ] SSL certificates valid and configured
- [ ] Database migrations tested
- [ ] Backup and recovery procedures tested
- [ ] Security scanning completed
- [ ] Performance testing completed
- [ ] Compliance checklist verified
- [ ] BAAs in place with third-party services

### Deployment

- [ ] Blue-green deployment strategy
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] SSL/TLS configuration verified
- [ ] Security headers configured
- [ ] Rate limiting configured
- [ ] Monitoring and alerting active
- [ ] Audit logging enabled

### Post-Deployment

- [ ] All health checks green
- [ ] Security scan of live environment
- [ ] Performance metrics within SLA
- [ ] Backup procedures verified
- [ ] Compliance monitoring active
- [ ] Incident response plan updated
- [ ] Team notified of deployment

## Maintenance & Operations

### Regular Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash

# Security updates
sudo unattended-upgrades
docker system prune -f

# Database maintenance
psql -h $DB_HOST -U $DB_USER -d astralcore_prod -c "VACUUM ANALYZE;"

# SSL certificate check
certbot renew --quiet

# Log rotation
logrotate -f /etc/logrotate.d/astral-core

# Performance monitoring
aws cloudwatch get-metric-statistics \
  --namespace "AstralCore/Application" \
  --metric-name CPUUtilization \
  --start-time $(date -d '1 week ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average

# Security audit
nmap -sS -O app.astral-core.com
```

### Incident Response

1. **Detection**: Automated monitoring alerts
2. **Assessment**: Incident severity and impact
3. **Response**: Execute incident response plan
4. **Recovery**: Restore service to normal operation
5. **Post-incident**: Review and improve procedures

### 24/7 On-Call Procedures

- **Primary**: Senior DevOps Engineer
- **Secondary**: Application Team Lead
- **Escalation**: CTO and Compliance Officer
- **Communication**: Slack #incidents channel
- **Documentation**: Incident management system

## Resources

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [AWS HIPAA Compliance](https://aws.amazon.com/compliance/hipaa-compliance/)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
