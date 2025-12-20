#!/bin/bash
# Initialize Athena and Glue for local development with Moto
# Creates Athena workgroup, Glue database, and sample tables idempotently

set -e

# Source centralized configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

echo "========================================="
echo "Initializing Athena & Glue"
echo "========================================="
echo "Database: ${GLUE_DATABASE}"
echo "Workgroup: ${ATHENA_WORKGROUP}"
echo ""

# Wait for Moto to be ready
wait_for_moto || exit 1

echo ""

# Create Athena workgroup
echo "Creating Athena workgroup..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  athena create-work-group \
  --name ${ATHENA_WORKGROUP} \
  --region ${AWS_REGION} \
  --description "Athena workgroup for serverlesslaunchpad ${ENVIRONMENT} environment" \
  --configuration "ResultConfiguration={OutputLocation=${ATHENA_RESULTS_LOCATION}}" >/dev/null 2>&1 || \
  echo "   (Workgroup already exists)"

echo "✓ Created/verified Athena workgroup: ${ATHENA_WORKGROUP}"

# Create Glue database
echo "Creating Glue database..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  glue create-database \
  --region ${AWS_REGION} \
  --database-input '{
    "Name": "'"${GLUE_DATABASE}"'",
    "Description": "Glue database for serverlesslaunchpad '"${ENVIRONMENT}"' environment"
  }' >/dev/null 2>&1 || \
  echo "   (Database already exists)"

echo "✓ Created/verified Glue database: ${GLUE_DATABASE}"

# Create sample table for testing
echo "Creating sample Glue table..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  glue create-table \
  --region ${AWS_REGION} \
  --database-name ${GLUE_DATABASE} \
  --table-input '{
    "Name": "sample_logs",
    "Description": "Sample logs table for testing",
    "StorageDescriptor": {
      "Columns": [
        {"Name": "timestamp", "Type": "string"},
        {"Name": "level", "Type": "string"},
        {"Name": "message", "Type": "string"},
        {"Name": "user_id", "Type": "string"}
      ],
      "Location": "s3://'"${S3_STATIC_BUCKET}"'/logs/",
      "InputFormat": "org.apache.hadoop.mapred.TextInputFormat",
      "OutputFormat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
      "SerdeInfo": {
        "SerializationLibrary": "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe",
        "Parameters": {
          "field.delim": ",",
          "skip.header.line.count": "1"
        }
      }
    },
    "PartitionKeys": [
      {"Name": "year", "Type": "string"},
      {"Name": "month", "Type": "string"},
      {"Name": "day", "Type": "string"}
    ]
  }' >/dev/null 2>&1 || \
  echo "   (Table already exists)"

echo "✓ Created/verified sample table: sample_logs"

# Store Athena/Glue configuration in SSM
echo "Storing Athena/Glue configuration in SSM..."

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_ATHENA_WORKGROUP}" \
  --value "${ATHENA_WORKGROUP}" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_GLUE_DATABASE}" \
  --value "${GLUE_DATABASE}" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_ATHENA_RESULTS}" \
  --value "${ATHENA_RESULTS_LOCATION}" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

echo "✓ Configuration stored in SSM"

# Create sample data file
echo "Creating sample data for testing..."
cat > /tmp/sample_logs.csv <<EOF
timestamp,level,message,user_id
2024-01-01T00:00:00Z,INFO,User logged in,user123
2024-01-01T00:01:00Z,DEBUG,Processing request,user123
2024-01-01T00:02:00Z,ERROR,Database connection failed,user456
2024-01-01T00:03:00Z,INFO,User logged out,user123
EOF

# Upload sample data to S3
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  s3 cp /tmp/sample_logs.csv s3://${S3_STATIC_BUCKET}/logs/year=2024/month=01/day=01/sample_logs.csv \
  --region ${AWS_REGION}

echo "✓ Created sample data file"

# Clean up temp files
rm -f /tmp/sample_logs.csv

echo ""
echo "========================================="
echo "Athena & Glue Configuration Complete!"
echo "========================================="
echo ""
echo "Resources created:"
echo "  - Athena workgroup: ${ATHENA_WORKGROUP}"
echo "  - Glue database: ${GLUE_DATABASE}"
echo "  - Sample table: sample_logs"
echo "  - Sample data: s3://${S3_STATIC_BUCKET}/logs/"
echo "  - Results location: ${ATHENA_RESULTS_LOCATION}"
echo ""
echo "Test queries:"
echo "  SELECT * FROM ${GLUE_DATABASE}.sample_logs LIMIT 10;"
echo ""
echo "Test with:"
echo "  aws --endpoint-url=${AWS_ENDPOINT_URL} athena list-work-groups --region ${AWS_REGION}"
echo "  aws --endpoint-url=${AWS_ENDPOINT_URL} glue get-databases --region ${AWS_REGION}"
echo "========================================"