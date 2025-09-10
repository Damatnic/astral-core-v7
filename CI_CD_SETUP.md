# CI/CD Pipeline Setup for Astral Core v7

## Overview

This document describes the comprehensive CI/CD pipeline setup for Astral Core v7, including automated testing, security scanning, deployment automation, and monitoring.

## 🏗️ Pipeline Architecture

### Workflow Structure

```
Pull Request → Validation → Security Scan → Performance Test
                    ↓
Main Branch → Build → Test → Security → Deploy Staging → Deploy Production
                    ↓
Scheduled → Dependency Updates → Security Scans → Performance Tests
```

## 📋 Workflows

### 1. Pull Request Validation (`pr-validation.yml`)

**Triggers:** Pull requests to main/master/develop
**Purpose:** Comprehensive validation of code changes

**Jobs:**

- **Code Quality**: ESLint, TypeScript checking, Prettier formatting
- **Testing**: Unit, integration, and E2E tests with coverage
- **Security Scan**: Vulnerability scanning with Snyk and SonarCloud
- **Docker Build**: Verify container builds successfully
- **Performance**: Lighthouse performance testing
- **Bundle Analysis**: Bundle size analysis and comparison

### 2. Production Deployment (`production-deploy.yml`)

**Triggers:** Push to main/master, manual dispatch, tags
**Purpose:** Automated production deployment with safety checks

**Jobs:**

- **Pre-deployment Validation**: Code quality and security checks
- **Build & Push**: Docker image building and registry push
- **Database Migration**: Safe database schema updates
- **Staging Deployment**: Deploy to staging environment first
- **Production Deployment**: Blue-green deployment with health checks
- **Post-deployment**: Cache clearing, monitoring updates

### 3. Security Scanning (`security-scan.yml`)

**Triggers:** Daily schedule, dependency changes, manual dispatch
**Purpose:** Comprehensive security analysis

**Jobs:**

- **Dependency Scanning**: npm audit, Snyk, OSV Scanner
- **Static Analysis**: CodeQL, Semgrep, Snyk Code
- **Secret Scanning**: TruffleHog, GitLeaks
- **Container Scanning**: Trivy, Snyk Container, Anchore Grype
- **IaC Scanning**: Checkov, Trivy config scanning
- **License Compliance**: License compatibility checking

### 4. Performance Testing (`performance-testing.yml`)

**Triggers:** Daily schedule, code changes, manual dispatch
**Purpose:** Performance monitoring and regression detection

**Jobs:**

- **Build Analysis**: Build time and bundle size tracking
- **Lighthouse Testing**: Core Web Vitals and performance metrics
- **Load Testing**: Artillery and K6 load testing
- **Performance Profiling**: CPU and memory profiling
- **Report Generation**: Performance trend analysis

### 5. Database Migrations (`database-migrations.yml`)

**Triggers:** Schema changes, manual dispatch
**Purpose:** Safe database migration management

**Jobs:**

- **Schema Validation**: Prisma schema validation
- **Compatibility Testing**: Multi-version PostgreSQL testing
- **Staging Deployment**: Safe staging migration
- **Production Deployment**: Monitored production migration
- **Rollback Capability**: Automated rollback on failure

### 6. Code Quality (`code-quality.yml`)

**Triggers:** Code changes, daily schedule
**Purpose:** Comprehensive code quality analysis

**Jobs:**

- **Linting & Formatting**: ESLint and Prettier checks
- **TypeScript Analysis**: Type checking and unused code detection
- **Testing Suite**: Unit, integration, E2E with coverage
- **Complexity Analysis**: Code complexity and duplication detection
- **Documentation Check**: TSDoc and README validation
- **SonarCloud Analysis**: Quality gate enforcement

### 7. Dependency Management (`dependency-update.yml`)

**Triggers:** Daily schedule, manual dispatch
**Purpose:** Automated dependency updates and security patches

**Jobs:**

- **Security Audit**: Vulnerability scanning and reporting
- **Update Creation**: Automated PR creation for updates
- **Auto-merge**: Safe auto-merging of security patches
- **License Compliance**: License compatibility checking

## 🔧 Reusable Workflows

### Build Workflow (`reusable-build.yml`)

Standardized build process with caching and optimization

- Node.js setup with version pinning
- Dependency caching and installation
- Prisma client generation
- Build timing and size analysis
- Artifact uploading

### Test Workflow (`reusable-test.yml`)

Comprehensive testing with multiple strategies

- Unit, integration, and E2E testing
- Coverage threshold enforcement
- Multiple PostgreSQL version testing
- Playwright E2E testing
- Results aggregation and reporting

### Deploy Workflow (`reusable-deploy.yml`)

Production-ready deployment with safety measures

- Multiple deployment strategies (rolling, blue-green, recreate)
- Health checks and smoke tests
- Automated rollback on failure
- Notification system integration
- Deployment tracking and monitoring

## 🛠️ Scripts and Automation

### Deployment Scripts

- **`scripts/deployment/deploy.sh`**: Main deployment script
- **`scripts/deployment/rollback.sh`**: Rollback automation
- **`scripts/docker/docker-entrypoint.sh`**: Container startup script

### Kubernetes Manifests

- **`scripts/kubernetes/deployment.yaml`**: Production Kubernetes resources
- **`scripts/kubernetes/secrets-template.yaml`**: Secret management template

## 🔐 Security Configuration

### Secret Management

All sensitive data is managed through GitHub Secrets and Kubernetes Secrets:

**Required GitHub Secrets:**

- `DATABASE_URL`: Production database connection
- `NEXTAUTH_SECRET`: Authentication secret
- `STRIPE_SECRET_KEY`: Payment processing
- `DOCKER_REGISTRY_TOKEN`: Container registry access
- `KUBE_CONFIG`: Kubernetes cluster access
- `SNYK_TOKEN`: Security scanning
- `CODECOV_TOKEN`: Coverage reporting
- `SONAR_TOKEN`: Code quality analysis

### Security Scanning

- **Dependency Scanning**: npm audit, Snyk, OSV
- **Code Analysis**: CodeQL, Semgrep
- **Secret Detection**: TruffleHog, GitLeaks
- **Container Security**: Trivy, Anchore
- **License Compliance**: Automated license checking

## 📊 Monitoring and Notifications

### Performance Monitoring

- Lighthouse CI for Core Web Vitals
- Bundle size tracking
- Load testing with Artillery and K6
- Performance regression detection

### Notification Channels

- GitHub PR comments and checks
- Slack notifications (configurable)
- Email alerts for security issues
- Dashboard updates for deployments

## 🚀 Getting Started

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/astral-core-v7.git
cd astral-core-v7

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 2. GitHub Secrets Configuration

Set up the following secrets in your GitHub repository:

```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret-key"

# Payment Processing
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Container Registry
DOCKER_REGISTRY_TOKEN="ghp_..."

# Kubernetes
KUBE_CONFIG="base64-encoded-kubeconfig"

# External Services
SNYK_TOKEN="your-snyk-token"
CODECOV_TOKEN="your-codecov-token"
SONAR_TOKEN="your-sonar-token"
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
```

### 3. Kubernetes Setup

```bash
# Create namespace
kubectl create namespace astral-core

# Create secrets from template
cp scripts/kubernetes/secrets-template.yaml secrets.yaml
# Edit secrets.yaml with your values
kubectl apply -f secrets.yaml
rm secrets.yaml

# Deploy application
kubectl apply -f scripts/kubernetes/deployment.yaml
```

### 4. Manual Deployment

```bash
# Deploy to staging
./scripts/deployment/deploy.sh --environment staging --tag v1.0.0

# Deploy to production
./scripts/deployment/deploy.sh --environment production --tag v1.0.0

# Rollback if needed
./scripts/deployment/rollback.sh --environment production
```

## 🔄 Workflow Customization

### Environment Configuration

Edit `.github/deployment/` configuration files:

- `default.env`: Global settings
- `staging.env`: Staging-specific settings
- `production.env`: Production-specific settings

### Notification Setup

Configure Slack notifications:

```bash
# Set Slack webhook URL in GitHub secrets
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

### Quality Gates

Customize quality thresholds in workflow files:

- Test coverage: 80% (configurable)
- Performance budgets: Lighthouse thresholds
- Security: Vulnerability severity levels
- Code quality: SonarCloud quality gates

## 📈 Performance Budgets

### Lighthouse Thresholds

- Performance: 80+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

### Bundle Size Limits

- Initial bundle: <1MB
- Route chunks: <500KB
- Vendor chunks: <2MB

### Load Testing Criteria

- Response time: <2000ms (95th percentile)
- Error rate: <0.1%
- Concurrent users: 100+ (production)

## 🆘 Troubleshooting

### Common Issues

**Build Failures:**

- Check Node.js version compatibility
- Verify environment variables are set
- Review dependency conflicts

**Deployment Issues:**

- Validate Kubernetes configuration
- Check secret availability
- Verify Docker image accessibility

**Test Failures:**

- Review test database configuration
- Check environment variable setup
- Validate test data fixtures

**Security Scan Failures:**

- Review vulnerability reports
- Update vulnerable dependencies
- Configure security scanning exceptions

### Support Resources

- GitHub Issues: Report bugs and request features
- Documentation: Comprehensive setup guides
- Monitoring Dashboard: Real-time system status
- Alert System: Automated issue notifications

## 📝 Maintenance

### Regular Tasks

- **Weekly**: Review dependency updates
- **Monthly**: Security audit and penetration testing
- **Quarterly**: Performance baseline updates
- **Annually**: Security infrastructure review

### Monitoring

- Pipeline success rates
- Deployment frequency
- Performance trends
- Security posture metrics

---

This CI/CD pipeline provides enterprise-grade automation with security, performance, and reliability as core principles. The setup enables rapid, safe deployments while maintaining high code quality standards.
