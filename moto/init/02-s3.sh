#!/bin/bash
# Initialize S3 buckets for local development with Moto

set -e

AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localhost:5555}
AWS_REGION=${AWS_DEFAULT_REGION:-us-west-2}

# Set dummy AWS credentials for Moto
export AWS_ACCESS_KEY_ID=testing
export AWS_SECRET_ACCESS_KEY=testing
export AWS_SECURITY_TOKEN=testing
export AWS_SESSION_TOKEN=testing

echo "========================================="
echo "Initializing S3 for Moto"
echo "========================================="

# Create main uploads bucket
echo "Creating S3 bucket for uploads..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  s3api create-bucket \
  --bucket serverlesslaunchpad-local-uploads >/dev/null 2>&1 || \
  echo "   (Bucket already exists)"

echo "✓ Created/verified bucket: serverlesslaunchpad-local-uploads"

# Create static assets bucket
echo "Creating S3 bucket for static assets..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  s3api create-bucket \
  --bucket serverlesslaunchpad-local-static >/dev/null 2>&1 || \
  echo "   (Bucket already exists)"

echo "✓ Created/verified bucket: serverlesslaunchpad-local-static"

# Create Athena results bucket
echo "Creating S3 bucket for Athena query results..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  s3api create-bucket \
  --bucket serverlesslaunchpad-local-athena-results >/dev/null 2>&1 || \
  echo "   (Bucket already exists)"

echo "✓ Created/verified bucket: serverlesslaunchpad-local-athena-results"

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
aws --endpoint-url=$AWS_ENDPOINT_URL \
  s3api put-bucket-cors \
  --bucket serverlesslaunchpad-local-uploads \
  --region $AWS_REGION \
  --cors-configuration file:///tmp/cors.json

echo "✓ CORS configured for uploads bucket"

# Apply CORS configuration to static bucket
echo "Configuring CORS for static bucket..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  s3api put-bucket-cors \
  --bucket serverlesslaunchpad-local-static \
  --region $AWS_REGION \
  --cors-configuration file:///tmp/cors.json

echo "✓ CORS configured for static bucket"

# Enable versioning on uploads bucket
echo "Enabling versioning on uploads bucket..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  s3api put-bucket-versioning \
  --bucket serverlesslaunchpad-local-uploads \
  --region $AWS_REGION \
  --versioning-configuration Status=Enabled

echo "✓ Versioning enabled on uploads bucket"

# Store bucket names in SSM
echo "Storing S3 configuration in SSM Parameter Store..."

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/s3/uploads-bucket" \
  --value "serverlesslaunchpad-local-uploads" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/s3/static-bucket" \
  --value "serverlesslaunchpad-local-static" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/s3/athena-results-bucket" \
  --value "serverlesslaunchpad-local-athena-results" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

echo "✓ S3 configuration stored in SSM"

# Create sample files for testing
echo "Creating sample files..."

echo "Hello from Moto S3!" | aws --endpoint-url=$AWS_ENDPOINT_URL \
  s3 cp - s3://serverlesslaunchpad-local-static/test.txt \
  --region $AWS_REGION

echo "✓ Created sample file: s3://serverlesslaunchpad-local-static/test.txt"

# Clean up temp files
rm -f /tmp/cors.json

# Define bucket names as variables for reuse
UPLOAD_BUCKET="serverlesslaunchpad-local-uploads"
STATIC_BUCKET="serverlesslaunchpad-local-static"
ATHENA_BUCKET="serverlesslaunchpad-local-athena-results"

# Auto-update .env.local file in web directory with S3 configuration
# Script is run from project root, so use direct path
ENV_LOCAL_FILE="web/.env.local"
if [ -f "$ENV_LOCAL_FILE" ]; then
  echo "Updating $ENV_LOCAL_FILE with S3 configuration..."
  
  # Update S3 bucket names
  if grep -q "VITE_S3_UPLOAD_BUCKET" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_S3_UPLOAD_BUCKET=.*/VITE_S3_UPLOAD_BUCKET=$UPLOAD_BUCKET/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_S3_UPLOAD_BUCKET=$UPLOAD_BUCKET" >> "$ENV_LOCAL_FILE"
  fi
  
  if grep -q "VITE_S3_STATIC_BUCKET" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_S3_STATIC_BUCKET=.*/VITE_S3_STATIC_BUCKET=$STATIC_BUCKET/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_S3_STATIC_BUCKET=$STATIC_BUCKET" >> "$ENV_LOCAL_FILE"
  fi
  
  # Remove backup file
  rm -f "$ENV_LOCAL_FILE.bak"
  echo "✓ Updated $ENV_LOCAL_FILE with S3 buckets"
fi

echo ""
echo "========================================="
echo "S3 Moto Configuration Complete!"
echo "========================================="
echo ""
echo "Buckets created:"
echo "  - $UPLOAD_BUCKET (versioned, private)"
echo "  - $STATIC_BUCKET (with CORS)"
echo "  - $ATHENA_BUCKET (for query results)"
echo ""
echo "CORS enabled for origins:"
echo "  - http://localhost:5173 (Web frontend)"
echo "  - http://localhost:3000 (API)"
echo ""
echo "Test with:"
echo "  aws --endpoint-url=$AWS_ENDPOINT_URL s3 ls"
echo "========================================"