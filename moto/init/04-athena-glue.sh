#!/bin/bash
# Initialize Athena and Glue for local development with Moto

set -e

AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localhost:5555}
AWS_REGION=${AWS_DEFAULT_REGION:-us-west-2}

# Set dummy AWS credentials for Moto
export AWS_ACCESS_KEY_ID=testing
export AWS_SECRET_ACCESS_KEY=testing
export AWS_SECURITY_TOKEN=testing
export AWS_SESSION_TOKEN=testing

echo "========================================="
echo "Initializing Athena & Glue for Moto"
echo "========================================="

# Create Athena workgroup
echo "Creating Athena workgroup..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  athena create-work-group \
  --name serverlesslaunchpad-local-workgroup \
  --region $AWS_REGION \
  --description "Moto workgroup for serverlesslaunchpad local development" \
  --configuration "ResultConfiguration={OutputLocation=s3://serverlesslaunchpad-local-athena-results/}" >/dev/null 2>&1 || \
  echo "   (Workgroup already exists)"

echo "✓ Created/verified Athena workgroup: serverlesslaunchpad-local-workgroup"

# Create Glue database
echo "Creating Glue database..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  glue create-database \
  --region $AWS_REGION \
  --database-input '{
    "Name": "serverlesslaunchpad_local",
    "Description": "Local database for serverlesslaunchpad"
  }' >/dev/null 2>&1 || \
  echo "   (Database already exists)"

echo "✓ Created/verified Glue database: serverlesslaunchpad_local"

# Create sample table for testing
echo "Creating sample Glue table..."
aws --endpoint-url=$AWS_ENDPOINT_URL \
  glue create-table \
  --region $AWS_REGION \
  --database-name serverlesslaunchpad_local \
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
      "Location": "s3://serverlesslaunchpad-local-static/logs/",
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

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/athena/workgroup" \
  --value "serverlesslaunchpad-local-workgroup" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/glue/database" \
  --value "serverlesslaunchpad_local" \
  --type String \
  --region $AWS_REGION \
  --overwrite >/dev/null

aws --endpoint-url=$AWS_ENDPOINT_URL \
  ssm put-parameter \
  --name "/serverlesslaunchpad/local/athena/results-location" \
  --value "s3://serverlesslaunchpad-local-athena-results/" \
  --type String \
  --region $AWS_REGION \
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
aws --endpoint-url=$AWS_ENDPOINT_URL \
  s3 cp /tmp/sample_logs.csv s3://serverlesslaunchpad-local-static/logs/year=2024/month=01/day=01/sample_logs.csv \
  --region $AWS_REGION

echo "✓ Created sample data file"

# Clean up temp files
rm -f /tmp/sample_logs.csv

# Define names as variables for reuse
ATHENA_WORKGROUP="serverlesslaunchpad-local-workgroup"
GLUE_DATABASE="serverlesslaunchpad_local"
ATHENA_RESULTS_LOCATION="s3://serverlesslaunchpad-local-athena-results/"

# Auto-update .env.local file in web directory with Athena/Glue configuration
# Script is run from project root, so use direct path
ENV_LOCAL_FILE="web/.env.local"
if [ -f "$ENV_LOCAL_FILE" ]; then
  echo "Updating $ENV_LOCAL_FILE with Athena/Glue configuration..."
  
  # Update Athena workgroup
  if grep -q "VITE_ATHENA_WORKGROUP" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_ATHENA_WORKGROUP=.*/VITE_ATHENA_WORKGROUP=$ATHENA_WORKGROUP/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_ATHENA_WORKGROUP=$ATHENA_WORKGROUP" >> "$ENV_LOCAL_FILE"
  fi
  
  # Update Glue database
  if grep -q "VITE_GLUE_DATABASE" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s/VITE_GLUE_DATABASE=.*/VITE_GLUE_DATABASE=$GLUE_DATABASE/" "$ENV_LOCAL_FILE"
  else
    echo "VITE_GLUE_DATABASE=$GLUE_DATABASE" >> "$ENV_LOCAL_FILE"
  fi
  
  # Update Athena results location
  if grep -q "VITE_ATHENA_RESULTS_LOCATION" "$ENV_LOCAL_FILE"; then
    sed -i.bak "s|VITE_ATHENA_RESULTS_LOCATION=.*|VITE_ATHENA_RESULTS_LOCATION=$ATHENA_RESULTS_LOCATION|" "$ENV_LOCAL_FILE"
  else
    echo "VITE_ATHENA_RESULTS_LOCATION=$ATHENA_RESULTS_LOCATION" >> "$ENV_LOCAL_FILE"
  fi
  
  # Remove backup file
  rm -f "$ENV_LOCAL_FILE.bak"
  echo "✓ Updated $ENV_LOCAL_FILE with Athena/Glue configuration"
fi

echo ""
echo "========================================="
echo "Athena & Glue Configuration Complete!"
echo "========================================="
echo ""
echo "Resources created:"
echo "  - Athena workgroup: $ATHENA_WORKGROUP"
echo "  - Glue database: $GLUE_DATABASE" 
echo "  - Sample table: sample_logs"
echo "  - Sample data: s3://serverlesslaunchpad-local-static/logs/"
echo ""
echo "Test queries:"
echo "  SELECT * FROM $GLUE_DATABASE.sample_logs LIMIT 10;"
echo ""
echo "Test with:"
echo "  aws --endpoint-url=$AWS_ENDPOINT_URL athena list-work-groups"
echo "  aws --endpoint-url=$AWS_ENDPOINT_URL glue get-databases"
echo "========================================"