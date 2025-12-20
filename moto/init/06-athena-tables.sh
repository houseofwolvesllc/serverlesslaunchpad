#!/bin/bash
# Initialize Athena/Glue tables for authentication and user management
# Creates tables idempotently (safe to run multiple times)

set -e

# Source centralized configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

echo "========================================="
echo "Initializing Athena Tables"
echo "========================================="
echo "Creating Glue tables in database: ${GLUE_DATABASE}"
echo ""

# Wait for Moto to be ready
wait_for_moto || exit 1

echo ""

# Function to check if table exists
table_exists() {
    local table_name=$1
    aws --endpoint-url=${AWS_ENDPOINT_URL} \
        glue get-table \
        --database-name ${GLUE_DATABASE} \
        --name ${table_name} \
        --region ${AWS_REGION} \
        >/dev/null 2>&1
}

# Function to create table
create_table() {
    local table_name=$1
    local table_input=$2

    aws --endpoint-url=${AWS_ENDPOINT_URL} \
        glue create-table \
        --database-name ${GLUE_DATABASE} \
        --table-input "${table_input}" \
        --region ${AWS_REGION} \
        >/dev/null 2>&1
}

# Create users table
echo "Checking users table..."
if table_exists "users"; then
    echo "✓ Table already exists: users"
else
    USERS_TABLE_INPUT=$(cat <<EOF
{
  "Name": "users",
  "StorageDescriptor": {
    "Columns": [
      {"Name": "userId", "Type": "string"},
      {"Name": "email", "Type": "string"},
      {"Name": "firstName", "Type": "string"},
      {"Name": "lastName", "Type": "string"},
      {"Name": "role", "Type": "int"},
      {"Name": "features", "Type": "int"},
      {"Name": "dateCreated", "Type": "timestamp"},
      {"Name": "dateModified", "Type": "timestamp"}
    ],
    "Location": "s3://${S3_STATIC_BUCKET}/athena/users/",
    "InputFormat": "org.apache.hadoop.mapred.TextInputFormat",
    "OutputFormat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
    "SerdeInfo": {
      "SerializationLibrary": "org.openx.data.jsonserde.JsonSerDe"
    }
  },
  "TableType": "EXTERNAL_TABLE"
}
EOF
)
    create_table "users" "$USERS_TABLE_INPUT"
    echo "✓ Created table: users (location: s3://${S3_STATIC_BUCKET}/athena/users/)"
fi

# Create sessions table
echo "Checking sessions table..."
if table_exists "sessions"; then
    echo "✓ Table already exists: sessions"
else
    SESSIONS_TABLE_INPUT=$(cat <<EOF
{
  "Name": "sessions",
  "StorageDescriptor": {
    "Columns": [
      {"Name": "sessionId", "Type": "string"},
      {"Name": "userId", "Type": "string"},
      {"Name": "ipAddress", "Type": "string"},
      {"Name": "userAgent", "Type": "string"},
      {"Name": "dateCreated", "Type": "timestamp"},
      {"Name": "dateLastAccessed", "Type": "timestamp"},
      {"Name": "dateExpires", "Type": "timestamp"}
    ],
    "Location": "s3://${S3_STATIC_BUCKET}/athena/sessions/",
    "InputFormat": "org.apache.hadoop.mapred.TextInputFormat",
    "OutputFormat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
    "SerdeInfo": {
      "SerializationLibrary": "org.openx.data.jsonserde.JsonSerDe"
    }
  },
  "TableType": "EXTERNAL_TABLE"
}
EOF
)
    create_table "sessions" "$SESSIONS_TABLE_INPUT"
    echo "✓ Created table: sessions (location: s3://${S3_STATIC_BUCKET}/athena/sessions/)"
fi

# Create api_keys table
echo "Checking api_keys table..."
if table_exists "api_keys"; then
    echo "✓ Table already exists: api_keys"
else
    API_KEYS_TABLE_INPUT=$(cat <<EOF
{
  "Name": "api_keys",
  "StorageDescriptor": {
    "Columns": [
      {"Name": "apiKeyId", "Type": "string"},
      {"Name": "userId", "Type": "string"},
      {"Name": "apiKey", "Type": "string"},
      {"Name": "description", "Type": "string"},
      {"Name": "dateCreated", "Type": "timestamp"},
      {"Name": "dateLastAccessed", "Type": "timestamp"}
    ],
    "Location": "s3://${S3_STATIC_BUCKET}/athena/api_keys/",
    "InputFormat": "org.apache.hadoop.mapred.TextInputFormat",
    "OutputFormat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
    "SerdeInfo": {
      "SerializationLibrary": "org.openx.data.jsonserde.JsonSerDe"
    }
  },
  "TableType": "EXTERNAL_TABLE"
}
EOF
)
    create_table "api_keys" "$API_KEYS_TABLE_INPUT"
    echo "✓ Created table: api_keys (location: s3://${S3_STATIC_BUCKET}/athena/api_keys/)"
fi

echo ""
echo "========================================="
echo "Athena Tables Configuration Complete!"
echo "========================================="
echo ""
echo "Tables created in database: ${GLUE_DATABASE}"
echo "  - users (8 columns)"
echo "  - sessions (7 columns)"
echo "  - api_keys (6 columns)"
echo ""
echo "Data locations:"
echo "  - s3://${S3_STATIC_BUCKET}/athena/users/"
echo "  - s3://${S3_STATIC_BUCKET}/athena/sessions/"
echo "  - s3://${S3_STATIC_BUCKET}/athena/api_keys/"
echo ""
echo "Test with:"
echo "  SELECT * FROM ${GLUE_DATABASE}.users;"
echo "  SELECT * FROM ${GLUE_DATABASE}.sessions;"
echo "  SELECT * FROM ${GLUE_DATABASE}.api_keys;"
echo "========================================"
