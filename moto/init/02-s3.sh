#!/bin/bash
# Initialize S3 buckets for local development with Moto
# Creates buckets with CORS and versioning configurations idempotently

set -e

# Source centralized configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

echo "========================================="
echo "Initializing S3 Buckets"
echo "========================================="
echo "Creating buckets with prefix: ${S3_BUCKET_PREFIX}"
echo ""

# Wait for Moto to be ready
wait_for_moto || exit 1

echo ""

# Create main uploads bucket
echo "Creating S3 bucket for uploads..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  s3api create-bucket \
  --bucket ${S3_UPLOADS_BUCKET} \
  --region ${AWS_REGION} \
  --create-bucket-configuration LocationConstraint=${AWS_REGION} >/dev/null 2>&1 || \
  echo "   (Bucket already exists)"

echo "✓ Created/verified bucket: ${S3_UPLOADS_BUCKET}"

# Create static assets bucket
echo "Creating S3 bucket for static assets..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  s3api create-bucket \
  --bucket ${S3_STATIC_BUCKET} \
  --region ${AWS_REGION} \
  --create-bucket-configuration LocationConstraint=${AWS_REGION} >/dev/null 2>&1 || \
  echo "   (Bucket already exists)"

echo "✓ Created/verified bucket: ${S3_STATIC_BUCKET}"

# Create Athena results bucket
echo "Creating S3 bucket for Athena query results..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  s3api create-bucket \
  --bucket ${S3_ATHENA_RESULTS_BUCKET} \
  --region ${AWS_REGION} \
  --create-bucket-configuration LocationConstraint=${AWS_REGION} >/dev/null 2>&1 || \
  echo "   (Bucket already exists)"

echo "✓ Created/verified bucket: ${S3_ATHENA_RESULTS_BUCKET}"

# Create CORS configuration file
cat > /tmp/cors.json <<EOF
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

# Apply CORS configuration to uploads bucket
echo "Configuring CORS for uploads bucket..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  s3api put-bucket-cors \
  --bucket ${S3_UPLOADS_BUCKET} \
  --region ${AWS_REGION} \
  --cors-configuration file:///tmp/cors.json

echo "✓ CORS configured for uploads bucket"

# Apply CORS configuration to static bucket
echo "Configuring CORS for static bucket..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  s3api put-bucket-cors \
  --bucket ${S3_STATIC_BUCKET} \
  --region ${AWS_REGION} \
  --cors-configuration file:///tmp/cors.json

echo "✓ CORS configured for static bucket"

# Enable versioning on uploads bucket
echo "Enabling versioning on uploads bucket..."
aws --endpoint-url=${AWS_ENDPOINT_URL} \
  s3api put-bucket-versioning \
  --bucket ${S3_UPLOADS_BUCKET} \
  --region ${AWS_REGION} \
  --versioning-configuration Status=Enabled

echo "✓ Versioning enabled on uploads bucket"

# Store bucket names in SSM
echo "Storing S3 configuration in SSM Parameter Store..."

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_S3_UPLOADS_BUCKET}" \
  --value "${S3_UPLOADS_BUCKET}" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_S3_STATIC_BUCKET}" \
  --value "${S3_STATIC_BUCKET}" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

aws --endpoint-url=${AWS_ENDPOINT_URL} \
  ssm put-parameter \
  --name "${SSM_S3_ATHENA_BUCKET}" \
  --value "${S3_ATHENA_RESULTS_BUCKET}" \
  --type String \
  --region ${AWS_REGION} \
  --overwrite >/dev/null

echo "✓ S3 configuration stored in SSM"

# Create sample files for testing
echo "Creating sample files..."

echo "Hello from Moto S3!" | aws --endpoint-url=${AWS_ENDPOINT_URL} \
  s3 cp - s3://${S3_STATIC_BUCKET}/test.txt \
  --region ${AWS_REGION}

echo "✓ Created sample file: s3://${S3_STATIC_BUCKET}/test.txt"

# Clean up temp files
rm -f /tmp/cors.json

# Auto-update .env.local file in web directory with S3 configuration
# Script is run from project root, so use direct path
ENV_LOCAL_FILE="web/.env.local"
if [ -f "$ENV_LOCAL_FILE" ]; then
  echo "Updating $ENV_LOCAL_FILE with S3 configuration..."

  # Update S3 bucket names
  if grep -q "VITE_S3_UPLOAD_BUCKET" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_S3_UPLOAD_BUCKET=.*/VITE_S3_UPLOAD_BUCKET=${S3_UPLOADS_BUCKET}/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_S3_UPLOAD_BUCKET=${S3_UPLOADS_BUCKET}" >> "$ENV_LOCAL_FILE"
  fi

  if grep -q "VITE_S3_STATIC_BUCKET" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_S3_STATIC_BUCKET=.*/VITE_S3_STATIC_BUCKET=${S3_STATIC_BUCKET}/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_S3_STATIC_BUCKET=${S3_STATIC_BUCKET}" >> "$ENV_LOCAL_FILE"
  fi

  # Remove backup file
  rm -f "$ENV_LOCAL_FILE.bak"
  echo "✓ Updated $ENV_LOCAL_FILE with S3 buckets"
fi

echo ""
echo "========================================="
echo "S3 Configuration Complete!"
echo "========================================="
echo ""
echo "Buckets created:"
echo "  - ${S3_UPLOADS_BUCKET} (versioned, private)"
echo "  - ${S3_STATIC_BUCKET} (with CORS)"
echo "  - ${S3_ATHENA_RESULTS_BUCKET} (for query results)"
echo ""
echo "CORS enabled for origins:"
echo "  - http://localhost:5173 (Web frontend)"
echo "  - http://localhost:3000 (API)"
echo ""
echo "Test with:"
echo "  aws --endpoint-url=${AWS_ENDPOINT_URL} s3 ls --region ${AWS_REGION}"
echo "========================================"