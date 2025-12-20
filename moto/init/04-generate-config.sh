#!/bin/bash
# Generate infrastructure.json configuration files for both API and Web services
# This script consolidates configuration from Moto and cognito-local initialization scripts

set -e

# Source centralized configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

echo "========================================="
echo "Generating Infrastructure Configuration"
echo "========================================="
echo "Environment: ${ENVIRONMENT}"
echo ""

# Wait for Moto to be ready
wait_for_moto || exit 1

echo ""

# Function to generate infrastructure configuration JSON
generate_infrastructure_config() {
    local output_file="$1"

    echo "Generating configuration file: $output_file"

    # Get configuration values from SSM (populated by other init scripts)
    local pool_id=$(get_ssm_parameter "${SSM_COGNITO_POOL_ID}" "")

    local client_id=$(get_ssm_parameter "${SSM_COGNITO_CLIENT_ID}" "")

    local identity_pool_id=$(get_ssm_parameter "${SSM_COGNITO_IDENTITY_POOL}" "")

    local cognito_endpoint=$(get_ssm_parameter "${SSM_COGNITO_ENDPOINT}" "${COGNITO_LOCAL_ENDPOINT}")

    local upload_bucket=$(get_ssm_parameter "${SSM_S3_UPLOADS_BUCKET}" "${S3_UPLOADS_BUCKET}")

    local static_bucket=$(get_ssm_parameter "${SSM_S3_STATIC_BUCKET}" "${S3_STATIC_BUCKET}")

    # Generate timestamp
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

    # Generate the infrastructure configuration JSON
    cat > "$output_file" << EOF
{
  "environment": "${ENVIRONMENT}",
  "_generated": "$timestamp",
  "_source": "Generated from ${ENVIRONMENT} Moto environment",

  "aws": {
    "region": "${AWS_REGION}",
    "endpoint_url": "${AWS_ENDPOINT_URL}"
  },

  "cognito": {
    "user_pool_id": "$pool_id",
    "client_id": "$client_id",
    "identity_pool_id": "$identity_pool_id",
    "user_pool_provider_url": "$cognito_endpoint",
    "endpoint_url": "$cognito_endpoint"
  },

  "api": {
    "base_url": "http://localhost:3001",
    "timeout": 30000
  },

  "s3": {
    "upload_bucket": "$upload_bucket",
    "static_bucket": "$static_bucket"
  },

  "features": {
    "enable_mfa": false,
    "enable_analytics": false,
    "enable_notifications": true,
    "enable_rate_limiting": false,
    "enable_advanced_security": false,
    "mock_auth": false,
    "debug_mode": true,
    "enable_logging": true,
    "hot_reload": true
  },

  "limits": {
    "max_api_keys_per_user": 10,
    "session_timeout_hours": 24,
    "max_query_timeout_seconds": 300
  },

  "development": {
    "moto_url": "${AWS_ENDPOINT_URL}",
    "cognito_local_url": "$cognito_endpoint",
    "node_env": "development"
  }
}
EOF

    echo "✓ Generated: $output_file"
}

# Check if required configuration exists in SSM
echo "Checking for existing configuration in SSM..."

# Wait for configuration to be available (other scripts should have run first)
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    pool_id=$(get_ssm_parameter "${SSM_COGNITO_POOL_ID}" "")

    if [ -n "$pool_id" ]; then
        echo "✓ Found configuration in SSM"
        break
    fi

    echo "   Waiting for configuration... ($attempt/$max_attempts)"
    sleep 2
    ((attempt++))
done

if [ -z "$pool_id" ]; then
    echo "⚠️  Warning: Configuration not found in SSM. Using fallback values."
fi

# Generate configuration files for both API and Web
echo ""
echo "Generating infrastructure configuration files..."

# Generate API configuration
generate_infrastructure_config "api.hypermedia/config/local.infrastructure.json"

# Generate Web configuration (same content, different location)
generate_infrastructure_config "mantine.web/config/local.infrastructure.json"

echo ""
echo "========================================="
echo "Infrastructure Configuration Complete!"
echo "========================================="
echo ""
echo "Generated files:"
echo "  - api.hypermedia/config/local.infrastructure.json"
echo "  - mantine.web/config/local.infrastructure.json"
echo ""
echo "These files contain non-sensitive infrastructure references."
echo "Sensitive data (secrets, salts) remains in AWS Secrets Manager."
echo "========================================"