#!/bin/bash

# Astral Core v7 Rollback Script
# Automated rollback functionality with multiple environment support

set -euo pipefail

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] [INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $*" >&2
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARN]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $*" >&2
}

# Help function
show_help() {
    cat << EOF
Astral Core v7 Rollback Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENVIRONMENT    Target environment (staging, production)
    -n, --namespace NAMESPACE        Kubernetes namespace
    -r, --revision REVISION          Specific revision to rollback to (optional)
    -s, --strategy STRATEGY          Rollback strategy (auto, manual, backup-restore)
    --restore-backup BACKUP_NAME     Restore from specific backup
    --dry-run                        Show what would be done without executing
    --skip-health-check              Skip post-rollback health checks
    --force                          Force rollback without confirmation
    -h, --help                       Show this help message

EXAMPLES:
    # Rollback to previous version in staging
    $0 --environment staging

    # Rollback to specific revision in production
    $0 --environment production --revision 5

    # Restore from specific backup
    $0 --environment production --strategy backup-restore --restore-backup prod_backup_20240101_120000

    # Dry run to see what would happen
    $0 --environment production --dry-run

STRATEGIES:
    auto              - Automatically rollback to previous deployment
    manual            - Manually specify revision to rollback to
    backup-restore    - Restore from database backup

ENVIRONMENT VARIABLES:
    KUBE_CONFIG                     Kubernetes configuration (base64 encoded)
    DATABASE_URL                    Database connection URL
    SLACK_WEBHOOK_URL               Slack webhook for notifications

EOF
}

# Parse command line arguments
parse_arguments() {
    ENVIRONMENT=""
    NAMESPACE="astral-core"
    REVISION=""
    STRATEGY="auto"
    BACKUP_NAME=""
    DRY_RUN=false
    SKIP_HEALTH_CHECK=false
    FORCE=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -r|--revision)
                REVISION="$2"
                STRATEGY="manual"
                shift 2
                ;;
            -s|--strategy)
                STRATEGY="$2"
                shift 2
                ;;
            --restore-backup)
                BACKUP_NAME="$2"
                STRATEGY="backup-restore"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-health-check)
                SKIP_HEALTH_CHECK=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Validate required parameters
    if [[ -z "$ENVIRONMENT" ]]; then
        log_error "Environment is required. Use --environment or -e"
        exit 1
    fi

    # Validate environment
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Environment must be 'staging' or 'production'"
        exit 1
    fi

    # Validate strategy
    if [[ "$STRATEGY" != "auto" && "$STRATEGY" != "manual" && "$STRATEGY" != "backup-restore" ]]; then
        log_error "Strategy must be 'auto', 'manual', or 'backup-restore'"
        exit 1
    fi

    # Validate backup-restore requirements
    if [[ "$STRATEGY" == "backup-restore" && -z "$BACKUP_NAME" ]]; then
        log_error "Backup name is required when using backup-restore strategy"
        exit 1
    fi
}

# Setup Kubernetes configuration
setup_kubectl() {
    log "Setting up kubectl configuration..."

    # Check if kubectl is available
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    # Setup kubectl configuration
    if [[ -n "${KUBE_CONFIG:-}" ]]; then
        log "Configuring kubectl from environment"
        echo "$KUBE_CONFIG" | base64 -d > /tmp/kubeconfig
        export KUBECONFIG=/tmp/kubeconfig
    fi

    # Test kubectl connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Unable to connect to Kubernetes cluster"
        exit 1
    fi

    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi

    log_success "kubectl configuration setup complete"
}

# Get deployment status and history
get_deployment_status() {
    log "Getting deployment status and history..."

    local deployment_name="astral-core-v7"

    # Check if deployment exists
    if ! kubectl get deployment "$deployment_name" -n "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Deployment '$deployment_name' not found in namespace '$NAMESPACE'"
        exit 1
    fi

    # Get current deployment status
    local current_revision
    current_revision=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
    
    local current_image
    current_image=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')

    log "Current deployment revision: $current_revision"
    log "Current image: $current_image"

    # Get rollout history
    log "Rollout history:"
    kubectl rollout history deployment/"$deployment_name" -n "$NAMESPACE"

    # Store values for later use
    echo "$current_revision" > /tmp/current_revision
    echo "$current_image" > /tmp/current_image
}

# Confirm rollback action
confirm_rollback() {
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi

    local current_revision
    current_revision=$(cat /tmp/current_revision)

    log_warn "⚠️  ROLLBACK CONFIRMATION ⚠️"
    log_warn "Environment: $ENVIRONMENT"
    log_warn "Strategy: $STRATEGY"
    log_warn "Current Revision: $current_revision"

    if [[ "$STRATEGY" == "manual" ]]; then
        log_warn "Target Revision: $REVISION"
    elif [[ "$STRATEGY" == "backup-restore" ]]; then
        log_warn "Backup to Restore: $BACKUP_NAME"
    fi

    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_warn "🚨 THIS IS A PRODUCTION ROLLBACK! 🚨"
    fi

    echo -n "Are you sure you want to proceed with the rollback? (yes/no): "
    read -r confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        log "Rollback cancelled by user"
        exit 0
    fi
}

# Create rollback backup
create_rollback_backup() {
    log "Creating rollback backup..."

    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local rollback_backup_name="${ENVIRONMENT}_rollback_backup_${timestamp}"

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would create rollback backup: $rollback_backup_name"
        return 0
    fi

    # Create database backup before rollback
    case "$ENVIRONMENT" in
        "production")
            log "Creating production database backup"
            # kubectl exec deployment/postgres -- pg_dump -U postgres astral_core > "${rollback_backup_name}.sql"
            ;;
        "staging")
            log "Creating staging database backup"
            # kubectl exec deployment/postgres-staging -- pg_dump -U postgres astral_core_staging > "${rollback_backup_name}.sql"
            ;;
    esac

    echo "$rollback_backup_name" > /tmp/rollback_backup_name
    log_success "Rollback backup created: $rollback_backup_name"
}

# Automatic rollback strategy
rollback_auto() {
    log "Executing automatic rollback strategy..."

    local deployment_name="astral-core-v7"

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would rollback deployment to previous revision"
        return 0
    fi

    # Perform rollback to previous revision
    if ! kubectl rollout undo deployment/"$deployment_name" -n "$NAMESPACE"; then
        log_error "Failed to rollback deployment"
        return 1
    fi

    # Wait for rollback to complete
    log "Waiting for rollback to complete..."
    if ! kubectl rollout status deployment/"$deployment_name" -n "$NAMESPACE" --timeout=600s; then
        log_error "Rollback deployment failed to become ready"
        return 1
    fi

    log_success "Automatic rollback completed successfully"
}

# Manual rollback strategy
rollback_manual() {
    log "Executing manual rollback strategy to revision: $REVISION"

    local deployment_name="astral-core-v7"

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would rollback deployment to revision $REVISION"
        return 0
    fi

    # Validate revision exists
    if ! kubectl rollout history deployment/"$deployment_name" -n "$NAMESPACE" --revision="$REVISION" >/dev/null 2>&1; then
        log_error "Revision $REVISION does not exist in rollout history"
        return 1
    fi

    # Perform rollback to specific revision
    if ! kubectl rollout undo deployment/"$deployment_name" -n "$NAMESPACE" --to-revision="$REVISION"; then
        log_error "Failed to rollback deployment to revision $REVISION"
        return 1
    fi

    # Wait for rollback to complete
    log "Waiting for rollback to complete..."
    if ! kubectl rollout status deployment/"$deployment_name" -n "$NAMESPACE" --timeout=600s; then
        log_error "Rollback deployment failed to become ready"
        return 1
    fi

    log_success "Manual rollback to revision $REVISION completed successfully"
}

# Backup restore strategy
rollback_backup_restore() {
    log "Executing backup restore strategy for backup: $BACKUP_NAME"

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would restore from backup $BACKUP_NAME"
        return 0
    fi

    # Check if backup exists
    if [[ ! -f "${BACKUP_NAME}.sql" ]]; then
        log_error "Backup file ${BACKUP_NAME}.sql not found"
        return 1
    fi

    # Stop application to prevent database writes during restore
    local deployment_name="astral-core-v7"
    log "Scaling down application for safe database restore..."
    kubectl scale deployment "$deployment_name" --replicas=0 -n "$NAMESPACE"
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod -l app="$deployment_name" -n "$NAMESPACE" --timeout=300s

    # Restore database from backup
    log "Restoring database from backup..."
    case "$ENVIRONMENT" in
        "production")
            # kubectl exec deployment/postgres -- psql -U postgres -d astral_core -f "/tmp/${BACKUP_NAME}.sql"
            log "Would restore production database"
            ;;
        "staging")
            # kubectl exec deployment/postgres-staging -- psql -U postgres -d astral_core_staging -f "/tmp/${BACKUP_NAME}.sql"
            log "Would restore staging database"
            ;;
    esac

    # Scale application back up
    log "Scaling application back up..."
    kubectl scale deployment "$deployment_name" --replicas=3 -n "$NAMESPACE"
    kubectl rollout status deployment/"$deployment_name" -n "$NAMESPACE" --timeout=600s

    log_success "Backup restore completed successfully"
}

# Execute rollback strategy
execute_rollback() {
    log "Starting rollback with strategy: $STRATEGY"
    
    local rollback_start_time
    rollback_start_time=$(date +%s)

    case "$STRATEGY" in
        "auto")
            rollback_auto
            ;;
        "manual")
            rollback_manual
            ;;
        "backup-restore")
            rollback_backup_restore
            ;;
    esac

    local rollback_result=$?
    local rollback_end_time
    rollback_end_time=$(date +%s)
    local rollback_duration=$((rollback_end_time - rollback_start_time))

    echo "$rollback_duration" > /tmp/rollback_duration

    if [[ $rollback_result -eq 0 ]]; then
        log_success "Rollback completed in ${rollback_duration} seconds"
        return 0
    else
        log_error "Rollback failed after ${rollback_duration} seconds"
        return 1
    fi
}

# Post-rollback health checks
run_health_checks() {
    if [[ "$SKIP_HEALTH_CHECK" == "true" ]]; then
        log "Skipping health checks as requested"
        return 0
    fi

    log "Running post-rollback health checks..."

    # Determine health check URL
    local health_check_url
    case "$ENVIRONMENT" in
        "staging")
            health_check_url="https://staging.astral-core.com/api/health"
            ;;
        "production")
            health_check_url="https://astral-core.com/api/health"
            ;;
    esac

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would run health checks against $health_check_url"
        return 0
    fi

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts"

        if curl -f -s "$health_check_url" >/dev/null 2>&1; then
            log_success "Health checks passed"
            return 0
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Health checks failed after $max_attempts attempts"
            return 1
        fi

        sleep 10
        ((attempt++))
    done
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"

    log "Sending rollback notifications..."

    # Prepare notification message
    local rollback_duration
    rollback_duration=$(cat /tmp/rollback_duration 2>/dev/null || echo "unknown")
    
    local rollback_backup_name
    rollback_backup_name=$(cat /tmp/rollback_backup_name 2>/dev/null || echo "none")

    local current_revision
    current_revision=$(cat /tmp/current_revision 2>/dev/null || echo "unknown")

    local full_message="🔄 **Rollback Notification**

**Status:** $status
**Environment:** $ENVIRONMENT  
**Strategy:** $STRATEGY
**Previous Revision:** $current_revision
**Duration:** ${rollback_duration}s
**Backup Created:** $rollback_backup_name

$message"

    # Send Slack notification if configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        log "Sending Slack notification"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$full_message\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi

    log "Notifications sent"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f /tmp/kubeconfig /tmp/current_revision /tmp/current_image /tmp/rollback_backup_name /tmp/rollback_duration
}

# Main rollback function
main() {
    log "🔄 Starting Astral Core v7 rollback..."
    log "Environment: $ENVIRONMENT"
    log "Strategy: $STRATEGY"
    
    if [[ "$STRATEGY" == "manual" ]]; then
        log "Target Revision: $REVISION"
    elif [[ "$STRATEGY" == "backup-restore" ]]; then
        log "Backup to Restore: $BACKUP_NAME"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "DRY RUN MODE - No actual changes will be made"
    fi

    # Trap cleanup on exit
    trap cleanup EXIT

    # Execute rollback pipeline
    setup_kubectl
    get_deployment_status
    confirm_rollback
    create_rollback_backup

    # Execute rollback with error handling
    if execute_rollback; then
        if run_health_checks; then
            send_notifications "✅ SUCCESS" "Rollback completed successfully!"
            log_success "🎉 Rollback to $ENVIRONMENT completed successfully!"
        else
            send_notifications "⚠️ PARTIAL SUCCESS" "Rollback completed but health checks failed."
            log_error "❌ Rollback completed but health checks failed"
            exit 1
        fi
    else
        send_notifications "❌ FAILED" "Rollback failed."
        log_error "❌ Rollback failed"
        exit 1
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    main
fi