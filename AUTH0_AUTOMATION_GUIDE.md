# Auth0 Automation System - Complete Guide

## 🚀 Quick Start

The simplest way to get started is with the one-click setup:

```bash
node scripts/auth0-setup.js
```

This single command will:
- ✅ Detect your Vercel deployment URLs automatically
- ✅ Configure Auth0 application settings for production
- ✅ Set up PKCE authentication flow
- ✅ Configure callback URLs and CORS settings
- ✅ Set up custom claims and role mapping
- ✅ Validate the entire configuration
- ✅ Generate detailed reports

**No manual Auth0 dashboard configuration required!**

---

## 📋 System Overview

This automation system consists of 6 powerful scripts that work together to eliminate manual Auth0 configuration:

### Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **`auth0-setup.js`** | One-click complete setup | `node scripts/auth0-setup.js` |
| **`auth0-management-api.js`** | Core configuration automation | `node scripts/auth0-management-api.js` |
| **`auth0-url-detector.js`** | Smart URL detection | `node scripts/auth0-url-detector.js` |
| **`auth0-validator.js`** | Configuration validation | `node scripts/auth0-validator.js` |
| **`auth0-recovery.js`** | Error recovery and auto-fix | `node scripts/auth0-recovery.js` |
| **`auth0-backup.js`** | Backup and restore system | `node scripts/auth0-backup.js create` |

---

## 🎯 What Gets Configured Automatically

### Application Settings
- ✅ **Application Type**: Single Page Application (SPA)
- ✅ **OIDC Conformant**: Enabled for modern standards
- ✅ **Grant Types**: Authorization Code + Refresh Token
- ✅ **Token Endpoint Auth**: None (PKCE flow)
- ✅ **Cross-Origin Auth**: Enabled for SPAs

### URL Configuration
- ✅ **Callback URLs**: Auto-detected from Vercel deployments
- ✅ **Logout URLs**: Configured for all environments
- ✅ **Allowed Origins**: CORS settings for your domains
- ✅ **Web Origins**: Required for silent authentication

### Security Settings
- ✅ **PKCE**: Proof Key for Code Exchange enabled
- ✅ **Refresh Tokens**: Rotating tokens with proper expiration
- ✅ **JWT Configuration**: RS256 algorithm with reasonable lifetime
- ✅ **Session Settings**: 12-hour sessions with idle timeout

### Custom Claims & Roles
- ✅ **Role Mapping**: Automatic role assignment based on email patterns
- ✅ **Custom Claims**: `https://astralcore.app/roles` namespace
- ✅ **User Metadata**: Support for additional user information
- ✅ **Valid Roles**: ADMIN, THERAPIST, CLIENT, CRISIS_RESPONDER, SUPERVISOR

---

## 📖 Detailed Usage Guide

### 1. One-Click Setup (Recommended)

```bash
# Full automated setup
node scripts/auth0-setup.js

# Preview what would be done (dry run)
node scripts/auth0-setup.js --dry-run

# Skip confirmation prompt
node scripts/auth0-setup.js --force

# Enable verbose logging
node scripts/auth0-setup.js --verbose
```

### 2. Individual Script Usage

#### URL Detection
```bash
# Detect all deployment URLs
node scripts/auth0-url-detector.js

# Results saved to: logs/vercel-url-detection.json
```

#### Configuration Only
```bash
# Run just the Auth0 configuration
node scripts/auth0-management-api.js
```

#### Validation Only
```bash
# Validate current configuration
node scripts/auth0-validator.js

# Results saved to: logs/auth0-validation-report.json
```

#### Recovery System
```bash
# Check for issues and auto-recover
node scripts/auth0-recovery.js

# Results saved to: logs/auth0-recovery-report.json
```

#### Backup System
```bash
# Create a backup
node scripts/auth0-backup.js create

# Create compressed and encrypted backup
node scripts/auth0-backup.js create --compress --encrypt

# List recent backups
node scripts/auth0-backup.js list

# Restore from backup
node scripts/auth0-backup.js restore <backup-id>

# Compare configurations
node scripts/auth0-backup.js compare <id1> <id2>

# Clean up old backups
node scripts/auth0-backup.js cleanup --days=30
```

---

## ⚙️ Configuration

### Environment Variables (Optional)

All scripts work with built-in defaults, but you can override:

```bash
# Auth0 Configuration (defaults provided)
AUTH0_DOMAIN=dev-ac3ajs327vs5vzhk.us.auth0.com
AUTH0_CLIENT_ID=7ivKaost2wsuV47x6dAyj11Eo7jpcctX
AUTH0_CLIENT_SECRET=A7ABJwRg7n0otizVohWj15UN2zjEl5lbSW7sBlXPgvqsU0FPvyQmobUA0pQ8OiJo

# Backup encryption password
AUTH0_BACKUP_PASSWORD=your-secure-password

# Application URLs (auto-detected if not specified)
NEXTAUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Default Configuration Applied

```javascript
{
  // Application Settings
  app_type: "spa",
  oidc_conformant: true,
  token_endpoint_auth_method: "none",
  grant_types: ["authorization_code", "refresh_token"],
  cross_origin_auth: true,
  
  // JWT Settings
  jwt_configuration: {
    lifetime_in_seconds: 36000, // 10 hours
    alg: "RS256"
  },
  
  // Refresh Token Settings
  refresh_token: {
    rotation_type: "rotating",
    expiration_type: "expiring",
    token_lifetime: 2592000, // 30 days
    idle_token_lifetime: 1296000 // 15 days
  }
}
```

---

## 🔍 Monitoring & Logs

### Log Files Generated

All scripts generate detailed logs in the `logs/` directory:

```
logs/
├── auth0-setup-master.log          # One-click setup logs
├── auth0-management.log             # Configuration changes
├── auth0-validation.log             # Validation results
├── auth0-recovery.log               # Recovery actions
├── auth0-backup.log                 # Backup operations
├── vercel-url-detection.json        # Detected URLs
├── auth0-validation-report.json     # Validation report
├── auth0-recovery-report.json       # Recovery report
├── auth0-setup-final-report.json    # Complete setup report
└── backups/                         # Configuration backups
    ├── metadata.json
    └── backup-*.json
```

### Real-Time Progress

All scripts show real-time progress with:
- 📊 Progress bars for multi-step operations
- ✅ Success indicators for completed tasks
- ❌ Error indicators with detailed messages
- ⚠️ Warnings for non-critical issues
- 🔧 Recovery actions taken automatically

---

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. Network Connectivity Issues
```bash
# The recovery system handles this automatically
node scripts/auth0-recovery.js
```
**Auto-recovery**: Retries with exponential backoff

#### 2. Rate Limiting
```bash
# Recovery system detects and handles rate limits
node scripts/auth0-recovery.js
```
**Auto-recovery**: Waits and retries with appropriate delays

#### 3. Invalid Configuration
```bash
# Validation identifies issues
node scripts/auth0-validator.js

# Recovery system can fix many issues
node scripts/auth0-recovery.js
```

#### 4. Missing Deployment URLs
```bash
# URL detector finds all deployment URLs
node scripts/auth0-url-detector.js
```
**Strategies used**:
- Vercel CLI integration
- Git repository analysis
- Environment variable detection
- Pattern-based prediction

#### 5. Configuration Drift
```bash
# Recovery system detects drift and can restore
node scripts/auth0-recovery.js
```

### Manual Recovery

If automated recovery fails:

1. **Check logs** in the `logs/` directory
2. **Create backup** before making changes
3. **Use restore** from a known good backup
4. **Verify credentials** are correct
5. **Check network connectivity**

```bash
# Create backup before manual changes
node scripts/auth0-backup.js create --encrypt

# Restore from backup if needed
node scripts/auth0-backup.js restore <backup-id>
```

---

## 🔒 Security Features

### Automatic Security Configuration

- ✅ **PKCE Flow**: No client secret exposure
- ✅ **Rotating Refresh Tokens**: Enhanced security
- ✅ **Proper Token Lifetimes**: Reasonable session lengths
- ✅ **CORS Configuration**: Restricted to your domains
- ✅ **Encrypted Backups**: Optional backup encryption
- ✅ **Audit Logging**: All actions logged

### Role-Based Access Control

The system automatically configures role mapping based on email patterns:

```javascript
// Email-based role assignment
admin@* → ADMIN
therapist@* → THERAPIST  
doctor@* → THERAPIST
crisis@* → CRISIS_RESPONDER
supervisor@* → SUPERVISOR
* → CLIENT (default)
```

Custom roles can be set via user metadata:
```javascript
{
  "user_metadata": {
    "role": "THERAPIST"
  }
}
```

---

## 🚀 Advanced Usage

### Custom Configuration

You can extend the automation by modifying the scripts:

```javascript
// In auth0-management-api.js
const customConfig = {
  // Add your custom settings
  session_lifetime: 1440, // 24 hours
  idle_session_lifetime: 2160, // 36 hours
  
  // Custom callback URLs
  additionalCallbacks: [
    'https://custom-domain.com/callback'
  ]
};
```

### Integration with CI/CD

```yaml
# GitHub Actions example
name: Auth0 Setup
on:
  push:
    branches: [main]
jobs:
  setup-auth0:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Auth0
        run: node scripts/auth0-setup.js --force
        env:
          AUTH0_DOMAIN: ${{ secrets.AUTH0_DOMAIN }}
          AUTH0_CLIENT_ID: ${{ secrets.AUTH0_CLIENT_ID }}
          AUTH0_CLIENT_SECRET: ${{ secrets.AUTH0_CLIENT_SECRET }}
```

### Scheduled Monitoring

```bash
# Add to crontab for regular health checks
0 */6 * * * cd /path/to/project && node scripts/auth0-recovery.js
```

---

## 📈 Success Metrics

After running the setup, you should see:

### ✅ Setup Success Indicators
- All deployment URLs detected and configured
- 100% validation test pass rate
- No critical configuration issues
- Backup created successfully
- Auth0 dashboard shows "Auto-Configured" application

### 📊 Expected Results
- **URLs Detected**: 3-5 typical Vercel URLs
- **Callbacks Configured**: 6-10 callback URLs
- **Validation Tests**: 15+ tests passing
- **Setup Time**: 2-3 minutes typical

### 🎯 Production Ready Checklist
- [ ] SPA application type configured
- [ ] PKCE flow enabled
- [ ] Production URLs configured
- [ ] Custom claims working
- [ ] Role mapping functional
- [ ] Session settings appropriate
- [ ] Backup created
- [ ] Validation passing

---

## 🆘 Support & Help

### Getting Help

1. **Check the logs** - All operations are logged in detail
2. **Run validation** - `node scripts/auth0-validator.js`
3. **Try recovery** - `node scripts/auth0-recovery.js`
4. **Check this guide** - Most issues are covered here

### Command Help

Every script has built-in help:

```bash
node scripts/auth0-setup.js --help
node scripts/auth0-backup.js help
node scripts/auth0-validator.js --help
```

### System Status Check

```bash
# Quick health check
node scripts/auth0-recovery.js

# Detailed validation
node scripts/auth0-validator.js

# URL detection status
node scripts/auth0-url-detector.js
```

---

## 🎉 You're Ready for Production!

Once the setup completes successfully, your Auth0 configuration is production-ready:

- **No manual dashboard configuration needed**
- **Automatic URL detection and configuration**
- **Industry-standard security settings**
- **Comprehensive logging and monitoring**
- **Automatic backup and recovery**
- **Full validation and testing**

Your application can now handle authentication flows securely across all your deployment environments!

---

*Generated by the Astral Core Auth0 Automation System v1.0.0*