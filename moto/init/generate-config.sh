#!/bin/bash
# Generate infrastructure.json configuration files for both API and Web services
# This script consolidates configuration from all Moto initialization scripts

set -e

AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localhost:5555}
AWS_REGION=${AWS_DEFAULT_REGION:-us-west-2}

echo "========================================="
echo "Generating Infrastructure Configuration"
echo "========================================="

# Function to generate infrastructure configuration JSON
generate_infrastructure_config() {
    local output_file="$1"
    local environment="local"

    echo "Generating configuration file: $output_file"

    # Get configuration values from SSM (populated by other init scripts)
    local pool_id=$(aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameter \
        --name "/serverlesslaunchpad/local/cognito/user-pool-id" \
        --region $AWS_REGION \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")

    local client_id=$(aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameter \
        --name "/serverlesslaunchpad/local/cognito/client-id" \
        --region $AWS_REGION \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")

    local identity_pool_id=$(aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameter \
        --name "/serverlesslaunchpad/local/cognito/identity-pool-id" \
        --region $AWS_REGION \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")

    local upload_bucket=$(aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameter \
        --name "/serverlesslaunchpad/local/s3/uploads-bucket" \
        --region $AWS_REGION \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "serverlesslaunchpad-local-uploads")

    local static_bucket=$(aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameter \
        --name "/serverlesslaunchpad/local/s3/static-bucket" \
        --region $AWS_REGION \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "serverlesslaunchpad-local-static")

    local athena_bucket=$(aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameter \
        --name "/serverlesslaunchpad/local/s3/athena-results-bucket" \
        --region $AWS_REGION \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "serverlesslaunchpad-local-athena-results")

    # Generate timestamp
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

    # Generate the infrastructure configuration JSON
    cat > "$output_file" << EOF
{
  "environment": "$environment",
  "_generated": "$timestamp",
  "_source": "Generated from local Moto environment",

  "aws": {
    "region": "$AWS_REGION",
    "endpoint_url": "$AWS_ENDPOINT_URL"
  },

  "cognito": {
    "user_pool_id": "$pool_id",
    "client_id": "$client_id",
    "identity_pool_id": "$identity_pool_id",
    "user_pool_provider_url": "https://cognito-idp.$AWS_REGION.amazonaws.com/$pool_id"
  },

  "athena": {
    "workgroup": "serverlesslaunchpad-local-workgroup",
    "data_bucket": "$static_bucket",
    "results_bucket": "$athena_bucket"
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
    "moto_url": "$AWS_ENDPOINT_URL",
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
    pool_id=$(aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameter \
        --name "/serverlesslaunchpad/local/cognito/user-pool-id" \
        --region $AWS_REGION \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")

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
generate_infrastructure_config "web/config/local.infrastructure.json"

echo ""
echo "========================================="
echo "Infrastructure Configuration Complete!"
echo "========================================="
echo ""
echo "Generated files:"
echo "  - api.hypermedia/config/local.infrastructure.json"
echo "  - web/config/local.infrastructure.json"
echo ""
echo "These files contain non-sensitive infrastructure references."
echo "Sensitive data (secrets, salts) remains in AWS Secrets Manager."
echo "========================================"