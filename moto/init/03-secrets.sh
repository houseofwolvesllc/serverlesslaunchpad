#!/bin/bash
# Initialize Secrets Manager and SSM Parameter Store for local development with Moto
# Creates secrets and parameters idempotently (safe to run multiple times)

set -e

# Source centralized configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

echo "========================================="
echo "Initializing Secrets & Parameters"
echo "========================================="
echo "Environment: ${ENVIRONMENT}"
echo ""

# Wait for Moto to be ready
wait_for_moto || exit 1

echo ""

# Get Cognito client secret from SSM (set by 01-cognito-local.sh)
echo "Retrieving Cognito client secret..."
CLIENT_SECRET=$(aws --endpoint-url=${AWS_ENDPOINT_URL} ssm get-parameter \
  --name "${SSM_COGNITO_CLIENT_SECRET}" \
  --region ${AWS_REGION} \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text 2>/dev/null || echo "local-dev-client-secret")

# Create unified secrets for API configuration schema
echo "Creating unified API secrets..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  secretsmanager create-secret \
  --name ${ENVIRONMENT}.serverlesslaunchpad.com \
  --region ${AWS_REGION} \
  --secret-string '{
    "cognito": {
      "client_secret": "'$CLIENT_SECRET'"
    },
    "session_token_salt": "local-dev-session-salt-min-32-characters-long!",
    "encryption_key": "local-dev-encryption-key-32-characters!",
    "jwt_secret": "local-dev-jwt-secret-key-min-32-characters-long!!"
  }' >/dev/null 2>&1 || \
  echo "   (Secret already exists)"

echo "✓ Created/verified secret: ${ENVIRONMENT}.serverlesslaunchpad.com"

# Legacy API secrets for backward compatibility during migration
echo "Creating legacy API secrets..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  secretsmanager create-secret \
  --name serverlesslaunchpad/${ENVIRONMENT}/api \
  --region ${AWS_REGION} \
  --secret-string '{
    "jwtSecret": "local-dev-jwt-secret-key-min-32-characters-long!!",
    "encryptionKey": "local-encryption-key-32-characters!!",
    "sessionSecret": "local-session-secret-for-cookies-32c!",
    "apiKey": "local-api-key-for-testing-purposes"
  }' >/dev/null 2>&1 || \
  echo "   (Secret already exists)"

echo "✓ Created/verified legacy secret: serverlesslaunchpad/${ENVIRONMENT}/api"

# Create database credentials (for future use)
echo "Creating database credentials..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  secretsmanager create-secret \
  --name serverlesslaunchpad/${ENVIRONMENT}/database \
  --region ${AWS_REGION} \
  --secret-string '{
    "host": "localhost",
    "port": 5432,
    "database": "serverlesslaunchpad",
    "username": "dbuser",
    "password": "dbpass123!",
    "engine": "postgres"
  }' >/dev/null 2>&1 || \
  echo "   (Secret already exists)"

echo "✓ Created/verified secret: serverlesslaunchpad/${ENVIRONMENT}/database"

# Create third-party API credentials
echo "Creating third-party API credentials..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  secretsmanager create-secret \
  --name serverlesslaunchpad/${ENVIRONMENT}/third-party \
  --region ${AWS_REGION} \
  --secret-string '{
    "stripeApiKey": "sk_test_local_stripe_key",
    "sendgridApiKey": "SG.local_sendgrid_key",
    "slackWebhookUrl": "https://hooks.slack.com/services/LOCAL/WEBHOOK/URL",
    "githubToken": "ghp_local_github_token"
  }' >/dev/null 2>&1 || \
  echo "   (Secret already exists)"

echo "✓ Created/verified secret: serverlesslaunchpad/${ENVIRONMENT}/third-party"

# Create SSM parameters for non-sensitive configuration
echo "Creating SSM parameters..."

# Application configuration
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/app/environment" \
  --value "development" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/app/log-level" \
  --value "debug" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/app/api-url" \
  --value "http://localhost:3000" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/app/frontend-url" \
  --value "http://localhost:5173" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

echo "✓ Created application parameters"

# Feature flags
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/features/enable-mfa" \
  --value "false" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/features/enable-api-keys" \
  --value "true" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/features/enable-rate-limiting" \
  --value "false" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/features/maintenance-mode" \
  --value "false" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

echo "✓ Created feature flags"

# Rate limiting configuration
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/rate-limit/requests-per-minute" \
  --value "100" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/rate-limit/burst-limit" \
  --value "200" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

echo "✓ Created rate limiting parameters"

# Session configuration
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/session/ttl-seconds" \
  --value "3600" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_PREFIX}/session/refresh-threshold" \
  --value "300" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

echo "✓ Created session parameters"

echo ""
echo "========================================="
echo "Secrets & Parameters Configuration Complete!"
echo "========================================="
echo ""
echo "Secrets created in Secrets Manager:"
echo "  - ${ENVIRONMENT}.serverlesslaunchpad.secrets"
echo "  - serverlesslaunchpad/${ENVIRONMENT}/api (legacy)"
echo "  - serverlesslaunchpad/${ENVIRONMENT}/database"
echo "  - serverlesslaunchpad/${ENVIRONMENT}/third-party"
echo ""
echo "Parameters created in SSM:"
echo "  - Application config: ${SSM_PREFIX}/app/*"
echo "  - Feature flags: ${SSM_PREFIX}/features/*"
echo "  - Rate limiting: ${SSM_PREFIX}/rate-limit/*"
echo "  - Session config: ${SSM_PREFIX}/session/*"
echo ""
echo "Test with:"
echo "  aws --endpoint-url=${AWS_ENDPOINT_URL} secretsmanager list-secrets --region ${AWS_REGION}"
echo "  aws --endpoint-url=${AWS_ENDPOINT_URL} ssm get-parameters-by-path --path ${SSM_PREFIX} --region ${AWS_REGION}"
echo "========================================"