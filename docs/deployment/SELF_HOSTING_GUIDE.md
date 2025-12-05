# Waykel Self-Hosting Deployment Guide

This guide explains how to deploy Waykel on your own server using Docker.

## Prerequisites

- A Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- Domain name pointed to your server
- SSL certificate (or use Let's Encrypt)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/cloudword/waykelcursor.git
cd waykelcursor
```

### 2. Configure Environment

```bash
# Create environment file from template
cp .env.example .env

# Generate secure passwords and edit settings
nano .env
```

**Required environment variables in `.env`:**
```env
# Database credentials (REQUIRED - use strong passwords!)
POSTGRES_USER=waykel
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=waykel

# Application settings
NODE_ENV=production
PORT=5000
```

### 3. Deploy with Docker Compose

```bash
# Start all services (app + database)
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f app
```

### 4. Initialize Database

```bash
# The app will auto-connect to database on startup
# Check if healthy
curl http://localhost:5000/api/health
```

Your app is now running at `http://your-server-ip:5000`

---

## Production Deployment with SSL

### 1. Set Up SSL Certificates

**Option A: Let's Encrypt (Free)**
```bash
# Install certbot
sudo apt install certbot

# Stop any services on port 80
docker compose down

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Create ssl directory and copy certificates
mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
sudo chown $USER:$USER ssl/*.pem
chmod 644 ssl/*.pem
```

**Option B: Use existing certificates**
```bash
mkdir -p ssl
cp /path/to/your/fullchain.pem ssl/
cp /path/to/your/privkey.pem ssl/
chmod 644 ssl/*.pem
```

### 2. Start with Nginx (Production Profile)

```bash
# Start with production profile (includes Nginx for SSL)
docker compose --profile production up -d
```

Your app is now running at `https://yourdomain.com`

---

## Cloud-Specific Deployments

### AWS EC2

```bash
# 1. Launch EC2 instance (Ubuntu 22.04, t3.small or larger)
# 2. Configure security group: ports 22, 80, 443

# 3. SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 4. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# 5. Clone and deploy
git clone https://github.com/cloudword/waykelcursor.git
cd waykelcursor
cp .env.example .env
# Edit .env with secure passwords
nano .env
docker compose up -d
```

### Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/YOUR_PROJECT/waykel

# Deploy to Cloud Run
gcloud run deploy waykel \
  --image gcr.io/YOUR_PROJECT/waykel \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=YOUR_CLOUD_SQL_URL,NODE_ENV=production"
```

### DigitalOcean Droplet

```bash
# 1. Create Droplet (Docker image from marketplace)
# 2. SSH into droplet
ssh root@your-droplet-ip

# 3. Clone and deploy
git clone https://github.com/cloudword/waykelcursor.git
cd waykelcursor
cp .env.example .env
nano .env  # Set secure passwords
docker compose up -d
```

---

## GitHub Actions Setup

To enable automated deployments, add these secrets to your GitHub repository:

### For SSH Deployment (VPS/EC2/Droplet)

Go to: Repository → Settings → Secrets and variables → Actions

| Secret | Description |
|--------|-------------|
| `STAGING_HOST` | Staging server IP address |
| `STAGING_USER` | SSH username (e.g., ubuntu) |
| `STAGING_SSH_KEY` | Private SSH key for staging |
| `PRODUCTION_HOST` | Production server IP address |
| `PRODUCTION_USER` | SSH username |
| `PRODUCTION_SSH_KEY` | Private SSH key for production |

### For AWS ECS

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |

Go to: Repository → Settings → Variables → Actions

| Variable | Description |
|----------|-------------|
| `AWS_REGION` | e.g., ap-south-1 |
| `ECS_CLUSTER` | ECS cluster name |
| `ECS_SERVICE` | ECS service name |
| `DEPLOY_TARGET` | Set to `aws` |

### For Google Cloud Run

| Secret | Description |
|--------|-------------|
| `GCP_SERVICE_ACCOUNT_KEY` | GCP service account JSON key |

| Variable | Description |
|----------|-------------|
| `GCP_REGION` | e.g., asia-south1 |
| `DEPLOY_TARGET` | Set to `gcp` |

---

## Server Setup Script

Run this script on a fresh Ubuntu 22.04 server:

```bash
#!/bin/bash
set -e

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Create app directory
sudo mkdir -p /opt/waykel
sudo chown $USER:$USER /opt/waykel
cd /opt/waykel

# Clone repository
git clone https://github.com/cloudword/waykelcursor.git .

# Configure environment (IMPORTANT: Edit this file!)
cp .env.example .env
echo "Please edit .env with secure passwords before continuing"
echo "Run: nano .env"
```

After editing `.env`:
```bash
# Start application
docker compose up -d

# Verify it's running
docker compose ps
curl http://localhost:5000/api/health
```

---

## SSL Auto-Renewal

Set up automatic certificate renewal:

```bash
# Create renewal script
cat > /opt/waykel/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/waykel/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/waykel/ssl/
docker compose -f /opt/waykel/docker-compose.yml restart nginx
EOF

chmod +x /opt/waykel/renew-ssl.sh

# Add to crontab (runs monthly)
(crontab -l 2>/dev/null; echo "0 0 1 * * /opt/waykel/renew-ssl.sh") | crontab -
```

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f db
```

### Update Application

```bash
cd /opt/waykel
git pull
docker compose build app
docker compose up -d app
```

### Backup Database

```bash
# Backup
docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB < backup_20241205.sql
```

### Health Check

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...}
```

---

## Troubleshooting

### Container won't start
```bash
docker compose logs app
docker compose down && docker compose up -d
```

### Database connection issues
```bash
# Check if database is running
docker compose ps db

# Check database logs
docker compose logs db
```

### Out of disk space
```bash
docker system prune -a
```

### SSL certificate expired
```bash
sudo certbot renew
/opt/waykel/renew-ssl.sh
```

### Reset everything
```bash
docker compose down -v  # Warning: This deletes database data!
docker compose up -d
```

---

## Security Checklist

Before going live, ensure:

- [ ] Strong passwords set in `.env` file
- [ ] SSL certificates installed and working
- [ ] Database not exposed externally (no `ports:` in docker-compose for db)
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] Regular backups configured
- [ ] Monitoring/alerting set up
