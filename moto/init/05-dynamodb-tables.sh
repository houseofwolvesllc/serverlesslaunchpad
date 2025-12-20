#!/bin/bash
# Initialize DynamoDB tables for users, sessions, and API keys
# Creates tables with GSIs idempotently (safe to run multiple times)

set -e

# Source centralized configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

echo "========================================="
echo "Initializing DynamoDB Tables"
echo "========================================="
echo "Creating tables with prefix: ${TABLE_PREFIX}"
echo ""

# Wait for Moto to be ready
wait_for_moto || exit 1

echo ""

# Function to check if table exists
table_exists() {
    local table_name=$1
    aws --endpoint-url=${AWS_ENDPOINT_URL} \
        dynamodb describe-table \
        --table-name ${table_name} \
        --region ${AWS_REGION} \
        >/dev/null 2>&1
}

# Create Users Table
echo "Checking users table..."
if table_exists "$DDB_USERS_TABLE"; then
    echo "✓ Table already exists: ${DDB_USERS_TABLE}"
else
    aws --endpoint-url=${AWS_ENDPOINT_URL} \
        dynamodb create-table \
        --table-name ${DDB_USERS_TABLE} \
        --attribute-definitions \
            AttributeName=userId,AttributeType=S \
            AttributeName=email,AttributeType=S \
        --key-schema \
            AttributeName=userId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --global-secondary-indexes \
            "[{
                \"IndexName\": \"email-index\",
                \"KeySchema\": [{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],
                \"Projection\": {\"ProjectionType\":\"ALL\"}
            }]" \
        --region ${AWS_REGION} \
        >/dev/null 2>&1

    echo "✓ Created table: ${DDB_USERS_TABLE}"
    echo "  - Primary Key: userId (String)"
    echo "  - GSI: email-index (email)"
fi

# Create Sessions Table
echo "Checking sessions table..."
if table_exists "$DDB_SESSIONS_TABLE"; then
    echo "✓ Table already exists: ${DDB_SESSIONS_TABLE}"
else
    aws --endpoint-url=${AWS_ENDPOINT_URL} \
        dynamodb create-table \
        --table-name ${DDB_SESSIONS_TABLE} \
        --attribute-definitions \
            AttributeName=userId,AttributeType=S \
            AttributeName=sessionId,AttributeType=S \
            AttributeName=sessionSignature,AttributeType=S \
        --key-schema \
            AttributeName=userId,KeyType=HASH \
            AttributeName=sessionId,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --global-secondary-indexes \
            "[{
                \"IndexName\": \"sessionSignature-index\",
                \"KeySchema\": [{\"AttributeName\":\"sessionSignature\",\"KeyType\":\"HASH\"}],
                \"Projection\": {\"ProjectionType\":\"ALL\"}
            }]" \
        --region ${AWS_REGION} \
        >/dev/null 2>&1

    echo "✓ Created table: ${DDB_SESSIONS_TABLE}"
    echo "  - Primary Key: userId (Hash), sessionId (Range - ULID)"
    echo "  - GSI: sessionSignature-index (sessionSignature)"

    # Enable TTL on sessions table
    aws --endpoint-url=${AWS_ENDPOINT_URL} \
        dynamodb update-time-to-live \
        --table-name ${DDB_SESSIONS_TABLE} \
        --time-to-live-specification \
            "Enabled=true,AttributeName=ttl" \
        --region ${AWS_REGION} \
        >/dev/null 2>&1

    echo "  - TTL enabled on 'ttl' attribute"
fi

# Create API Keys Table
echo "Checking api_keys table..."
if table_exists "$DDB_API_KEYS_TABLE"; then
    echo "✓ Table already exists: ${DDB_API_KEYS_TABLE}"
else
    aws --endpoint-url=${AWS_ENDPOINT_URL} \
        dynamodb create-table \
        --table-name ${DDB_API_KEYS_TABLE} \
        --attribute-definitions \
            AttributeName=userId,AttributeType=S \
            AttributeName=apiKeyId,AttributeType=S \
            AttributeName=apiKey,AttributeType=S \
        --key-schema \
            AttributeName=userId,KeyType=HASH \
            AttributeName=apiKeyId,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --global-secondary-indexes \
            "[{
                \"IndexName\": \"apiKey-index\",
                \"KeySchema\": [{\"AttributeName\":\"apiKey\",\"KeyType\":\"HASH\"}],
                \"Projection\": {\"ProjectionType\":\"ALL\"}
            }]" \
        --region ${AWS_REGION} \
        >/dev/null 2>&1

    echo "✓ Created table: ${DDB_API_KEYS_TABLE}"
    echo "  - Primary Key: userId (Hash), apiKeyId (Range - ULID)"
    echo "  - GSI: apiKey-index (apiKey)"
fi

echo ""
echo "========================================="
echo "DynamoDB Tables Configuration Complete!"
echo "========================================="
echo ""
echo "Tables created:"
echo "  - ${DDB_USERS_TABLE}"
echo "  - ${DDB_SESSIONS_TABLE} (with TTL)"
echo "  - ${DDB_API_KEYS_TABLE}"
echo ""
echo "Test with:"
echo "  aws --endpoint-url=${AWS_ENDPOINT_URL} dynamodb list-tables --region ${AWS_REGION}"
echo "========================================"
