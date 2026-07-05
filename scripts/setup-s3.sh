#!/bin/bash
# ==============================================
# TeleHealth Platform - S3 Setup Script
# ==============================================
# Usage: ./setup-s3.sh [bucket-name] [region]

set -euo pipefail

BUCKET_NAME="${1:-telehealth-assets}"
AWS_REGION="${2:-us-east-1}"

echo "============================================="
echo "  TeleHealth Platform - S3 Setup"
echo "============================================="
echo "Bucket: $BUCKET_NAME"
echo "Region: $AWS_REGION"
echo ""

# ========================
# Create S3 Bucket
# ========================
echo "[1/4] Creating S3 bucket..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "Bucket already exists."
else
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION"
    else
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
    echo "Bucket created."
fi

# ========================
# Enable Versioning
# ========================
echo "[2/4] Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled
echo "Versioning enabled."

# ========================
# Configure Lifecycle Rules
# ========================
echo "[3/4] Configuring lifecycle policies..."
cat > /tmp/lifecycle-config.json << EOF
{
  "Rules": [
    {
      "ID": "TransitionToIA",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        }
      ]
    },
    {
      "ID": "DeleteOldVersions",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "ID": "DeleteOldLogs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET_NAME" \
    --lifecycle-configuration file:///tmp/lifecycle-config.json
rm /tmp/lifecycle-config.json
echo "Lifecycle policies configured."

# ========================
# Configure CORS
# ========================
echo "[4/4] Configuring CORS..."
cat > /tmp/cors-config.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

aws s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration file:///tmp/cors-config.json
rm /tmp/cors-config.json
echo "CORS configured."

# ========================
# Block Public Access (security)
# ========================
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo ""
echo "============================================="
echo "  ✅ S3 Setup Complete!"
echo "============================================="
echo ""
echo "Bucket: s3://$BUCKET_NAME"
echo "Region: $AWS_REGION"
echo "Public access: BLOCKED"
echo "Versioning: ENABLED"
echo "Lifecycle: 30d → IA, 90d delete old versions/logs"
echo ""
