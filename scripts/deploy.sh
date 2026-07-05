#!/bin/bash
# ==============================================
# TeleHealth Platform - Deployment Script
# ==============================================
# Usage: ./deploy.sh [image-tag]

set -euo pipefail

IMAGE_TAG="${1:-latest}"
APP_DIR="/home/ubuntu/telehealth"

echo "============================================="
echo "  TeleHealth Platform - Deployment"
echo "============================================="
echo "Image tag: $IMAGE_TAG"
echo ""

cd "$APP_DIR"

# ========================
# Pre-deployment checks
# ========================
echo "[1/5] Pre-deployment checks..."
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found. Copy from .env.example and configure."
    exit 1
fi

if [ ! -f docker-compose.yml ]; then
    echo "❌ ERROR: docker-compose.yml not found."
    exit 1
fi

echo "All checks passed."

# ========================
# Pull latest image
# ========================
echo "[2/5] Pulling latest Docker image..."
docker compose pull app

# ========================
# Backup current state
# ========================
echo "[3/5] Creating deployment backup..."
BACKUP_DIR="$APP_DIR/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker compose logs app > "$BACKUP_DIR/pre-deploy-logs.txt" 2>/dev/null || true
cp docker-compose.yml "$BACKUP_DIR/"
echo "Backup saved to $BACKUP_DIR"

# ========================
# Deploy
# ========================
echo "[4/5] Deploying..."
docker compose down
docker compose up -d

# ========================
# Health Check
# ========================
echo "[5/5] Running health check..."
MAX_RETRIES=30
RETRY_INTERVAL=2

for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        echo ""
        echo "============================================="
        echo "  ✅ Deployment Successful!"
        echo "============================================="
        echo ""
        echo "=== Container Status ==="
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "=== Health Status ==="
        curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health
        echo ""
        exit 0
    fi
    echo "Waiting for application... ($i/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
done

echo ""
echo "============================================="
echo "  ❌ Deployment Failed - Rolling Back"
echo "============================================="
echo ""
echo "=== Application Logs ==="
docker compose logs --tail=50 app
echo ""

# Rollback
echo "Rolling back..."
docker compose down
# Attempt to restart with previous image
docker compose up -d
exit 1
