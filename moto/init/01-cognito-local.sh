#!/bin/bash
# Initialize Cognito-Local User Pool and Client for local development
# This replaces Moto's Cognito implementation for proper JWT verification

set -e

COGNITO_LOCAL_ENDPOINT=${COGNITO_LOCAL_ENDPOINT:-http://localhost:9229}
AWS_REGION=${AWS_DEFAULT_REGION:-us-west-2}

# Fixed IDs for consistent configuration
POOL_ID="us-west-2_local001"
CLIENT_ID="local_client_001"

echo "========================================="
echo "Initializing Cognito-Local"
echo "========================================="

# Wait for cognito-local to be ready
echo "Waiting for cognito-local to be ready..."
for i in {1..60}; do
    if curl -s ${COGNITO_LOCAL_ENDPOINT}/health >/dev/null 2>&1; then
        echo "✓ cognito-local is ready!"
        break
    fi
    echo "   Waiting... ($i/60)"
    sleep 2
done

# Check if we can reach cognito-local health endpoint
if ! curl -s ${COGNITO_LOCAL_ENDPOINT}/health >/dev/null 2>&1; then
    echo "❌ cognito-local is not responding. Please check if the service is running."
    exit 1
fi

# Create user pool using cognito-local's API
echo "Creating Cognito User Pool..."

# Create .cognito directory if it doesn't exist
mkdir -p ./.cognito

# Check if user pool already exists
EXISTING_POOLS=$(aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
  cognito-idp list-user-pools \
  --max-results 60 \
  --region $AWS_REGION 2>/dev/null || echo "{}")

# Try to find existing pool by name
EXISTING_POOL_ID=$(echo "$EXISTING_POOLS" | jq -r '.UserPools[] | select(.Name=="serverlesslaunchpad-local") | .Id' 2>/dev/null || echo "")

if [ -z "$EXISTING_POOL_ID" ]; then
    # Create the user pool via AWS CLI
    echo "Creating new user pool..."
    POOL_RESPONSE=$(aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
      cognito-idp create-user-pool \
      --pool-name "serverlesslaunchpad-local" \
      --region $AWS_REGION \
      --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}" \
      --auto-verified-attributes email \
      --mfa-configuration OFF \
      --schema \
        Name=sub,AttributeDataType=String,Required=true,Mutable=false \
        Name=email,AttributeDataType=String,Required=true,Mutable=true \
        Name=given_name,AttributeDataType=String,Required=false,Mutable=true \
        Name=family_name,AttributeDataType=String,Required=false,Mutable=true \
        Name=name,AttributeDataType=String,Required=false,Mutable=true \
      2>&1)

    # Extract the actual pool ID that cognito-local generated
    POOL_ID=$(echo "$POOL_RESPONSE" | jq -r '.UserPool.Id' 2>/dev/null || echo "")

    if [ -z "$POOL_ID" ]; then
        echo "❌ Failed to create user pool:"
        echo "$POOL_RESPONSE"
        exit 1
    fi
    echo "✓ User Pool created: ${POOL_ID}"
else
    POOL_ID="$EXISTING_POOL_ID"
    echo "✓ Using existing user pool: ${POOL_ID}"
fi

# Check if client already exists for this pool
EXISTING_CLIENTS=$(aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
  cognito-idp list-user-pool-clients \
  --user-pool-id $POOL_ID \
  --region $AWS_REGION 2>/dev/null || echo "{}")

EXISTING_CLIENT_ID=$(echo "$EXISTING_CLIENTS" | jq -r '.UserPoolClients[] | select(.ClientName=="serverlesslaunchpad-local-client") | .ClientId' 2>/dev/null || echo "")

if [ -z "$EXISTING_CLIENT_ID" ]; then
    # Create the user pool client
    echo "Creating new user pool client..."
    CLIENT_RESPONSE=$(aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
      cognito-idp create-user-pool-client \
      --user-pool-id $POOL_ID \
      --client-name "serverlesslaunchpad-local-client" \
      --region $AWS_REGION \
      --generate-secret \
      --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
      --supported-identity-providers COGNITO \
      --callback-urls http://localhost:5173/callback \
      --logout-urls http://localhost:5173/logout \
      --allowed-o-auth-flows code implicit \
      --allowed-o-auth-scopes email openid profile \
      --allowed-o-auth-flows-user-pool-client \
      --read-attributes email given_name family_name name \
      --write-attributes email given_name family_name name \
      2>&1)

    # Extract the actual client ID and secret
    CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r '.UserPoolClient.ClientId' 2>/dev/null || echo "")
    CLIENT_SECRET=$(echo "$CLIENT_RESPONSE" | jq -r '.UserPoolClient.ClientSecret' 2>/dev/null || echo "")

    if [ -z "$CLIENT_ID" ]; then
        echo "❌ Failed to create user pool client:"
        echo "$CLIENT_RESPONSE"
        exit 1
    fi
    echo "✓ User Pool Client created: ${CLIENT_ID}"
else
    CLIENT_ID="$EXISTING_CLIENT_ID"
    # Get the client secret
    CLIENT_DETAILS=$(aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
      cognito-idp describe-user-pool-client \
      --user-pool-id $POOL_ID \
      --client-id $CLIENT_ID \
      --region $AWS_REGION 2>/dev/null)
    CLIENT_SECRET=$(echo "$CLIENT_DETAILS" | jq -r '.UserPoolClient.ClientSecret' 2>/dev/null || echo "local_client_secret_001")
    echo "✓ Using existing client: ${CLIENT_ID}"
fi

# Also save configuration for reference
cat > ./.cognito/config.json << EOF
{
  "UserPools": {
    "${POOL_ID}": {
      "Id": "${POOL_ID}",
      "Name": "serverlesslaunchpad-local",
      "Policies": {
        "PasswordPolicy": {
          "MinimumLength": 8,
          "RequireUppercase": true,
          "RequireLowercase": true,
          "RequireNumbers": true,
          "RequireSymbols": true
        }
      },
      "Schema": [
        {
          "Name": "sub",
          "AttributeDataType": "String",
          "Required": true,
          "Mutable": false
        },
        {
          "Name": "email",
          "AttributeDataType": "String",
          "Required": true,
          "Mutable": true
        },
        {
          "Name": "given_name",
          "AttributeDataType": "String",
          "Required": false,
          "Mutable": true
        },
        {
          "Name": "family_name",
          "AttributeDataType": "String",
          "Required": false,
          "Mutable": true
        },
        {
          "Name": "name",
          "AttributeDataType": "String",
          "Required": false,
          "Mutable": true
        }
      ],
      "AutoVerifiedAttributes": ["email"],
      "MfaConfiguration": "OFF",
      "EstimatedNumberOfUsers": 0
    }
  },
  "UserPoolClients": {
    "${CLIENT_ID}": {
      "UserPoolId": "${POOL_ID}",
      "ClientName": "serverlesslaunchpad-local-client",
      "ClientId": "${CLIENT_ID}",
      "ClientSecret": "local_client_secret_001",
      "RefreshTokenValidity": 30,
      "AccessTokenValidity": 60,
      "IdTokenValidity": 60,
      "ExplicitAuthFlows": [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_USER_SRP_AUTH"
      ],
      "SupportedIdentityProviders": ["COGNITO"],
      "CallbackURLs": ["http://localhost:5173/callback"],
      "LogoutURLs": ["http://localhost:5173/logout"],
      "AllowedOAuthFlows": ["code", "implicit"],
      "AllowedOAuthScopes": ["email", "openid", "profile"],
      "AllowedOAuthFlowsUserPoolClient": true,
      "ReadAttributes": ["email", "given_name", "family_name", "name"],
      "WriteAttributes": ["email", "given_name", "family_name", "name"],
      "GenerateSecret": true
    }
  },
  "IdentityPools": {
    "${AWS_REGION}:local-identity-pool-001": {
      "IdentityPoolId": "${AWS_REGION}:local-identity-pool-001",
      "IdentityPoolName": "serverlesslaunchpad-local",
      "AllowUnauthenticatedIdentities": true,
      "CognitoIdentityProviders": [
        {
          "ProviderName": "cognito-idp.${AWS_REGION}.amazonaws.com/${POOL_ID}",
          "ClientId": "${CLIENT_ID}"
        }
      ]
    }
  }
}
EOF

# Test JWKS endpoint
echo "Testing JWKS endpoint..."
JWKS_URL="${COGNITO_LOCAL_ENDPOINT}/${POOL_ID}/.well-known/jwks.json"
if curl -s "${JWKS_URL}" | jq . >/dev/null 2>&1; then
    echo "✓ JWKS endpoint is working: ${JWKS_URL}"
else
    echo "⚠️  JWKS endpoint may not be ready yet: ${JWKS_URL}"
fi

# Wait for Moto to be ready for SSM operations
echo "Waiting for Moto SSM to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5555/moto-api/reset >/dev/null 2>&1; then
        echo "✓ Moto is ready for SSM operations!"
        break
    fi
    echo "   Waiting for Moto... ($i/30)"
    sleep 2
done

# Set AWS credentials for Moto SSM operations
export AWS_ACCESS_KEY_ID=testing
export AWS_SECRET_ACCESS_KEY=testing
export AWS_SECURITY_TOKEN=testing
export AWS_SESSION_TOKEN=testing

# Store configuration in Moto's SSM Parameter Store for application use
echo "Storing configuration in SSM Parameter Store..."

aws --endpoint-url=http://localhost:5555 \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/user-pool-id" \
  --value "$POOL_ID" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=http://localhost:5555 \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/client-id" \
  --value "$CLIENT_ID" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=http://localhost:5555 \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/client-secret" \
  --value "$CLIENT_SECRET" \
  --type SecureString \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=http://localhost:5555 \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/identity-pool-id" \
  --value "${AWS_REGION}:local-identity-pool-001" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=http://localhost:5555 \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/endpoint-url" \
  --value "$COGNITO_LOCAL_ENDPOINT" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

echo "✓ Configuration stored in SSM"

# Create test users using AWS CLI against cognito-local
echo "Creating test users..."

# Admin user
aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
  cognito-idp admin-create-user \
  --user-pool-id $POOL_ID \
  --username admin@example.com \
  --region $AWS_REGION \
  --user-attributes \
    Name=email,Value=admin@example.com \
    Name=email_verified,Value=true \
    Name=given_name,Value=Admin \
    Name=family_name,Value=User \
    Name=name,Value="Admin User" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS >/dev/null 2>&1 || echo "   (User may already exist)"

# Set permanent password for admin
aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
  cognito-idp admin-set-user-password \
  --user-pool-id $POOL_ID \
  --username admin@example.com \
  --password "AdminPass123!" \
  --region $AWS_REGION \
  --permanent >/dev/null 2>&1 || echo "   (Password may already be set)"

echo "✓ Created/verified admin@example.com (password: AdminPass123!)"

# Test user
aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
  cognito-idp admin-create-user \
  --user-pool-id $POOL_ID \
  --username testuser@example.com \
  --region $AWS_REGION \
  --user-attributes \
    Name=email,Value=testuser@example.com \
    Name=email_verified,Value=true \
    Name=given_name,Value=Test \
    Name=family_name,Value=User \
    Name=name,Value="Test User" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS >/dev/null 2>&1 || echo "   (User may already exist)"

# Set permanent password for test user
aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
  cognito-idp admin-set-user-password \
  --user-pool-id $POOL_ID \
  --username testuser@example.com \
  --password "TestPass123!" \
  --region $AWS_REGION \
  --permanent >/dev/null 2>&1 || echo "   (Password may already be set)"

echo "✓ Created/verified testuser@example.com (password: TestPass123!)"

# Test authentication to verify everything works
echo "Testing authentication flow..."
AUTH_RESPONSE=$(aws --endpoint-url=$COGNITO_LOCAL_ENDPOINT \
  cognito-idp admin-initiate-auth \
  --user-pool-id $POOL_ID \
  --client-id $CLIENT_ID \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --region $AWS_REGION \
  --auth-parameters \
    USERNAME=testuser@example.com \
    PASSWORD=TestPass123! \
    SECRET_HASH=$(echo -n "testuser@example.com${CLIENT_ID}" | openssl dgst -sha256 -hmac "local_client_secret_001" -binary | base64) \
  2>/dev/null || echo "")

if echo "$AUTH_RESPONSE" | jq -e '.AuthenticationResult.AccessToken' >/dev/null 2>&1; then
    echo "✓ Authentication test successful!"
    ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.AuthenticationResult.AccessToken')
    echo "✓ Access token generated (length: ${#ACCESS_TOKEN} chars)"
else
    echo "⚠️  Authentication test failed, but this may be normal during initial setup"
fi

# Output configuration for developers
echo ""
echo "========================================="
echo "Cognito-Local Configuration Complete!"
echo "========================================="
echo ""
echo "Service URL:       $COGNITO_LOCAL_ENDPOINT"
echo "User Pool ID:      $POOL_ID"
echo "Client ID:         $CLIENT_ID"
echo "Client Secret:     $CLIENT_SECRET"
echo "Identity Pool ID:  ${AWS_REGION}:local-identity-pool-001"
echo "Region:            $AWS_REGION"
echo ""
echo "JWKS Endpoint:     ${COGNITO_LOCAL_ENDPOINT}/${POOL_ID}/.well-known/jwks.json"
echo ""
echo "Test Users:"
echo "  admin@example.com    (password: AdminPass123!)"
echo "  testuser@example.com (password: TestPass123!)"
echo ""
echo "✓ Configuration stored in SSM Parameter Store for infrastructure file generation"
echo "✓ User pool and client configuration persisted in ./.cognito/"
echo "========================================="