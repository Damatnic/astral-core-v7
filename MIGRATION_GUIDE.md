# Astral Core v7 - Database Migration Guide

## Overview

This guide provides step-by-step instructions for migrating the Astral Core v7 database. The migration system is designed to be safe, reversible, and production-ready with comprehensive error handling and rollback capabilities.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ (18+ recommended)
- PostgreSQL 12+ (14+ recommended)
- NPM 8+ or Yarn 1.22+
- Required environment variables configured

### Basic Migration

```bash
# 1. Run pre-flight check
node scripts/preflight-check.js

# 2. Execute migration
node scripts/run-migrations.js

# 3. Verify application works
npm run dev
```

## 📋 Pre-Migration Checklist

### Environment Setup

- [ ] Database server is running and accessible
- [ ] All required environment variables are set (see [Environment Variables](#environment-variables))
- [ ] Database credentials have necessary permissions
- [ ] Backup system is configured and tested
- [ ] Application is in maintenance mode (production only)

### Security Requirements

- [ ] `.env` file permissions are secure (600 or stricter)
- [ ] Encryption keys are properly configured
- [ ] HIPAA compliance settings are enabled
- [ ] Audit logging is configured for 7+ years retention

### System Resources

- [ ] Sufficient disk space (minimum 1GB free recommended)
- [ ] Database connection limits are adequate
- [ ] Network connectivity to database is stable

## 🔧 Migration Scripts

### 1. Pre-flight Check Script

**Purpose**: Validates environment and system readiness before migration.

```bash
# Basic check
node scripts/preflight-check.js

# Strict mode (warnings treated as errors)
node scripts/preflight-check.js --strict

# Save detailed report
node scripts/preflight-check.js --save-report

# JSON output for automation
node scripts/preflight-check.js --output-json
```

**What it checks:**
- Node.js and NPM versions
- Environment variables and security configuration
- Database connectivity and version
- File permissions and disk space
- Dependencies and package integrity

### 2. Migration Execution Script

**Purpose**: Executes the complete migration process with error handling.

```bash
# Standard migration
node scripts/run-migrations.js

# Migration with demo data seeding
node scripts/run-migrations.js --seed

# Force migration (skip warnings)
node scripts/run-migrations.js --force

# Verbose logging
node scripts/run-migrations.js --verbose

# Skip dependency check
node scripts/run-migrations.js --skip-deps
```

**Migration steps:**
1. Environment variable validation
2. Dependency installation and verification
3. Database connection testing
4. Prisma client generation
5. Migration execution
6. Schema verification
7. Optional demo data seeding
8. Migration log creation

### 3. Rollback Script

**Purpose**: Provides emergency rollback capabilities with backup/restore functionality.

```bash
# Rollback to previous migration
node scripts/rollback-migration.js

# Rollback to specific migration
node scripts/rollback-migration.js --target 20240101000000_init

# Create backup before rollback
node scripts/rollback-migration.js --backup

# Restore from backup file
node scripts/rollback-migration.js --restore backups/backup-2024-01-01.sql

# Dry run (preview changes)
node scripts/rollback-migration.js --dry-run

# Auto-confirm (no prompts)
node scripts/rollback-migration.js --confirm
```

## 📝 Environment Variables

### Required Variables

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/astralcore_v7"
DIRECT_URL="postgresql://username:password@localhost:5432/astralcore_v7"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-32-char-secret-here"

# Security
ENCRYPTION_KEY="your-64-char-hex-key-here"
JWT_SIGNING_KEY="your-32-char-secret-here"
```

### Security Variables

```bash
# HIPAA Compliance
PHI_ENCRYPTION_ENABLED="true"
AUDIT_LOG_RETENTION_DAYS="2555"
REQUIRE_MFA="true"

# Session Security
SESSION_TIMEOUT_MINUTES="15"
MAX_LOGIN_ATTEMPTS="5"
LOCKOUT_DURATION_MINUTES="15"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="50"
```

### Generating Secure Keys

```bash
# NEXTAUTH_SECRET and JWT_SIGNING_KEY
openssl rand -base64 32

# ENCRYPTION_KEY
openssl rand -hex 32
```

## 🏗️ Migration Process

### Phase 1: Pre-Migration Validation

1. **System Check**
   ```bash
   node scripts/preflight-check.js --verbose
   ```
   - Validates Node.js/NPM versions
   - Checks operating system compatibility
   - Verifies system resources

2. **Environment Validation**
   - Checks all required environment variables
   - Validates database connection strings
   - Ensures security configurations are proper

3. **Security Audit**
   - Verifies encryption settings
   - Checks file permissions
   - Validates HIPAA compliance settings

### Phase 2: Database Migration

1. **Backup Creation** (Production Recommended)
   ```bash
   # Automatic backup during migration
   node scripts/run-migrations.js --backup
   
   # Manual backup
   pg_dump -h localhost -U username -d astralcore_v7 > backup-$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Migration Execution**
   ```bash
   node scripts/run-migrations.js --verbose
   ```
   - Generates Prisma client
   - Applies pending migrations
   - Verifies schema integrity

3. **Verification**
   - Tests database connectivity
   - Validates schema structure
   - Checks data integrity

### Phase 3: Post-Migration Testing

1. **Application Startup**
   ```bash
   npm run dev
   ```

2. **Functional Testing**
   - User authentication
   - Data retrieval and storage
   - Core application features

3. **Performance Testing**
   ```bash
   npm run perf:analyze
   ```

## 🔄 Rollback Procedures

### Emergency Rollback Scenarios

1. **Migration Fails**: Automatic rollback triggered
2. **Data Corruption**: Manual rollback with backup restore
3. **Application Errors**: Code and database rollback
4. **Performance Issues**: Rollback to stable state

### Rollback Types

#### 1. Migration-Only Rollback
```bash
# Rollback last migration
node scripts/rollback-migration.js

# Rollback to specific migration
node scripts/rollback-migration.js --target 20240101000000_init
```

#### 2. Full System Rollback
```bash
# Rollback with backup creation
node scripts/rollback-migration.js --backup

# Rollback code and database
node scripts/rollback-migration.js --backup
git checkout previous-stable-commit
```

#### 3. Backup Restoration
```bash
# Restore from specific backup
node scripts/rollback-migration.js --restore backups/backup-2024-01-01.sql

# Manual restoration
psql -h localhost -U username -d astralcore_v7 < backup-file.sql
```

## 📊 Monitoring and Logging

### Migration Logs

Migration logs are automatically saved to:
- `logs/migration-[timestamp].log` - Migration execution logs
- `logs/rollback-[timestamp].log` - Rollback process logs
- `reports/preflight-[timestamp].json` - Pre-flight check reports

### Key Metrics to Monitor

1. **Migration Duration**: Should complete within expected timeframe
2. **Database Size**: Monitor growth during migration
3. **Error Rate**: Zero errors expected for successful migration
4. **Connection Pool**: Monitor database connections during migration

### Health Checks

```bash
# Application health check
curl -f http://localhost:3000/api/health

# Database connectivity check
npx prisma db pull --force --print

# Performance baseline
npm run perf:analyze
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Database Connection Failed
**Symptoms**: Cannot connect to database during migration
**Solutions**:
- Verify DATABASE_URL format and credentials
- Check database server is running
- Ensure network connectivity
- Validate firewall settings

```bash
# Test connection manually
psql "postgresql://username:password@localhost:5432/astralcore_v7"
```

#### 2. Migration Timeout
**Symptoms**: Migration hangs or times out
**Solutions**:
- Check database locks: `SELECT * FROM pg_locks WHERE granted = false;`
- Increase connection timeout
- Run migration during low-traffic period
- Consider breaking large migrations into smaller chunks

#### 3. Schema Validation Failed
**Symptoms**: Schema doesn't match expected structure
**Solutions**:
- Run schema introspection: `npx prisma db pull`
- Compare with expected schema
- Check for manual database changes
- Verify migration files are complete

#### 4. Insufficient Permissions
**Symptoms**: Permission denied errors during migration
**Solutions**:
- Verify database user has necessary permissions
- Check schema creation permissions
- Validate table modification rights
- Ensure index creation permissions

### Recovery Procedures

#### 1. Partial Migration Failure
```bash
# Check migration status
npx prisma migrate status

# Rollback failed migration
node scripts/rollback-migration.js --target last-successful-migration

# Re-run migration after fixing issues
node scripts/run-migrations.js
```

#### 2. Data Corruption
```bash
# Stop application
pm2 stop astral-core || kill -9 $(pgrep node)

# Restore from backup
node scripts/rollback-migration.js --restore backups/latest-backup.sql

# Verify data integrity
npm run test:integration
```

#### 3. Complete System Failure
```bash
# 1. Stop all services
pm2 stop all

# 2. Restore database
psql -d astralcore_v7 < backups/pre-migration-backup.sql

# 3. Rollback code
git reset --hard previous-stable-commit

# 4. Regenerate Prisma client
npx prisma generate

# 5. Start services
pm2 start all
```

## 🔒 Security Considerations

### Data Protection

1. **Encryption at Rest**: All PHI data is encrypted using AES-256-GCM
2. **Encryption in Transit**: All database connections use SSL/TLS
3. **Access Control**: Database users have minimal required permissions
4. **Audit Logging**: All migration activities are logged for compliance

### HIPAA Compliance

- Migration logs exclude PHI data
- Backup files are encrypted
- Access is restricted to authorized personnel
- All activities are audited and logged

### Security Checklist

- [ ] Database connections use SSL/TLS
- [ ] Backup files are encrypted and secured
- [ ] Migration logs exclude sensitive data
- [ ] Access is limited to authorized personnel
- [ ] All activities are properly audited

## 📈 Performance Optimization

### Database Performance

1. **Index Optimization**: Ensure proper indexes are created
2. **Connection Pooling**: Configure appropriate pool sizes
3. **Query Optimization**: Monitor slow queries during migration
4. **Resource Monitoring**: Track CPU, memory, and disk usage

### Migration Performance

```bash
# Run performance analysis after migration
npm run perf:analyze

# Check database performance
npm run db:optimize

# Monitor application performance
npm run perf:webvitals
```

## 🚨 Production Deployment

### Pre-Production Steps

1. **Staging Environment Testing**
   ```bash
   # Test full migration process in staging
   NODE_ENV=staging node scripts/run-migrations.js
   ```

2. **Load Testing**
   ```bash
   # Run performance tests
   npm run test:e2e
   npm run perf:lighthouse
   ```

3. **Backup Strategy**
   ```bash
   # Create full database backup
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > pre-migration-backup.sql
   ```

### Production Migration

1. **Maintenance Mode**: Enable application maintenance mode
2. **Final Backup**: Create immediate pre-migration backup
3. **Migration Execution**: Run migration with full logging
4. **Verification**: Comprehensive post-migration testing
5. **Monitoring**: Active monitoring for 24-48 hours post-migration

### Post-Migration Steps

1. **Health Monitoring**
   ```bash
   # Continuous health checks
   npm run health:check
   ```

2. **Performance Baseline**
   ```bash
   # Establish new performance baseline
   npm run perf:full
   ```

3. **Error Monitoring**: Monitor application logs for any issues
4. **User Communication**: Notify users of successful migration

## 📞 Support and Escalation

### Support Channels

- **Technical Issues**: Create GitHub issue with migration logs
- **Emergency Rollback**: Use emergency rollback procedures
- **Data Recovery**: Follow backup restoration procedures

### Escalation Procedures

1. **Level 1**: Application-level issues - Use rollback scripts
2. **Level 2**: Database corruption - Restore from backup
3. **Level 3**: System failure - Full disaster recovery

## 📚 Additional Resources

### Documentation

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

### Tools

- **Database Administration**: pgAdmin, DBeaver
- **Monitoring**: Grafana, Prometheus
- **Backup Management**: pg_dump, pg_restore

### Best Practices

1. **Always test migrations in staging first**
2. **Create backups before any production migration**
3. **Monitor system performance during migration**
4. **Have rollback procedures ready and tested**
5. **Document any custom migration procedures**

---

## ⚡ Quick Command Reference

```bash
# Pre-flight check
node scripts/preflight-check.js

# Standard migration
node scripts/run-migrations.js

# Migration with seeding
node scripts/run-migrations.js --seed

# Rollback to previous
node scripts/rollback-migration.js

# Rollback with backup
node scripts/rollback-migration.js --backup

# Dry run rollback
node scripts/rollback-migration.js --dry-run

# Health check
npm run health:check

# Performance check
npm run perf:analyze
```

---

*This migration guide is part of the Astral Core v7 deployment system. For updates and additional resources, refer to the project repository.*