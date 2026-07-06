# 🚀 TeleHealth Platform — Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [AWS EC2 Setup](#aws-ec2-setup)
3. [EC2 Configuration](#ec2-configuration)
4. [Application Deployment](#application-deployment)
5. [Docker Setup](#docker-setup)
6. [CloudWatch Monitoring](#cloudwatch-monitoring)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Verification](#verification)

---

## 1️⃣ Prerequisites

| Requirement | Version |
|-------------|---------|
| AWS Account | Free Tier |
| Git | Latest |
| Docker | 20.10+ |
| Node.js | 18+ |
| MongoDB | 6+ |
| k6 | Latest |

---

## 2️⃣ AWS EC2 Setup

### Step 1: Launch EC2 Instance

1. **AWS Console** → EC2 → Launch Instance

| Setting | Value |
|---------|-------|
| **Name** | `devops-telehealth-server` |
| **AMI** | Ubuntu 22.04 LTS |
| **Instance Type** | t3.micro (Free Tier) |
| **Key Pair** | Create new → `devops-key` |
| **Storage** | 20 GB gp3 |

### Step 2: Security Group Rules

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |
| Custom TCP | 3000 | 0.0.0.0/0 |

### Step 3: IAM Role

| Role | Policies |
|------|----------|
| `ec2-cloudwatch-role` | CloudWatchAgentServerPolicy, AmazonS3ReadOnlyAccess |

---

## 3️⃣ EC2 Configuration

### Step 1: SSH Connect

```bash
ssh -i ~/.ssh/devops-key.pem ec2-user@<EC2_PUBLIC_IP>
