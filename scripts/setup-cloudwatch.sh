#!/bin/bash
# ==============================================
# TeleHealth Platform - CloudWatch Setup Script
# ==============================================
# Run on EC2 instance after CloudWatch agent is installed
# Usage: sudo ./setup-cloudwatch.sh

set -euo pipefail

echo "============================================="
echo "  TeleHealth Platform - CloudWatch Setup"
echo "============================================="

AWS_REGION="${AWS_REGION:-us-east-1}"
LOG_GROUP="/telehealth/app"

# ========================
# CloudWatch Agent Config
# ========================
echo "[1/4] Configuring CloudWatch Agent..."
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "namespace": "TeleHealth/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": true
      },
      "mem": {
        "measurement": [
          "mem_used_percent",
          "mem_total",
          "mem_available"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "disk_used_percent"
        ],
        "metrics_collection_interval": 300,
        "resources": ["/"]
      },
      "net": {
        "measurement": [
          "bytes_sent",
          "bytes_recv"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/telehealth/logs/combined.log",
            "log_group_name": "/telehealth/app",
            "log_stream_name": "combined-{instance_id}",
            "retention_in_days": 30
          },
          {
            "file_path": "/home/ubuntu/telehealth/logs/error.log",
            "log_group_name": "/telehealth/errors",
            "log_stream_name": "errors-{instance_id}",
            "retention_in_days": 30
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/telehealth/nginx",
            "log_stream_name": "access-{instance_id}",
            "retention_in_days": 14
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/telehealth/nginx",
            "log_stream_name": "errors-{instance_id}",
            "retention_in_days": 14
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

echo "CloudWatch agent started."

# ========================
# Create CloudWatch Alarms
# ========================
echo "[2/4] Creating CloudWatch Alarms..."

# CPU Utilization Alarm (>80%)
aws cloudwatch put-metric-alarm \
  --region "$AWS_REGION" \
  --alarm-name "TeleHealth-HighCPU" \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --treat-missing-data notBreaching

echo "CPU alarm created."

# Memory Utilization Alarm (>90%)
aws cloudwatch put-metric-alarm \
  --region "$AWS_REGION" \
  --alarm-name "TeleHealth-HighMemory" \
  --alarm-description "Alert when memory exceeds 90%" \
  --metric-name mem_used_percent \
  --namespace TeleHealth/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --treat-missing-data notBreaching

echo "Memory alarm created."

# ========================
# Create CloudWatch Dashboard
# ========================
echo "[3/4] Creating CloudWatch Dashboard..."

DASHBOARD_BODY=$(cat << 'DASHBOARD'
{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "CPU Utilization",
        "metrics": [
          ["AWS/EC2", "CPUUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "region": "us-east-1",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 0, "width": 12, "height": 6,
      "properties": {
        "title": "Memory Usage",
        "metrics": [
          ["TeleHealth/EC2", "mem_used_percent", {"stat": "Average"}]
        ],
        "period": 300,
        "region": "us-east-1",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 6, "width": 12, "height": 6,
      "properties": {
        "title": "Application - Request Latency",
        "metrics": [
          ["TeleHealth/Application", "RequestLatency", {"stat": "Average"}],
          ["TeleHealth/Application", "RequestLatency", {"stat": "p95"}]
        ],
        "period": 300,
        "region": "us-east-1",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 6, "width": 12, "height": 6,
      "properties": {
        "title": "Application - Error Rate",
        "metrics": [
          ["TeleHealth/Application", "ErrorCount", {"stat": "Sum"}]
        ],
        "period": 300,
        "region": "us-east-1",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 12, "width": 12, "height": 6,
      "properties": {
        "title": "Active Users",
        "metrics": [
          ["TeleHealth/Application", "UserLogins", {"stat": "Sum"}],
          ["TeleHealth/Application", "UserRegistrations", {"stat": "Sum"}]
        ],
        "period": 300,
        "region": "us-east-1",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 12, "width": 12, "height": 6,
      "properties": {
        "title": "Disk Usage",
        "metrics": [
          ["TeleHealth/EC2", "disk_used_percent", {"stat": "Average"}]
        ],
        "period": 300,
        "region": "us-east-1",
        "view": "timeSeries"
      }
    },
    {
      "type": "log",
      "x": 0, "y": 18, "width": 24, "height": 6,
      "properties": {
        "title": "Application Logs",
        "query": "SOURCE '/telehealth/app' | fields @timestamp, @message | sort @timestamp desc | limit 50",
        "region": "us-east-1",
        "view": "table"
      }
    }
  ]
}
DASHBOARD
)

aws cloudwatch put-dashboard \
  --region "$AWS_REGION" \
  --dashboard-name "TeleHealth-Dashboard" \
  --dashboard-body "$DASHBOARD_BODY"

echo "Dashboard created."

# ========================
# Verify Setup
# ========================
echo "[4/4] Verifying CloudWatch setup..."
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status

echo ""
echo "============================================="
echo "  ✅ CloudWatch Setup Complete!"
echo "============================================="
echo ""
echo "Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=TeleHealth-Dashboard"
echo ""
