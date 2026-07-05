# 🏥 TeleHealth Platform

A production-ready healthcare appointment booking API built with Node.js, Express.js, and MongoDB, featuring complete DevOps implementation with Docker, CI/CD (GitHub Actions), AWS cloud infrastructure, and comprehensive monitoring.

[![CI/CD Pipeline](https://github.com/your-username/telehealth-platform/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/your-username/telehealth-platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [API Endpoints](#-api-endpoints)
- [Quick Start](#-quick-start)
- [Docker Setup](#-docker-setup)
- [AWS Deployment](#-aws-deployment)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Monitoring & Logging](#-monitoring--logging)
- [Load Testing](#-load-testing)
- [Security](#-security)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                 GITHUB REPOSITORY                 │
│            (Push → Trigger CI/CD)                 │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│              GITHUB ACTIONS CI/CD                 │
│         Test → Build → Push → Deploy              │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│                   AWS CLOUD                       │
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │            EC2 Instance (t2.micro)        │    │
│  │  ┌──────────────────────────────────┐    │    │
│  │  │      Docker Containers           │    │    │
│  │  │  ┌─────────┐  ┌──────────────┐  │    │    │
│  │  │  │ Node.js  │  │    Nginx     │  │    │    │
│  │  │  │   App    │←─│ Rev. Proxy   │  │    │    │
│  │  │  └────┬─────┘  └──────────────┘  │    │    │
│  │  │       │                           │    │    │
│  │  │  ┌────┴─────┐                    │    │    │
│  │  │  │ MongoDB  │                    │    │    │
│  │  │  └──────────┘                    │    │    │
│  │  └──────────────────────────────────┘    │    │
│  │       CloudWatch Agent                    │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
│  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  S3 Bucket  │  │      CloudWatch          │   │
│  │  - Assets   │  │  - Metrics Dashboard     │   │
│  │  - Logs     │  │  - Application Logs      │   │
│  └─────────────┘  │  - Alarms (CPU/Error)    │   │
│                    └──────────────────────────┘   │
└──────────────────────────────────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │    USERS     │
              │ HTTPS Access │
              └──────────────┘
```

---

## ✨ Features

- **User Management** — JWT-based registration & login, profile management
- **Appointment System** — Book, view, and cancel appointments with double-booking prevention
- **Doctor Directory** — Browse doctors by specialization with pagination
- **Health Monitoring** — `/health` endpoint with system metrics, Prometheus integration
- **Security** — Helmet, CORS, rate limiting, input validation, XSS protection
- **Logging** — Winston with file & CloudWatch transports
- **Containerized** — Multi-stage Docker build, Docker Compose orchestration
- **CI/CD** — Automated test → build → deploy pipeline via GitHub Actions
- **Cloud Native** — AWS EC2, S3, CloudWatch, IAM integration
- **Load Tested** — k6 performance testing (100 VUs, <500ms p95)

---

## 🛠 Tech Stack

| Category       | Technology                          |
|----------------|-------------------------------------|
| Runtime        | Node.js 18+                         |
| Framework      | Express.js                          |
| Database       | MongoDB 6 (Mongoose ODM)            |
| Auth           | JWT (jsonwebtoken + bcryptjs)        |
| Security       | Helmet, CORS, express-rate-limit     |
| Validation     | express-validator                    |
| Logging        | Winston                              |
| Metrics        | prom-client (Prometheus format)      |
| Testing        | Jest + Supertest                     |
| Load Testing   | k6                                   |
| Container      | Docker + Docker Compose              |
| Proxy          | Nginx                                |
| CI/CD          | GitHub Actions                       |
| Cloud          | AWS (EC2, S3, CloudWatch, IAM)       |
| SSL            | Let's Encrypt (Certbot)              |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint              | Description          | Auth |
|--------|-----------------------|----------------------|------|
| POST   | `/api/auth/register`  | Register new user    | ❌   |
| POST   | `/api/auth/login`     | Login & get token    | ❌   |
| GET    | `/api/auth/profile`   | Get user profile     | ✅   |

### Appointments
| Method | Endpoint                   | Description              | Auth |
|--------|----------------------------|--------------------------|------|
| GET    | `/api/appointments`        | List user appointments   | ✅   |
| POST   | `/api/appointments`        | Book an appointment      | ✅   |
| GET    | `/api/appointments/:id`    | Get appointment details  | ✅   |
| DELETE | `/api/appointments/:id`    | Cancel an appointment    | ✅   |

### Doctors
| Method | Endpoint            | Description          | Auth |
|--------|---------------------|----------------------|------|
| GET    | `/api/doctors`      | List all doctors     | ❌   |
| GET    | `/api/doctors/:id`  | Get doctor details   | ❌   |

### Monitoring
| Method | Endpoint        | Description               | Auth |
|--------|-----------------|---------------------------|------|
| GET    | `/health`       | Health check + system info | ❌   |
| GET    | `/api/metrics`  | Prometheus metrics         | ❌   |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Docker & Docker Compose (optional)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/telehealth-platform.git
cd telehealth-platform

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## 🐳 Docker Setup

### Build & Run with Docker Compose

```bash
# Build and start all services (app + MongoDB + Nginx)
docker compose up -d --build

# View logs
docker compose logs -f app

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Build Docker Image Only

```bash
# Build the image
docker build -t telehealth-platform .

# Run the container
docker run -p 3000:3000 --env-file .env telehealth-platform
```

### Container Health Check

```bash
# Check container status
docker ps

# Verify health
curl http://localhost:3000/health
```

---

## ☁️ AWS Deployment

### Step-by-Step Deployment Guide

#### 1. Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance type: t2.micro (free tier)
- Security group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Create/assign IAM role with CloudWatch and S3 permissions

#### 2. Setup EC2 Instance
```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Upload and run setup script
chmod +x scripts/setup-ec2.sh
sudo ./scripts/setup-ec2.sh
```

#### 3. Setup S3 Bucket
```bash
./scripts/setup-s3.sh telehealth-assets us-east-1
```

#### 4. Deploy Application
```bash
# Copy files to EC2
scp -i your-key.pem docker-compose.yml nginx.conf .env ubuntu@your-ec2-ip:~/telehealth/

# Deploy
./scripts/deploy.sh
```

#### 5. Setup SSL (HTTPS)
```bash
sudo ./scripts/setup-ssl.sh your-domain.com your-email@example.com
```

#### 6. Setup CloudWatch Monitoring
```bash
sudo ./scripts/setup-cloudwatch.sh
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The pipeline is triggered on push/PR to `main`:

```
Push to main → Test → Build Docker → Push to Hub → Deploy to EC2 → Health Check
```

### Required GitHub Secrets

| Secret             | Description                    |
|--------------------|--------------------------------|
| `DOCKER_USERNAME`  | Docker Hub username            |
| `DOCKER_PASSWORD`  | Docker Hub password/token      |
| `EC2_HOST`         | EC2 public IP/hostname         |
| `EC2_SSH_KEY`      | EC2 SSH private key            |
| `EC2_USER`         | EC2 username (ubuntu)          |

### Setup
1. Go to GitHub repo → Settings → Secrets → Actions
2. Add each secret listed above
3. Push to `main` to trigger the pipeline

---

## 📊 Monitoring & Logging

### Health Endpoint
```bash
curl http://localhost:3000/health | jq
```
Returns: status, uptime, DB state, CPU, memory, process info

### Prometheus Metrics
```bash
curl http://localhost:3000/api/metrics
```
Exports: request duration histograms, request counters, active connections, Node.js runtime metrics

### CloudWatch Dashboard
After running `setup-cloudwatch.sh`, view at:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=TeleHealth-Dashboard
```

**Dashboard includes:**
- CPU utilization
- Memory usage
- Request latency (avg + p95)
- Error rates
- User activity (logins + registrations)
- Disk usage
- Application logs

### CloudWatch Alarms
- **TeleHealth-HighCPU** — Triggers when CPU > 80% for 10 minutes
- **TeleHealth-HighMemory** — Triggers when memory > 90% for 10 minutes

---

## 📈 Load Testing

### Prerequisites
Install [k6](https://k6.io/docs/getting-started/installation/):
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6
```

### Run Load Test
```bash
# Standard load test (100 VUs)
k6 run k6/load-test.js

# With custom base URL
k6 run -e BASE_URL=http://your-server:3000 k6/load-test.js

# Stress test (up to 1000 VUs)
k6 run k6/stress-test.js
```

### Performance Thresholds
| Metric                  | Threshold      |
|-------------------------|----------------|
| HTTP request duration   | p95 < 500ms    |
| Error rate              | < 1%           |
| Registration time       | p95 < 1000ms   |
| Login time              | p95 < 500ms    |
| Health check time       | p95 < 200ms    |

---

## 🔒 Security

| Measure                | Implementation                     |
|------------------------|------------------------------------|
| HTTPS Encryption       | Let's Encrypt + Nginx SSL          |
| Authentication         | JWT with bcrypt password hashing   |
| Rate Limiting          | express-rate-limit (API + Auth)    |
| Input Validation       | express-validator                  |
| XSS Protection         | Helmet middleware                  |
| Security Headers       | Helmet (X-Frame, CSP, HSTS, etc.) |
| CORS                   | Configurable origin whitelist      |
| SQL/NoSQL Injection    | Mongoose parameterized queries     |
| Non-root Container     | Docker runs as unprivileged user   |
| IAM Least Privilege    | Minimal AWS permissions            |
| S3 Public Access Block | All public access blocked          |

---

## 📁 Project Structure

```
telehealth-platform/
├── src/
│   ├── controllers/        # Route handlers
│   │   ├── authController.js
│   │   ├── appointmentController.js
│   │   ├── doctorController.js
│   │   └── healthController.js
│   ├── models/             # Mongoose schemas
│   │   ├── User.js
│   │   ├── Doctor.js
│   │   └── Appointment.js
│   ├── routes/             # Express routes
│   │   ├── authRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── doctorRoutes.js
│   │   └── healthRoutes.js
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validator.js
│   ├── services/           # External service integrations
│   │   ├── cloudwatchService.js
│   │   └── s3Service.js
│   ├── utils/              # Utilities
│   │   ├── logger.js
│   │   └── database.js
│   ├── app.js              # Express app setup
│   └── server.js           # Server entry point
├── tests/                  # Jest test suites
│   ├── setup.js
│   ├── auth.test.js
│   ├── appointment.test.js
│   └── health.test.js
├── k6/                     # Load testing
│   ├── load-test.js
│   └── stress-test.js
├── scripts/                # Infrastructure scripts
│   ├── setup-ec2.sh
│   ├── setup-cloudwatch.sh
│   ├── setup-s3.sh
│   ├── setup-ssl.sh
│   └── deploy.sh
├── .github/workflows/      # CI/CD
│   └── ci-cd.yml
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Container orchestration
├── nginx.conf              # Reverse proxy config
├── package.json
├── .env.example
├── .gitignore
├── .dockerignore
└── README.md
```

---

## ⚙️ Environment Variables

| Variable                 | Description                    | Default                |
|--------------------------|--------------------------------|------------------------|
| `PORT`                   | Application port               | `3000`                 |
| `NODE_ENV`               | Environment                    | `development`          |
| `JWT_SECRET`             | JWT signing secret             | (required)             |
| `JWT_EXPIRES_IN`         | Token expiry                   | `7d`                   |
| `DATABASE_URL`           | MongoDB connection string      | `mongodb://localhost...`|
| `AWS_ACCESS_KEY_ID`      | AWS access key                 | (optional)             |
| `AWS_SECRET_ACCESS_KEY`  | AWS secret key                 | (optional)             |
| `AWS_REGION`             | AWS region                     | `us-east-1`            |
| `S3_BUCKET_NAME`         | S3 bucket name                 | `telehealth-assets`    |
| `CLOUDWATCH_GROUP`       | CloudWatch log group           | `/telehealth/app`      |
| `RATE_LIMIT_WINDOW_MS`   | Rate limit window (ms)         | `900000`               |
| `RATE_LIMIT_MAX_REQUESTS`| Max requests per window        | `100`                  |
| `CORS_ORIGIN`            | Allowed CORS origins           | `*`                    |
| `LOG_LEVEL`              | Logging level                  | `info`                 |

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Utkarsh Pandey**

---

*Built with ❤️ for DevOps excellence*
