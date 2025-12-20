#!/bin/bash
# Initialize Secrets Manager and SSM Parameter Store for local development with Moto

set -e

AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localhost:5555}
AWS_REGION=${AWS_DEFAULT_REGION:-us-west-2}

# Set dummy AWS credentials for Moto
export AWS_ACCESS_KEY_ID=testing
export AWS_SECRET_ACCESS_KEY=testing
export AWS_SECURITY_TOKEN=testing
export AWS_SESSION_TOKEN=testing

echo "========================================="
echo "Initializing Secrets & Parameters for Moto"
echo "========================================="

# Get Cognito client secret from SSM (set by 01-cognito.sh)
echo "Retrieving Cognito client secret..."
CLIENT_SECRET=$(aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameter \
  --name "/serverlesslaunchpad/local/cognito/client-secret" \
  --region $AWS_REGION \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text 2>/dev/null || echo "local-dev-client-secret")

# Create unified secrets for API configuration schema
echo "Creating unified API secrets..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  secretsmanager create-secret \
  --name local.serverlesslaunchpad.secrets \
  --region $AWS_REGION \
  --secret-string '{
    "cognito": {
      "client_secret": "'$CLIENT_SECRET'"
    },
    "session_token_salt": "local-dev-session-salt-min-32-characters-long!",
    "encryption_key": "local-dev-encryption-key-32-characters!",
    "jwt_secret": "local-dev-jwt-secret-key-min-32-characters-long!!"
  }' >/dev/null 2>&1 || \
  echo "   (Secret already exists)"

echo "✓ Created/verified secret: local.serverlesslaunchpad.secrets"

# Legacy API secrets for backward compatibility during migration
echo "Creating legacy API secrets..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  secretsmanager create-secret \
  --name serverlesslaunchpad/local/api \
  --region $AWS_REGION \
  --secret-string '{
    "jwtSecret": "local-dev-jwt-secret-key-min-32-characters-long!!",
    "encryptionKey": "local-encryption-key-32-characters!!",
    "sessionSecret": "local-session-secret-for-cookies-32c!",
    "apiKey": "local-api-key-for-testing-purposes"
  }' >/dev/null 2>&1 || \
  echo "   (Secret already exists)"

echo "✓ Created/verified legacy secret: serverlesslaunchpad/local/api"

# Create database credentials (for future use)
echo "Creating database credentials..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  secretsmanager create-secret \
  --name serverlesslaunchpad/local/database \
  --region $AWS_REGION \
  --secret-string '{
    "host": "localhost",
    "port": 5432,
    "database": "serverlesslaunchpad",
    "username": "dbuser",
    "password": "dbpass123!",
    "engine": "postgres"
  }' >/dev/null 2>&1 || \
  echo "   (Secret already exists)"

echo "✓ Created/verified secret: serverlesslaunchpad/local/database"

# Create third-party API credentials
echo "Creating third-party API credentials..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  secretsmanager create-secret \
  --name serverlesslaunchpad/local/third-party \
  --region $AWS_REGION \
  --secret-string '{
    "stripeApiKey": "sk_test_local_stripe_key",
    "sendgridApiKey": "SG.local_sendgrid_key",
    "slackWebhookUrl": "https://hooks.slack.com/services/LOCAL/WEBHOOK/URL",
    "githubToken": "ghp_local_github_token"
  }' >/dev/null 2>&1 || \
  echo "   (Secret already exists)"

echo "✓ Created/verified secret: serverlesslaunchpad/local/third-party"

# Create SSM parameters for non-sensitive configuration
echo "Creating SSM parameters..."

# Application configuration
aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/app/environment" \
  --value "development" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/app/log-level" \
  --value "debug" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/app/api-url" \
  --value "http://localhost:3000" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/app/frontend-url" \
  --value "http://localhost:5173" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

echo "✓ Created application parameters"

# Feature flags
aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/features/enable-mfa" \
  --value "false" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/features/enable-api-keys" \
  --value "true" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/features/enable-rate-limiting" \
  --value "false" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/features/maintenance-mode" \
  --value "false" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

echo "✓ Created feature flags"

# Rate limiting configuration
aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/rate-limit/requests-per-minute" \
  --value "100" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/rate-limit/burst-limit" \
  --value "200" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

echo "✓ Created rate limiting parameters"

# Session configuration
aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/session/ttl-seconds" \
  --value "3600" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/session/refresh-threshold" \
  --value "300" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

echo "✓ Created session parameters"

echo ""
echo "========================================="
echo "Secrets & Parameters Configuration Complete!"
echo "========================================="
echo ""
echo "Secrets created in Secrets Manager:"
echo "  - serverlesslaunchpad/local/api"
echo "  - serverlesslaunchpad/local/database"
echo "  - serverlesslaunchpad/local/third-party"
echo ""
echo "Parameters created in SSM:"
echo "  - Application config: /serverlesslaunchpad/local/app/*"
echo "  - Feature flags: /serverlesslaunchpad/local/features/*"
echo "  - Rate limiting: /serverlesslaunchpad/local/rate-limit/*"
echo "  - Session config: /serverlesslaunchpad/local/session/*"
echo ""
echo "Test with:"
echo "  aws --endpoint-url=$AWS_ENDPOINT_URL secretsmanager list-secrets"
echo "  aws --endpoint-url=$AWS_ENDPOINT_URL ssm get-parameters-by-path --path /serverlesslaunchpad"
echo "========================================"