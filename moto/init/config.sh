#!/bin/bash
# Centralized configuration for all moto/init scripts
# Source this file at the top of each init script
#
# Usage:
#   source "$(dirname "$0")/config.sh"

# Prevent sourcing multiple times
if [ -n "$MOTO_INIT_CONFIG_LOADED" ]; then
    return 0
fi
export MOTO_INIT_CONFIG_LOADED=1

# ============================================
# Environment & Endpoints
# ============================================
export ENVIRONMENT=${ENVIRONMENT:-local}
export AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localhost:5555}
export COGNITO_LOCAL_ENDPOINT=${COGNITO_LOCAL_ENDPOINT:-http://localhost:9229}
export AWS_REGION=${AWS_DEFAULT_REGION:-us-west-2}

# ============================================
# Naming Conventions
# ============================================
# CRITICAL: These must match application code expectations!

# DynamoDB Table Prefix
# Must match: framework/src/data/dynamodb/dynamodb_client_factory.ts
# const tablePrefix = `slp_${environment}`;
export TABLE_PREFIX="slp_${ENVIRONMENT}"

# S3 Bucket Naming Pattern
export S3_BUCKET_PREFIX="serverlesslaunchpad-${ENVIRONMENT}"

# Glue/Athena Database Naming Pattern
export GLUE_DATABASE="serverlesslaunchpad_${ENVIRONMENT}"

# Athena Workgroup Naming Pattern
export ATHENA_WORKGROUP="serverlesslaunchpad-${ENVIRONMENT}-workgroup"

# ============================================
# Specific Resource Names (derived from patterns)
# ============================================

# S3 Buckets
export S3_UPLOADS_BUCKET="${S3_BUCKET_PREFIX}-uploads"
export S3_STATIC_BUCKET="${S3_BUCKET_PREFIX}-static"
export S3_ATHENA_RESULTS_BUCKET="${S3_BUCKET_PREFIX}-athena-results"

# DynamoDB Tables (will be prefixed by TABLE_PREFIX)
export DDB_USERS_TABLE="${TABLE_PREFIX}_users"
export DDB_SESSIONS_TABLE="${TABLE_PREFIX}_sessions"
export DDB_API_KEYS_TABLE="${TABLE_PREFIX}_api_keys"

# Athena Results Location
export ATHENA_RESULTS_LOCATION="s3://${S3_ATHENA_RESULTS_BUCKET}/"

# ============================================
# SSM Parameter Paths
# ============================================
export SSM_PREFIX="/serverlesslaunchpad/${ENVIRONMENT}"

# Cognito SSM paths
export SSM_COGNITO_POOL_ID="${SSM_PREFIX}/cognito/user-pool-id"
export SSM_COGNITO_CLIENT_ID="${SSM_PREFIX}/cognito/client-id"
export SSM_COGNITO_CLIENT_SECRET="${SSM_PREFIX}/cognito/client-secret"
export SSM_COGNITO_IDENTITY_POOL="${SSM_PREFIX}/cognito/identity-pool-id"
export SSM_COGNITO_ENDPOINT="${SSM_PREFIX}/cognito/endpoint-url"

# S3 SSM paths
export SSM_S3_UPLOADS_BUCKET="${SSM_PREFIX}/s3/uploads-bucket"
export SSM_S3_STATIC_BUCKET="${SSM_PREFIX}/s3/static-bucket"
export SSM_S3_ATHENA_BUCKET="${SSM_PREFIX}/s3/athena-results-bucket"

# Athena/Glue SSM paths
export SSM_ATHENA_WORKGROUP="${SSM_PREFIX}/athena/workgroup"
export SSM_GLUE_DATABASE="${SSM_PREFIX}/glue/database"
export SSM_ATHENA_RESULTS="${SSM_PREFIX}/athena/results-location"

# ============================================
# AWS Credentials (for Moto)
# ============================================
export AWS_ACCESS_KEY_ID=testing
export AWS_SECRET_ACCESS_KEY=testing
export AWS_SECURITY_TOKEN=testing
export AWS_SESSION_TOKEN=testing

# ============================================
# Script Execution Settings
# ============================================
export HEALTH_CHECK_MAX_ATTEMPTS=30
export HEALTH_CHECK_INTERVAL=2

# ============================================
# Utility Functions
# ============================================

# Check if Moto service is ready
wait_for_moto() {
    local service_name=${1:-"Moto"}
    local endpoint=${2:-$AWS_ENDPOINT_URL}

    echo "Waiting for ${service_name} to be ready..."

    for i in $(seq 1 $HEALTH_CHECK_MAX_ATTEMPTS); do
        if curl -s "${endpoint}/" >/dev/null 2>&1; then
            echo "✓ ${service_name} is ready!"
            return 0
        fi
        echo "   Waiting... ($i/$HEALTH_CHECK_MAX_ATTEMPTS)"
        sleep $HEALTH_CHECK_INTERVAL
    done

    echo "❌ ${service_name} is not responding after $HEALTH_CHECK_MAX_ATTEMPTS attempts"
    echo "   Attempted endpoint: ${endpoint}/"
    echo "   Try: docker-compose logs"
    return 1
}

# Verify SSM parameter exists
verify_ssm_parameter() {
    local param_name=$1
    local friendly_name=${2:-$param_name}

    if aws --endpoint-url=$AWS_ENDPOINT_URL \
        ssm get-parameter \
        --name "$param_name" \
        --region $AWS_REGION \
        >/dev/null 2>&1; then
        return 0
    else
        echo "❌ Required SSM parameter not found: $param_name"
        echo "   This is needed for: $friendly_name"
        return 1
    fi
}

# Get SSM parameter value with fallback
get_ssm_parameter() {
    local param_name=$1
    local fallback_value=$2

    local value=$(aws --endpoint-url=$AWS_ENDPOINT_URL \
        ssm get-parameter \
        --name "$param_name" \
        --region $AWS_REGION \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")

    if [ -n "$value" ]; then
        echo "$value"
    else
        echo "$fallback_value"
    fi
}

# Display configuration summary
show_config_summary() {
    echo ""
    echo "========================================="
    echo "Configuration Summary"
    echo "========================================="
    echo "Environment:      $ENVIRONMENT"
    echo "AWS Region:       $AWS_REGION"
    echo "Moto Endpoint:    $AWS_ENDPOINT_URL"
    echo "Cognito Endpoint: $COGNITO_LOCAL_ENDPOINT"
    echo ""
    echo "Naming Patterns:"
    echo "  Table Prefix:   $TABLE_PREFIX"
    echo "  S3 Prefix:      $S3_BUCKET_PREFIX"
    echo "  Glue Database:  $GLUE_DATABASE"
    echo ""
    echo "DynamoDB Tables:"
    echo "  Users:          $DDB_USERS_TABLE"
    echo "  Sessions:       $DDB_SESSIONS_TABLE"
    echo "  API Keys:       $DDB_API_KEYS_TABLE"
    echo ""
    echo "S3 Buckets:"
    echo "  Uploads:        $S3_UPLOADS_BUCKET"
    echo "  Static:         $S3_STATIC_BUCKET"
    echo "  Athena Results: $S3_ATHENA_RESULTS_BUCKET"
    echo "========================================="
    echo ""
}

echo "✓ Moto init configuration loaded (environment: $ENVIRONMENT)"
