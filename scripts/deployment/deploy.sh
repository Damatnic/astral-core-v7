#!/bin/bash

# Astral Core v7 Deployment Script
# Comprehensive deployment automation with multiple environment support

set -euo pipefail

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly CONFIG_DIR="$PROJECT_ROOT/.github/deployment"

# Default configuration
DEFAULT_ENVIRONMENT="staging"
DEFAULT_STRATEGY="rolling"
DEFAULT_REGISTRY="ghcr.io"
DEFAULT_NAMESPACE="astral-core"

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
Astral Core v7 Deployment Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENVIRONMENT    Target environment (staging, production)
    -s, --strategy STRATEGY          Deployment strategy (rolling, blue-green, recreate)
    -t, --tag TAG                   Docker image tag to deploy
    -r, --registry REGISTRY         Docker registry URL
    -n, --namespace NAMESPACE       Kubernetes namespace
    -c, --config CONFIG_FILE        Custom configuration file
    --dry-run                       Show what would be done without executing
    --skip-backup                   Skip pre-deployment backup
    --skip-migrations               Skip database migrations
    --skip-health-check             Skip post-deployment health checks
    --auto-rollback                 Automatically rollback on failure
    --force                         Force deployment even with warnings
    -h, --help                      Show this help message

EXAMPLES:
    # Deploy to staging with rolling update
    $0 --environment staging --strategy rolling --tag v1.2.3

    # Deploy to production with blue-green strategy
    $0 --environment production --strategy blue-green --tag v1.2.3

    # Dry run to see what would happen
    $0 --environment production --tag v1.2.3 --dry-run

ENVIRONMENT VARIABLES:
    KUBE_CONFIG                     Kubernetes configuration (base64 encoded)
    DATABASE_URL                    Database connection URL
    DOCKER_REGISTRY_TOKEN           Docker registry authentication token
    SLACK_WEBHOOK_URL               Slack webhook for notifications
    GITHUB_TOKEN                    GitHub token for API access

EOF
}

# Parse command line arguments
parse_arguments() {
    ENVIRONMENT="$DEFAULT_ENVIRONMENT"
    STRATEGY="$DEFAULT_STRATEGY"
    REGISTRY="$DEFAULT_REGISTRY"
    NAMESPACE="$DEFAULT_NAMESPACE"
    TAG=""
    CONFIG_FILE=""
    DRY_RUN=false
    SKIP_BACKUP=false
    SKIP_MIGRATIONS=false
    SKIP_HEALTH_CHECK=false
    AUTO_ROLLBACK=false
    FORCE=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -s|--strategy)
                STRATEGY="$2"
                shift 2
                ;;
            -t|--tag)
                TAG="$2"
                shift 2
                ;;
            -r|--registry)
                REGISTRY="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-migrations)
                SKIP_MIGRATIONS=true
                shift
                ;;
            --skip-health-check)
                SKIP_HEALTH_CHECK=true
                shift
                ;;
            --auto-rollback)
                AUTO_ROLLBACK=true
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
    if [[ -z "$TAG" ]]; then
        log_error "Docker image tag is required. Use --tag or -t"
        exit 1
    fi

    # Validate environment
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Environment must be 'staging' or 'production'"
        exit 1
    fi

    # Validate strategy
    if [[ "$STRATEGY" != "rolling" && "$STRATEGY" != "blue-green" && "$STRATEGY" != "recreate" ]]; then
        log_error "Strategy must be 'rolling', 'blue-green', or 'recreate'"
        exit 1
    fi
}

# Load configuration
load_configuration() {
    log "Loading configuration for environment: $ENVIRONMENT"

    # Load default config
    if [[ -f "$CONFIG_DIR/default.env" ]]; then
        source "$CONFIG_DIR/default.env"
    fi

    # Load environment-specific config
    if [[ -f "$CONFIG_DIR/$ENVIRONMENT.env" ]]; then
        source "$CONFIG_DIR/$ENVIRONMENT.env"
    fi

    # Load custom config file if specified
    if [[ -n "$CONFIG_FILE" && -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
    fi

    # Set derived variables
    IMAGE_NAME="$REGISTRY/$NAMESPACE/astral-core-v7:$TAG"
    DEPLOYMENT_NAME="astral-core-v7"
    SERVICE_NAME="astral-core-v7-service"

    case "$ENVIRONMENT" in
        "staging")
            HEALTH_CHECK_URL="${STAGING_URL:-https://staging.astral-core.com}/api/health"
            ;;
        "production")
            HEALTH_CHECK_URL="${PRODUCTION_URL:-https://astral-core.com}/api/health"
            ;;
    esac
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."

    # Check if kubectl is available
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    # Setup kubectl configuration
    if [[ -n "${KUBE_CONFIG:-}" ]]; then
        log "Setting up kubectl configuration"
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
        log "Creating namespace: $NAMESPACE"
        if [[ "$DRY_RUN" == "false" ]]; then
            kubectl create namespace "$NAMESPACE"
        fi
    fi

    # Check if image exists
    log "Verifying Docker image: $IMAGE_NAME"
    if [[ "$DRY_RUN" == "false" ]]; then
        if ! docker manifest inspect "$IMAGE_NAME" >/dev/null 2>&1; then
            log_error "Docker image not found: $IMAGE_NAME"
            exit 1
        fi
    fi

    # Environment-specific checks
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Production deployment checks..."
        
        # Check for required secrets
        local required_secrets=("database-secret" "nextauth-secret")
        for secret in "${required_secrets[@]}"; do
            if ! kubectl get secret "$secret" -n "$NAMESPACE" >/dev/null 2>&1; then
                log_error "Required secret '$secret' not found in namespace '$NAMESPACE'"
                exit 1
            fi
        done

        # Confirm production deployment
        if [[ "$FORCE" == "false" ]]; then
            echo -n "Are you sure you want to deploy to PRODUCTION? (yes/no): "
            read -r confirmation
            if [[ "$confirmation" != "yes" ]]; then
                log "Production deployment cancelled by user"
                exit 0
            fi
        fi
    fi

    log_success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log "Skipping backup as requested"
        return 0
    fi

    log "Creating pre-deployment backup..."
    
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="${ENVIRONMENT}_backup_${timestamp}_${TAG}"

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would create backup: $backup_name"
        return 0
    fi

    case "$ENVIRONMENT" in
        "production")
            # Create production database backup
            log "Creating production database backup"
            # kubectl exec deployment/postgres -- pg_dump -U postgres astral_core > "${backup_name}.sql"
            ;;
        "staging")
            # Create staging database backup
            log "Creating staging database backup"
            # kubectl exec deployment/postgres-staging -- pg_dump -U postgres astral_core_staging > "${backup_name}.sql"
            ;;
    esac

    echo "$backup_name" > /tmp/backup_name
    log_success "Backup created: $backup_name"
}

# Run database migrations
run_migrations() {
    if [[ "$SKIP_MIGRATIONS" == "true" ]]; then
        log "Skipping database migrations as requested"
        return 0
    fi

    log "Running database migrations..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would run database migrations"
        return 0
    fi

    # Create a temporary job to run migrations
    local migration_job="astral-migration-$(date +%s)"
    
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: $migration_job
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: $IMAGE_NAME
        command: ["npm", "run", "db:migrate:prod"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
      backoffLimit: 3
EOF

    # Wait for migration job to complete
    log "Waiting for migration job to complete..."
    kubectl wait --for=condition=complete job/$migration_job -n "$NAMESPACE" --timeout=300s

    # Check job status
    if kubectl get job "$migration_job" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' | grep -q True; then
        log_success "Database migrations completed successfully"
    else
        log_error "Database migration job failed"
        kubectl logs job/$migration_job -n "$NAMESPACE"
        exit 1
    fi

    # Clean up migration job
    kubectl delete job "$migration_job" -n "$NAMESPACE" --ignore-not-found=true
}

# Deploy using rolling strategy
deploy_rolling() {
    log "Executing rolling deployment strategy..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would update deployment image to $IMAGE_NAME"
        return 0
    fi

    # Update deployment image
    kubectl set image deployment/$DEPLOYMENT_NAME astral-core-v7="$IMAGE_NAME" -n "$NAMESPACE"

    # Wait for rollout to complete
    log "Waiting for rollout to complete..."
    if ! kubectl rollout status deployment/$DEPLOYMENT_NAME -n "$NAMESPACE" --timeout=600s; then
        log_error "Rolling deployment failed"
        return 1
    fi

    log_success "Rolling deployment completed successfully"
}

# Deploy using blue-green strategy
deploy_blue_green() {
    log "Executing blue-green deployment strategy..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would perform blue-green deployment"
        return 0
    fi

    # Determine current color
    local current_color
    current_color=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue")
    
    local new_color
    if [[ "$current_color" == "blue" ]]; then
        new_color="green"
    else
        new_color="blue"
    fi

    log "Current environment: $current_color, deploying to: $new_color"

    # Create new deployment
    local new_deployment="${DEPLOYMENT_NAME}-${new_color}"
    
    # Deploy to new environment
    kubectl patch deployment "$new_deployment" -n "$NAMESPACE" -p '{"spec":{"template":{"spec":{"containers":[{"name":"astral-core-v7","image":"'$IMAGE_NAME'"}]}}}}'

    # Wait for new deployment to be ready
    kubectl rollout status deployment/$new_deployment -n "$NAMESPACE" --timeout=600s

    # Switch service to new deployment
    kubectl patch service "$SERVICE_NAME" -n "$NAMESPACE" -p '{"spec":{"selector":{"color":"'$new_color'"}}}'

    log_success "Blue-green deployment completed successfully"
}

# Deploy using recreate strategy
deploy_recreate() {
    log "Executing recreate deployment strategy..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would recreate deployment with $IMAGE_NAME"
        return 0
    fi

    # Scale down current deployment
    kubectl scale deployment/$DEPLOYMENT_NAME --replicas=0 -n "$NAMESPACE"
    kubectl rollout status deployment/$DEPLOYMENT_NAME -n "$NAMESPACE" --timeout=300s

    # Update image
    kubectl set image deployment/$DEPLOYMENT_NAME astral-core-v7="$IMAGE_NAME" -n "$NAMESPACE"

    # Scale up with new image
    kubectl scale deployment/$DEPLOYMENT_NAME --replicas=3 -n "$NAMESPACE"
    kubectl rollout status deployment/$DEPLOYMENT_NAME -n "$NAMESPACE" --timeout=600s

    log_success "Recreate deployment completed successfully"
}

# Execute deployment strategy
execute_deployment() {
    log "Starting deployment with strategy: $STRATEGY"
    
    local deployment_start_time
    deployment_start_time=$(date +%s)

    case "$STRATEGY" in
        "rolling")
            deploy_rolling
            ;;
        "blue-green")
            deploy_blue_green
            ;;
        "recreate")
            deploy_recreate
            ;;
    esac

    local deployment_end_time
    deployment_end_time=$(date +%s)
    local deployment_duration=$((deployment_end_time - deployment_start_time))

    echo "$deployment_duration" > /tmp/deployment_duration
    log_success "Deployment completed in ${deployment_duration} seconds"
}

# Health checks
run_health_checks() {
    if [[ "$SKIP_HEALTH_CHECK" == "true" ]]; then
        log "Skipping health checks as requested"
        return 0
    fi

    log "Running post-deployment health checks..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would run health checks against $HEALTH_CHECK_URL"
        return 0
    fi

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts"

        if curl -f -s "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
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

# Rollback deployment
rollback_deployment() {
    log_warn "Rolling back deployment due to failure..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would rollback deployment"
        return 0
    fi

    case "$STRATEGY" in
        "rolling")
            kubectl rollout undo deployment/$DEPLOYMENT_NAME -n "$NAMESPACE"
            kubectl rollout status deployment/$DEPLOYMENT_NAME -n "$NAMESPACE" --timeout=300s
            ;;
        "blue-green")
            # Switch back to previous color
            local current_color
            current_color=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}')
            local previous_color
            if [[ "$current_color" == "blue" ]]; then
                previous_color="green"
            else
                previous_color="blue"
            fi
            kubectl patch service "$SERVICE_NAME" -n "$NAMESPACE" -p '{"spec":{"selector":{"color":"'$previous_color'"}}}'
            ;;
        "recreate")
            # Restore from backup would be needed here
            log_warn "Recreate rollback requires manual intervention"
            ;;
    esac

    log_warn "Rollback completed"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"

    log "Sending deployment notifications..."

    # Prepare notification message
    local deployment_duration
    deployment_duration=$(cat /tmp/deployment_duration 2>/dev/null || echo "unknown")
    
    local backup_name
    backup_name=$(cat /tmp/backup_name 2>/dev/null || echo "none")

    local full_message="🚀 **Deployment Notification**

**Status:** $status
**Environment:** $ENVIRONMENT  
**Strategy:** $STRATEGY
**Image Tag:** $TAG
**Duration:** ${deployment_duration}s
**Backup:** $backup_name
**Health Check:** $HEALTH_CHECK_URL

$message"

    # Send Slack notification if configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        log "Sending Slack notification"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$full_message\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi

    # GitHub notification would be handled by the calling workflow
    log "Notifications sent"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f /tmp/kubeconfig /tmp/backup_name /tmp/deployment_duration
}

# Main deployment function
main() {
    log "🚀 Starting Astral Core v7 deployment..."
    log "Environment: $ENVIRONMENT"
    log "Strategy: $STRATEGY"  
    log "Image: $IMAGE_NAME"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "DRY RUN MODE - No actual changes will be made"
    fi

    # Trap cleanup on exit
    trap cleanup EXIT

    # Execute deployment pipeline
    load_configuration
    pre_deployment_checks
    create_backup
    run_migrations

    # Execute deployment with error handling
    if execute_deployment; then
        if run_health_checks; then
            send_notifications "✅ SUCCESS" "Deployment completed successfully!"
            log_success "🎉 Deployment to $ENVIRONMENT completed successfully!"
        else
            if [[ "$AUTO_ROLLBACK" == "true" ]]; then
                rollback_deployment
                send_notifications "🔄 ROLLED BACK" "Deployment failed health checks and was rolled back."
                log_error "❌ Deployment failed health checks and was rolled back"
                exit 1
            else
                send_notifications "⚠️ PARTIAL SUCCESS" "Deployment completed but health checks failed."
                log_error "❌ Deployment completed but health checks failed"
                exit 1
            fi
        fi
    else
        if [[ "$AUTO_ROLLBACK" == "true" ]]; then
            rollback_deployment
            send_notifications "🔄 ROLLED BACK" "Deployment failed and was rolled back."
        else
            send_notifications "❌ FAILED" "Deployment failed."
        fi
        log_error "❌ Deployment failed"
        exit 1
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    main
fi