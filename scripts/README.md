# Astral Core v7 - Migration Scripts

This directory contains the comprehensive database migration system for Astral Core v7. These scripts provide a robust, production-ready migration process with full rollback capabilities and comprehensive error handling.

## 📁 Script Overview

### Core Migration Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `preflight-check.js` | Pre-migration environment validation | `npm run migration:preflight` |
| `run-migrations.js` | Main migration execution | `npm run migration:run` |
| `rollback-migration.js` | Emergency rollback procedures | `npm run migration:rollback` |
| `migration-status.js` | Quick status checker | `npm run migration:status` |

### Supporting Files

- `../prisma/seed.js` - Demo data seeding script
- `../MIGRATION_GUIDE.md` - Comprehensive migration documentation

## 🚀 Quick Start

### 1. Check System Status
```bash
npm run migration:status
```

### 2. Run Pre-flight Check
```bash
npm run migration:preflight
```

### 3. Execute Migration
```bash
npm run migration:run
```

### 4. Full Migration Process
```bash
npm run migration:full
```

## 📋 Script Details

### Pre-flight Check (`preflight-check.js`)

**Purpose**: Validates environment readiness before migration

**Key Checks**:
- Node.js and NPM versions
- Environment variables and security configuration
- Database connectivity and version
- File permissions and disk space
- Dependencies and package integrity
- HIPAA compliance settings

**Options**:
```bash
node scripts/preflight-check.js --strict      # Treat warnings as errors
node scripts/preflight-check.js --save-report # Save detailed JSON report
node scripts/preflight-check.js --output-json # JSON output for automation
```

### Migration Runner (`run-migrations.js`)

**Purpose**: Executes complete migration process with error handling

**Features**:
- Environment variable validation
- Dependency installation verification
- Database connection testing
- Prisma client generation
- Migration execution with verification
- Optional demo data seeding
- Comprehensive logging

**Options**:
```bash
node scripts/run-migrations.js --seed      # Include demo data
node scripts/run-migrations.js --force     # Skip validation warnings  
node scripts/run-migrations.js --verbose   # Detailed logging
node scripts/run-migrations.js --skip-deps # Skip dependency checks
```

### Rollback Script (`rollback-migration.js`)

**Purpose**: Provides emergency rollback capabilities

**Features**:
- Migration rollback to any point
- Database backup and restore
- Code rollback integration
- Dry-run mode for safety
- Comprehensive verification

**Options**:
```bash
node scripts/rollback-migration.js --target <migration>  # Rollback to specific migration
node scripts/rollback-migration.js --backup             # Create backup first
node scripts/rollback-migration.js --restore <file>     # Restore from backup
node scripts/rollback-migration.js --dry-run            # Preview changes
node scripts/rollback-migration.js --confirm            # Skip confirmations
```

### Status Checker (`migration-status.js`)

**Purpose**: Quick health check for migration system

**Checks**:
- Database connectivity
- Migration status
- Schema validity
- Prisma client availability
- Environment configuration

**Options**:
```bash
node scripts/migration-status.js --json     # JSON output
node scripts/migration-status.js --verbose  # Detailed information
```

## 🔧 Environment Requirements

### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/astralcore_v7"
DIRECT_URL="postgresql://username:password@localhost:5432/astralcore_v7"

# Authentication & Security
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-32-char-secret"
ENCRYPTION_KEY="your-64-char-hex-key"
JWT_SIGNING_KEY="your-32-char-secret"
```

### System Requirements

- **Node.js**: 16+ (18+ recommended)
- **PostgreSQL**: 12+ (14+ recommended)
- **NPM**: 8+ or Yarn 1.22+
- **Disk Space**: 1GB+ free space recommended

## 📊 Migration Process Flow

```
1. Pre-flight Check
   ├── System validation
   ├── Environment check
   ├── Security audit
   └── Dependency verification

2. Migration Execution
   ├── Backup creation (optional)
   ├── Dependency installation
   ├── Database connection test
   ├── Prisma client generation
   ├── Migration deployment
   ├── Schema verification
   └── Demo data seeding (optional)

3. Post-Migration
   ├── Application testing
   ├── Performance verification
   └── Monitoring setup
```

## 🛡️ Safety Features

### Backup & Recovery
- Automatic backup creation before migrations
- Point-in-time recovery capabilities
- Backup validation and integrity checks

### Error Handling
- Comprehensive error logging
- Automatic rollback on critical failures
- Detailed error reporting with context

### Validation
- Multi-layer environment validation
- Schema integrity checks
- HIPAA compliance verification

## 📈 Monitoring & Logging

### Log Files
- `logs/migration-[timestamp].log` - Migration execution logs
- `logs/rollback-[timestamp].log` - Rollback process logs
- `reports/preflight-[timestamp].json` - Pre-flight reports

### Health Monitoring
```bash
npm run migration:status  # Quick status check
npm run health:check      # Application health
npm run perf:analyze      # Performance metrics
```

## 🚨 Emergency Procedures

### Quick Rollback
```bash
# Emergency rollback to previous migration
npm run migration:rollback --confirm

# Rollback with backup creation
npm run migration:rollback --backup --confirm
```

### Backup Restoration
```bash
# Restore from specific backup
node scripts/rollback-migration.js --restore backups/backup-file.sql
```

### Manual Database Recovery
```bash
# If scripts fail, manual recovery
psql -d astralcore_v7 < backups/pre-migration-backup.sql
npx prisma generate
npm run dev
```

## 🔍 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check connection
psql "postgresql://username:password@localhost:5432/astralcore_v7"

# Verify environment
echo $DATABASE_URL
```

**Migration Timeout**
```bash
# Check for locks
psql -c "SELECT * FROM pg_locks WHERE granted = false;"

# Kill blocking queries if necessary
```

**Schema Validation Failed**
```bash
# Force schema introspection
npx prisma db pull --force

# Compare schemas
npx prisma migrate status
```

### Getting Help

1. **Check Status**: `npm run migration:status`
2. **Run Preflight**: `npm run migration:preflight --verbose`
3. **Review Logs**: Check `logs/` directory
4. **Consult Guide**: See `../MIGRATION_GUIDE.md`

## 🧪 Development & Testing

### Testing Migrations
```bash
# Test in development
NODE_ENV=development npm run migration:full

# Dry run rollback
npm run migration:rollback --dry-run

# Validate with demo data
npm run migration:run --seed
```

### Demo Data
The seed script creates:
- 1 Administrator
- 2 Therapists with complete profiles
- 2 Clients with wellness data
- 1 Crisis responder
- Sample appointments, conversations, and groups
- 30 days of wellness tracking data

**Demo Credentials**:
- Admin: `admin@astral-core.app` / `admin123!`
- Therapist: `dr.sarah.johnson@astral-core.app` / `therapist123!`
- Client: `jane.doe@example.com` / `client123!`

## 📚 Additional Resources

- [Complete Migration Guide](../MIGRATION_GUIDE.md)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Version**: 7.0.0  
**Last Updated**: 2024-01-01  
**Maintainer**: Database Migration Agent