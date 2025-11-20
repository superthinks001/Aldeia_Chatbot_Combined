# AWS EC2 Deployment Guide - Staging Environment

Simple deployment guide for running Aldeia Chatbot on a single AWS EC2 instance using Docker.

## Overview

**What We're Deploying:**
- Single EC2 instance (t3.medium) in Ohio (us-east-2)
- Docker containers (backend, frontend, Redis, ChromaDB)
- Supabase for PostgreSQL (already set up)
- HTTP access via EC2 public IP (HTTPS optional later)

**Estimated Cost:** ~$20-30/month for EC2 + data transfer

---

## Prerequisites Checklist

- [x] AWS CLI configured (`aws sts get-caller-identity` works)
- [ ] Git installed
- [ ] SSH key pair for EC2 access
- [ ] Supabase project with connection details
- [ ] Stripe API keys (for billing)
- [ ] Google Translate API key
- [ ] Anthropic API key (for Claude)

---

## Step 1: Create EC2 Instance

### 1.1 Create Key Pair (if you don't have one)

```bash
# Create new SSH key pair
aws ec2 create-key-pair \
  --key-name aldeia-staging \
  --region us-east-2 \
  --query 'KeyMaterial' \
  --output text > aldeia-staging.pem

# Set permissions
chmod 400 aldeia-staging.pem

# Move to safe location
mv aldeia-staging.pem ~/.ssh/
```

### 1.2 Create Security Group

```bash
# Create security group
aws ec2 create-security-group \
  --group-name aldeia-staging-sg \
  --description "Security group for Aldeia staging server" \
  --region us-east-2

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=aldeia-staging-sg" \
  --region us-east-2 \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

echo "Security Group ID: $SG_ID"

# Allow SSH (port 22)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region us-east-2

# Allow HTTP (port 80)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-east-2

# Allow HTTPS (port 443) - optional
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region us-east-2

# Allow backend port 3001 (temporary for testing)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0 \
  --region us-east-2
```

### 1.3 Launch EC2 Instance

```bash
# Get latest Ubuntu AMI ID
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --region us-east-2 \
  --output text)

echo "Using AMI: $AMI_ID"

# Launch instance
aws ec2 run-instances \
  --image-id $AMI_ID \
  --count 1 \
  --instance-type t3.medium \
  --key-name aldeia-staging \
  --security-group-ids $SG_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=aldeia-staging},{Key=Environment,Value=staging}]' \
  --region us-east-2

# Wait for instance to be running
aws ec2 wait instance-running \
  --filters "Name=tag:Name,Values=aldeia-staging" \
  --region us-east-2

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=aldeia-staging" "Name=instance-state-name,Values=running" \
  --region us-east-2 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "✅ Instance created successfully!"
echo "Public IP: $PUBLIC_IP"
echo "SSH command: ssh -i ~/.ssh/aldeia-staging.pem ubuntu@$PUBLIC_IP"
```

---

## Step 2: Configure EC2 Instance

### 2.1 SSH into Instance

```bash
# SSH to your instance
ssh -i ~/.ssh/aldeia-staging.pem ubuntu@$PUBLIC_IP
```

### 2.2 Install Docker and Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker

# Log out and back in for group changes to take effect
exit
```

### 2.3 Reconnect and Verify

```bash
# SSH back in
ssh -i ~/.ssh/aldeia-staging.pem ubuntu@$PUBLIC_IP

# Verify Docker installation
docker --version
docker compose version
```

---

## Step 3: Deploy Application

### 3.1 Clone Repository

```bash
# Clone repository
git clone https://github.com/superthinks001/Aldeia_Chatbot_Combined.git
cd Aldeia_Chatbot_Combined
```

### 3.2 Create Environment File

```bash
# Create .env file
nano apps/backend/.env
```

**Paste and configure these environment variables:**

```bash
# === SERVER ===
NODE_ENV=staging
PORT=3001
FRONTEND_URL=http://<YOUR_EC2_PUBLIC_IP>:3000

# === DATABASE (Supabase) ===
DATABASE_URL=postgresql://postgres:<password>@<project-id>.supabase.co:5432/postgres
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# === AUTHENTICATION ===
# Generate these with: openssl rand -base64 64
JWT_SECRET=<generate-64-char-secret>
JWT_REFRESH_SECRET=<generate-different-64-char-secret>
SESSION_SECRET=<generate-32-char-secret>

# === REDIS (Local Docker) ===
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=

# === CHROMADB (Local Docker) ===
CHROMA_HOST=chromadb
CHROMA_PORT=8000
CHROMA_AUTH_TOKEN=

# === STRIPE ===
STRIPE_SECRET_KEY=<your-test-secret-key>
STRIPE_PUBLISHABLE_KEY=<your-test-publishable-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>

# === GOOGLE TRANSLATE ===
GOOGLE_TRANSLATE_API_KEY=<your-api-key>

# === ANTHROPIC ===
ANTHROPIC_API_KEY=<your-claude-api-key>

# === CORS ===
CORS_ORIGIN=http://<YOUR_EC2_PUBLIC_IP>:3000
```

**Generate secrets:**
```bash
# Generate JWT secrets
openssl rand -base64 64
openssl rand -base64 64
openssl rand -base64 32
```

### 3.3 Create Frontend Environment File

```bash
# Create frontend .env
nano apps/chatbot-frontend/.env
```

```bash
REACT_APP_API_URL=http://<YOUR_EC2_PUBLIC_IP>:3001
REACT_APP_STRIPE_PUBLISHABLE_KEY=<your-test-publishable-key>
```

---

## Step 4: Start Application

### 4.1 Start Docker Services

```bash
# Start Docker services
docker compose -f docker-compose.dev.yml up -d

# Check services are running
docker compose -f docker-compose.dev.yml ps

# View logs
docker compose -f docker-compose.dev.yml logs -f
```

Expected output:
```
NAME                    STATUS          PORTS
aldeia-redis-dev        Up (healthy)    0.0.0.0:6379->6379/tcp
aldeia-chromadb-dev     Up (healthy)    0.0.0.0:8000->8000/tcp
```

### 4.2 Ingest Documents into ChromaDB

```bash
# Navigate to backend
cd apps/backend

# Run document ingestion
npm run ingest:docs

# Verify ingestion
docker exec -it aldeia-chromadb-dev curl http://localhost:8000/api/v2/heartbeat

cd ../..
```

### 4.3 Start Backend

```bash
# Start backend in background
cd apps/backend
npm install
nohup npm run dev > backend.log 2>&1 &

# Check backend is running
tail -f backend.log
# Press Ctrl+C to exit log view

# Test backend health
curl http://localhost:3001/api/health
```

### 4.4 Start Frontend

```bash
# Open new SSH session or use tmux
cd apps/chatbot-frontend
npm install

# Build for production
npm run build

# Serve with a simple server
npx serve -s build -l 3000 &
```

---

## Step 5: Verify Deployment

### 5.1 Test from Your Local Machine

```bash
# Replace with your actual EC2 IP
EC2_IP=<your-ec2-public-ip>

# Test backend health
curl http://$EC2_IP:3001/api/health

# Test frontend (in browser)
# Open: http://$EC2_IP:3000
```

### 5.2 Test User Registration

```bash
# Register a test user
curl -X POST http://$EC2_IP:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test1234!",
    "name":"Test User",
    "county":"LA County"
  }'
```

### 5.3 Access Application

**Frontend**: http://<YOUR_EC2_IP>:3000
**Backend API**: http://<YOUR_EC2_IP>:3001/api/health

---

## Step 6: Set Up Process Management (Optional but Recommended)

### 6.1 Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Stop previous processes
pkill -f "npm run dev"
pkill -f "serve"

# Start backend with PM2
cd ~/Aldeia_Chatbot_Combined/apps/backend
pm2 start npm --name "aldeia-backend" -- run dev

# Start frontend with PM2
cd ~/Aldeia_Chatbot_Combined/apps/chatbot-frontend
pm2 start npx --name "aldeia-frontend" -- serve -s build -l 3000

# Save PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
# Run the command it outputs

# View status
pm2 status

# View logs
pm2 logs aldeia-backend
pm2 logs aldeia-frontend
```

---

## Maintenance Commands

### View Logs
```bash
# Backend logs
pm2 logs aldeia-backend

# Frontend logs
pm2 logs aldeia-frontend

# Docker logs
docker compose -f docker-compose.dev.yml logs -f
```

### Restart Services
```bash
# Restart backend
pm2 restart aldeia-backend

# Restart frontend
pm2 restart aldeia-frontend

# Restart Docker services
docker compose -f docker-compose.dev.yml restart
```

### Update Application
```bash
# Pull latest code
cd ~/Aldeia_Chatbot_Combined
git pull origin main

# Rebuild and restart
cd apps/backend
npm install
pm2 restart aldeia-backend

cd ../chatbot-frontend
npm install
npm run build
pm2 restart aldeia-frontend
```

### Stop Everything
```bash
# Stop PM2 processes
pm2 stop all

# Stop Docker containers
docker compose -f docker-compose.dev.yml down
```

---

## Monitoring

### Check Resource Usage
```bash
# System resources
htop  # Install with: sudo apt-get install htop

# Docker stats
docker stats

# PM2 monitoring
pm2 monit

# Disk usage
df -h
```

### View Application Status
```bash
# PM2 processes
pm2 status

# Docker containers
docker compose -f docker-compose.dev.yml ps

# Backend health
curl http://localhost:3001/api/health
```

---

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
pm2 logs aldeia-backend

# Check if port is in use
sudo lsof -i :3001

# Restart backend
pm2 restart aldeia-backend
```

### Frontend Not Loading
```bash
# Check logs
pm2 logs aldeia-frontend

# Check if port is in use
sudo lsof -i :3000

# Rebuild frontend
cd ~/Aldeia_Chatbot_Combined/apps/chatbot-frontend
npm run build
pm2 restart aldeia-frontend
```

### ChromaDB Issues
```bash
# Check ChromaDB is running
docker ps | grep chromadb

# Check logs
docker logs aldeia-chromadb-dev

# Restart ChromaDB
docker compose -f docker-compose.dev.yml restart chromadb
```

### Out of Memory
```bash
# Check memory usage
free -h

# Consider upgrading to t3.large instance
# Or add swap space:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Cost Optimization

### Current Monthly Costs
- EC2 t3.medium (730 hrs): ~$30
- EBS 30GB gp3: ~$2.40
- Data transfer: ~$1-5
- **Total: ~$35-40/month**

### Cost Saving Tips
1. **Stop instance when not in use**: `aws ec2 stop-instances --instance-ids <instance-id>`
2. **Use t3.small for testing**: ~$15/month (may be slower)
3. **Delete unused snapshots**: `aws ec2 describe-snapshots --owner-ids self`
4. **Use Reserved Instances for production**: Save up to 72%

---

## Security Improvements (Next Steps)

### 1. Set Up HTTPS with Let's Encrypt
```bash
# Install Certbot
sudo snap install --classic certbot

# Get certificate (requires domain name)
sudo certbot certonly --standalone -d your-domain.com
```

### 2. Configure Firewall
```bash
# Install UFW
sudo apt-get install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 3. Set Up Automated Backups
```bash
# Create backup script
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/app-$(date +%Y%m%d).tar.gz ~/Aldeia_Chatbot_Combined
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup.sh") | crontab -
```

---

## Cleanup (When Done Testing)

```bash
# Terminate EC2 instance
aws ec2 terminate-instances \
  --instance-ids <instance-id> \
  --region us-east-2

# Delete security group
aws ec2 delete-security-group \
  --group-id $SG_ID \
  --region us-east-2

# Delete key pair
aws ec2 delete-key-pair \
  --key-name aldeia-staging \
  --region us-east-2

rm ~/.ssh/aldeia-staging.pem
```

---

## Next Steps

1. **Get Custom Domain**: Register domain and set up DNS
2. **Enable HTTPS**: Use Let's Encrypt for SSL certificates
3. **Set Up CI/CD**: Automate deployments with GitHub Actions
4. **Enable Monitoring**: Set up CloudWatch alarms
5. **Production Deployment**: Use Terraform for full infrastructure

---

**Deployment Complete!** 🎉

Your application should now be accessible at:
- Frontend: `http://<EC2_IP>:3000`
- Backend API: `http://<EC2_IP>:3001/api/health`
