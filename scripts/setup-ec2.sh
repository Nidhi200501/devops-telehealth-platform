#!/bin/bash
# ==============================================
# TeleHealth Platform - EC2 Instance Setup Script
# ==============================================
# Run this script on a fresh Ubuntu 22.04 EC2 instance
# Usage: chmod +x setup-ec2.sh && sudo ./setup-ec2.sh

set -euo pipefail

echo "============================================="
echo "  TeleHealth Platform - EC2 Setup"
echo "============================================="

# ========================
# System Updates
# ========================
echo "[1/7] Updating system packages..."
apt-get update -y
apt-get upgrade -y

# ========================
# Install Docker
# ========================
echo "[2/7] Installing Docker..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group
usermod -aG docker ubuntu

# ========================
# Configure Swap (for t2.micro)
# ========================
echo "[3/7] Configuring swap space..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap configured: 2GB"
else
    echo "Swap already exists"
fi

# ========================
# Configure Firewall
# ========================
echo "[4/7] Configuring firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# ========================
# Install CloudWatch Agent
# ========================
echo "[5/7] Installing CloudWatch Agent..."
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# ========================
# Create Application Directory
# ========================
echo "[6/7] Creating application directory..."
mkdir -p /home/ubuntu/telehealth
chown ubuntu:ubuntu /home/ubuntu/telehealth

# ========================
# Install Certbot (for Let's Encrypt)
# ========================
echo "[7/7] Installing Certbot..."
apt-get install -y certbot

echo ""
echo "============================================="
echo "  ✅ EC2 Setup Complete!"
echo "============================================="
echo ""
echo "Next steps:"
echo "  1. Log out and log back in (for Docker group)"
echo "  2. Copy your docker-compose.yml, nginx.conf, and .env to ~/telehealth/"
echo "  3. Run: cd ~/telehealth && docker compose up -d"
echo "  4. Setup SSL: sudo ./setup-ssl.sh your-domain.com"
echo "  5. Configure CloudWatch: sudo ./setup-cloudwatch.sh"
echo ""
