#!/bin/bash
# ==============================================
# TeleHealth Platform - SSL/HTTPS Setup Script
# ==============================================
# Usage: sudo ./setup-ssl.sh your-domain.com [email@example.com]

set -euo pipefail

DOMAIN="${1:?Usage: ./setup-ssl.sh <domain> [email]}"
EMAIL="${2:-admin@$DOMAIN}"

echo "============================================="
echo "  TeleHealth Platform - SSL Setup"
echo "============================================="
echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo ""

# ========================
# Stop Nginx temporarily
# ========================
echo "[1/4] Preparing for SSL certificate..."
docker compose -f /home/ubuntu/telehealth/docker-compose.yml stop nginx 2>/dev/null || true

# ========================
# Obtain SSL Certificate
# ========================
echo "[2/4] Obtaining Let's Encrypt certificate..."
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domain "$DOMAIN" \
    --preferred-challenges http

# ========================
# Setup Certificate Files
# ========================
echo "[3/4] Setting up certificate files..."
CERT_DIR="/home/ubuntu/telehealth/certs"
mkdir -p "$CERT_DIR"

cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem "$CERT_DIR/fullchain.pem"
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"
chmod 600 "$CERT_DIR/privkey.pem"

# ========================
# Setup Auto-Renewal
# ========================
echo "[4/4] Configuring auto-renewal..."
cat > /etc/cron.d/certbot-renew << EOF
# Renew SSL certificates twice daily
0 0,12 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERT_DIR/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERT_DIR/privkey.pem && docker compose -f /home/ubuntu/telehealth/docker-compose.yml restart nginx"
EOF

# Restart Nginx
echo "Restarting Nginx..."
docker compose -f /home/ubuntu/telehealth/docker-compose.yml up -d nginx

echo ""
echo "============================================="
echo "  ✅ SSL Setup Complete!"
echo "============================================="
echo ""
echo "Certificate location: $CERT_DIR/"
echo "Auto-renewal: Configured (twice daily check)"
echo ""
echo "⚠️  Don't forget to:"
echo "  1. Uncomment SSL volume mounts in docker-compose.yml"
echo "  2. Uncomment HTTPS server block in nginx.conf"
echo "  3. Enable HTTP→HTTPS redirect in nginx.conf"
echo "  4. Restart: docker compose up -d"
echo ""
