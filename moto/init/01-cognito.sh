#!/bin/bash
# Initialize Cognito User Pool and Client for local development with Moto

set -e

AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localhost:5555}
AWS_REGION=${AWS_DEFAULT_REGION:-us-west-2}

# Set dummy AWS credentials for Moto
export AWS_ACCESS_KEY_ID=testing
export AWS_SECRET_ACCESS_KEY=testing
export AWS_SECURITY_TOKEN=testing
export AWS_SESSION_TOKEN=testing

echo "========================================="
echo "Initializing Cognito for Moto"
echo "========================================="

# Wait for Moto to be ready
echo "Waiting for Moto to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5555/moto-api/reset >/dev/null 2>&1; then
        echo "✓ Moto is ready!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# Check if user pool already exists
echo "Creating Cognito User Pool..."
EXISTING_POOL=$(aws --endpoint-url=$AWS_ENDPOINT_URL \
  cognito-idp list-user-pools \
  --max-results 10 \
  --region $AWS_REGION \
  --query 'UserPools[?Name==`serverlesslaunchpad-local`].Id | [0]' \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_POOL" ] && [ "$EXISTING_POOL" != "None" ]; then
  POOL_ID=$EXISTING_POOL
  echo "   (User pool already exists)"
  echo "✓ Using existing User Pool: $POOL_ID"
else
  POOL_ID=$(aws --endpoint-url=$AWS_ENDPOINT_URL \
    cognito-idp create-user-pool \
    --pool-name serverlesslaunchpad-local \
    --region $AWS_REGION \
    --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}" \
    --auto-verified-attributes email \
    --mfa-configuration OFF \
    --schema \
      "Name=email,AttributeDataType=String,Required=true,Mutable=true" \
      "Name=given_name,AttributeDataType=String,Required=false,Mutable=true" \
      "Name=family_name,AttributeDataType=String,Required=false,Mutable=true" \
      "Name=name,AttributeDataType=String,Required=false,Mutable=true" \
    --query 'UserPool.Id' \
    --output text)
  echo "✓ User Pool created: $POOL_ID"
fi

# Create user pool client
echo "Creating User Pool Client..."
# Check if client already exists (list clients and find our client by name)
EXISTING_CLIENT=$(aws --endpoint-url=$AWS_ENDPOINT_URL \
  cognito-idp list-user-pool-clients \
  --user-pool-id $POOL_ID \
  --region $AWS_REGION \
  --query 'UserPoolClients[?ClientName==`serverlesslaunchpad-local-client`].ClientId | [0]' \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_CLIENT" ] && [ "$EXISTING_CLIENT" != "None" ]; then
  CLIENT_ID=$EXISTING_CLIENT
  echo "   (Client already exists)"
  echo "✓ Using existing User Pool Client: $CLIENT_ID"
  # Get client details to extract secret
  CLIENT_RESPONSE=$(aws --endpoint-url=$AWS_ENDPOINT_URL \
    cognito-idp describe-user-pool-client \
    --user-pool-id $POOL_ID \
    --client-id $CLIENT_ID \
    --region $AWS_REGION 2>/dev/null || echo "")
  CLIENT_SECRET=$(echo $CLIENT_RESPONSE | jq -r '.UserPoolClient.ClientSecret // "existing-secret"')
else
  # Create user pool client (Moto generates the ID)
  CLIENT_RESPONSE=$(aws --endpoint-url=$AWS_ENDPOINT_URL \
    cognito-idp create-user-pool-client \
    --user-pool-id $POOL_ID \
    --client-name serverlesslaunchpad-local-client \
    --region $AWS_REGION \
    --explicit-auth-flows \
      "ALLOW_USER_PASSWORD_AUTH" \
      "ALLOW_REFRESH_TOKEN_AUTH" \
      "ALLOW_USER_SRP_AUTH" \
    --generate-secret \
    --supported-identity-providers COGNITO \
    --callback-urls "http://localhost:5173/callback" \
    --logout-urls "http://localhost:5173/logout" \
    --allowed-o-auth-flows "code" "implicit" \
    --allowed-o-auth-scopes "email" "openid" "profile" \
    --allowed-o-auth-flows-user-pool-client \
    --read-attributes "email" "given_name" "family_name" "name" \
    --write-attributes "email" "given_name" "family_name" "name")

  CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.UserPoolClient.ClientId')
  CLIENT_SECRET=$(echo $CLIENT_RESPONSE | jq -r '.UserPoolClient.ClientSecret')
  echo "✓ User Pool Client created: $CLIENT_ID"
fi

# Store IDs in SSM Parameter Store for application use
echo "Storing configuration in SSM Parameter Store..."

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/user-pool-id" \
  --value "$POOL_ID" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/client-id" \
  --value "$CLIENT_ID" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/client-secret" \
  --value "$CLIENT_SECRET" \
  --type SecureString \
  --region $AWS_REGION \
  --overwrite >/dev/null

echo "✓ Configuration stored in SSM"

# Create test users
echo "Creating test users..."

# Admin user
aws --endpoint-url=$AWS_ENDPOINT_URL \
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
  --message-action SUPPRESS >/dev/null 2>&1 || echo "   (User already exists)"

# Set permanent password for admin
aws --endpoint-url=$AWS_ENDPOINT_URL \
  cognito-idp admin-set-user-password \
  --user-pool-id $POOL_ID \
  --username admin@example.com \
  --password "AdminPass123!" \
  --region $AWS_REGION \
  --permanent >/dev/null 2>&1

echo "✓ Created/verified admin@example.com (password: AdminPass123!)"

# Test user
aws --endpoint-url=$AWS_ENDPOINT_URL \
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
  --message-action SUPPRESS >/dev/null 2>&1 || echo "   (User already exists)"

# Set permanent password for test user
aws --endpoint-url=$AWS_ENDPOINT_URL \
  cognito-idp admin-set-user-password \
  --user-pool-id $POOL_ID \
  --username testuser@example.com \
  --password "TestPass123!" \
  --region $AWS_REGION \
  --permanent >/dev/null 2>&1

echo "✓ Created/verified testuser@example.com (password: TestPass123!)"

# Create identity pool (for AWS credentials)
echo "Creating Cognito Identity Pool..."
IDENTITY_POOL_ID=$(aws --endpoint-url=$AWS_ENDPOINT_URL \
  cognito-identity create-identity-pool \
  --identity-pool-name serverlesslaunchpad-local \
  --region $AWS_REGION \
  --allow-unauthenticated-identities \
  --cognito-identity-providers \
    "ProviderName=cognito-idp.$AWS_REGION.amazonaws.com/$POOL_ID,ClientId=$CLIENT_ID" \
  --query 'IdentityPoolId' \
  --output text)

echo "✓ Identity Pool created: $IDENTITY_POOL_ID"

# Store identity pool ID
aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/cognito/identity-pool-id" \
  --value "$IDENTITY_POOL_ID" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

# Auto-update .env.local file in web directory
# Script is run from project root, so use direct path
ENV_LOCAL_FILE="web/.env.local"
if [ -f "$ENV_LOCAL_FILE" ]; then
  echo "Updating $ENV_LOCAL_FILE with new Cognito IDs..."
  # Update existing values or add if not present
  if grep -q "VITE_COGNITO_USER_POOL_ID" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_COGNITO_USER_POOL_ID=.*/VITE_COGNITO_USER_POOL_ID=$POOL_ID/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_COGNITO_USER_POOL_ID=$POOL_ID" >> "$ENV_LOCAL_FILE"
  fi
  
  if grep -q "VITE_COGNITO_CLIENT_ID" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_COGNITO_CLIENT_ID=.*/VITE_COGNITO_CLIENT_ID=$CLIENT_ID/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_COGNITO_CLIENT_ID=$CLIENT_ID" >> "$ENV_LOCAL_FILE"
  fi
  
  if grep -q "VITE_COGNITO_IDENTITY_POOL_ID" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_COGNITO_IDENTITY_POOL_ID=.*/VITE_COGNITO_IDENTITY_POOL_ID=$IDENTITY_POOL_ID/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_COGNITO_IDENTITY_POOL_ID=$IDENTITY_POOL_ID" >> "$ENV_LOCAL_FILE"
  fi
  
  # Remove backup file
  rm -f "$ENV_LOCAL_FILE.bak"
  echo "✓ Updated $ENV_LOCAL_FILE"
else
  echo "Creating $ENV_LOCAL_FILE with Cognito configuration..."
  cat > "$ENV_LOCAL_FILE" << EOF
VITE_COGNITO_USER_POOL_ID=$POOL_ID
VITE_COGNITO_CLIENT_ID=$CLIENT_ID
VITE_COGNITO_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
VITE_MOTO_URL=http://localhost:5555
VITE_API_URL=http://localhost:3001
VITE_DEBUG_MODE=true
EOF
  echo "✓ Created $ENV_LOCAL_FILE"
fi

# Output configuration for developers
echo ""
echo "========================================="
echo "Cognito Moto Configuration Complete!"
echo "========================================="
echo ""
echo "User Pool ID:      $POOL_ID"
echo "Client ID:         $CLIENT_ID"
echo "Client Secret:     $CLIENT_SECRET"
echo "Identity Pool ID:  $IDENTITY_POOL_ID"
echo "Region:            $AWS_REGION"
echo ""
echo "Test Users:"
echo "  admin@example.com    (password: AdminPass123!)"
echo "  testuser@example.com (password: TestPass123!)"
echo ""
echo "✓ .env.local file has been updated automatically"
echo "========================================="