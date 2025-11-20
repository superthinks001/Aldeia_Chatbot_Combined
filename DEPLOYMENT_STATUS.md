# AWS Deployment Status

## ✅ Completed Steps

### 1. AWS Infrastructure Created
- **EC2 Instance**: `i-0b93a84b308dfec21`
- **Public IP**: `18.217.67.150`
- **Instance Type**: t3.medium (2 vCPUs, 4 GB RAM)
- **Storage**: 30 GB GP3 SSD
- **Region**: us-east-2 (Ohio)

### 2. Security Configuration
- **Security Group**: `sg-0c8e7393b1cd59803`
- **Allowed Ports**:
  - SSH (22) - for server access
  - HTTP (80) - for web traffic
  - HTTPS (443) - for secure web traffic
  - 3000 - Frontend application
  - 3001 - Backend API

### 3. SSH Access
- **Key Pair**: aldeia-staging
- **Key Location**: `~/.ssh/aldeia-staging.pem`
- **SSH Command**:
  ```bash
  ssh -i ~/.ssh/aldeia-staging.pem ubuntu@18.217.67.150
  ```

---

## 📋 Next Steps (To Complete Deployment)

### Step 1: SSH into EC2 Instance

Wait 1-2 minutes for SSH to be ready, then connect:

```bash
ssh -i ~/.ssh/aldeia-staging.pem ubuntu@18.217.67.150
```

**Note**: If you get "Connection refused", wait another minute and try again.

### Step 2: Run Setup Script

Once connected to the EC2 instance:

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/superthinks001/Aldeia_Chatbot_Combined/main/setup-ec2-server.sh
chmod +x setup-ec2-server.sh
./setup-ec2-server.sh
```

**OR upload the local script**:

From your local machine (in a new terminal):
```bash
scp -i ~/.ssh/aldeia-staging.pem setup-ec2-server.sh ubuntu@18.217.67.150:~/
```

Then on EC2:
```bash
chmod +x setup-ec2-server.sh
./setup-ec2-server.sh
```

This will install:
- Docker and Docker Compose
- Node.js 18.x
- PM2 process manager
- Clone your repository
- All system dependencies

### Step 3: Log Out and Back In

After the setup script completes:

```bash
exit
ssh -i ~/.ssh/aldeia-staging.pem ubuntu@18.217.67.150
```

This is necessary for Docker group permissions to take effect.

### Step 4: Configure Environment Variables

#### Backend Environment

```bash
cd ~/Aldeia_Chatbot_Combined/apps/backend
nano .env
```

**Required Variables** (replace with your actual values):

```bash
# === SERVER ===
NODE_ENV=staging
PORT=3001
FRONTEND_URL=http://18.217.67.150:3000

# === DATABASE (Supabase) ===
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# === AUTHENTICATION (Generate with: openssl rand -base64 64) ===
JWT_SECRET=YOUR_GENERATED_64_CHAR_SECRET
JWT_REFRESH_SECRET=YOUR_GENERATED_DIFFERENT_64_CHAR_SECRET
SESSION_SECRET=YOUR_GENERATED_32_CHAR_SECRET

# === REDIS (Local Docker) ===
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=

# === CHROMADB (Local Docker) ===
CHROMA_HOST=chromadb
CHROMA_PORT=8000

# === STRIPE ===
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET

# === GOOGLE TRANSLATE ===
GOOGLE_TRANSLATE_API_KEY=YOUR_GOOGLE_API_KEY

# === ANTHROPIC ===
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY

# === CORS ===
CORS_ORIGIN=http://18.217.67.150:3000
```

**Generate secrets** on EC2:
```bash
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 64  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For SESSION_SECRET
```

#### Frontend Environment

```bash
cd ~/Aldeia_Chatbot_Combined/apps/chatbot-frontend
nano .env
```

```bash
REACT_APP_API_URL=http://18.217.67.150:3001
REACT_APP_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY
```

### Step 5: Start Docker Services

```bash
cd ~/Aldeia_Chatbot_Combined
docker compose -f docker-compose.dev.yml up -d

# Verify services are running
docker compose -f docker-compose.dev.yml ps
```

Expected output:
```
NAME                    STATUS
aldeia-redis-dev        Up (healthy)
aldeia-chromadb-dev     Up (healthy)
```

### Step 6: Ingest Documents into ChromaDB

```bash
cd ~/Aldeia_Chatbot_Combined/apps/backend
npm install
npm run ingest:docs
```

Wait for completion (processes 20 PDFs, creates 169 chunks).

### Step 7: Start Backend Application

```bash
cd ~/Aldeia_Chatbot_Combined/apps/backend
pm2 start npm --name "aldeia-backend" -- run dev
pm2 logs aldeia-backend  # Watch logs
```

Press `Ctrl+C` to exit logs view.

### Step 8: Build and Start Frontend

```bash
cd ~/Aldeia_Chatbot_Combined/apps/chatbot-frontend
npm install
npm run build
pm2 start npx --name "aldeia-frontend" -- serve -s build -l 3000
```

### Step 9: Save PM2 Configuration

```bash
pm2 save
pm2 startup
# Run the command it outputs (starts with sudo)
```

### Step 10: Verify Deployment

#### From EC2 Instance:

```bash
# Test backend
curl http://localhost:3001/api/health

# Test frontend
curl http://localhost:3000
```

#### From Your Local Machine:

**Test Backend**:
```bash
curl http://18.217.67.150:3001/api/health
```

**Test Frontend** (open in browser):
```
http://18.217.67.150:3000
```

**Register a Test User**:
```bash
curl -X POST http://18.217.67.150:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test1234!",
    "name":"Test User",
    "county":"LA County"
  }'
```

---

## 🎯 Application URLs

Once deployment is complete:

- **Frontend**: http://18.217.67.150:3000
- **Backend API**: http://18.217.67.150:3001/api/health
- **Backend Docs**: http://18.217.67.150:3001/api

---

## 🔧 Maintenance Commands

### View Logs
```bash
pm2 logs aldeia-backend
pm2 logs aldeia-frontend
docker compose -f docker-compose.dev.yml logs
```

### Restart Services
```bash
pm2 restart aldeia-backend
pm2 restart aldeia-frontend
docker compose -f docker-compose.dev.yml restart
```

### Update Application
```bash
cd ~/Aldeia_Chatbot_Combined
git pull origin main
cd apps/backend && npm install && pm2 restart aldeia-backend
cd ../chatbot-frontend && npm install && npm run build && pm2 restart aldeia-frontend
```

### Monitor System
```bash
pm2 status
htop  # Press 'q' to exit
docker stats
```

---

## 💰 Monthly Cost Estimate

- **EC2 t3.medium**: ~$30/month
- **EBS 30GB GP3**: ~$2.40/month
- **Data Transfer**: ~$1-5/month

**Total**: ~$35-40/month

---

## 🔒 Security Notes

1. **Current Setup**: HTTP only (no HTTPS yet)
2. **Recommended Next Steps**:
   - Get a custom domain
   - Set up Let's Encrypt for HTTPS
   - Configure UFW firewall
   - Set up automated backups
   - Enable CloudWatch monitoring

---

## 🚨 Important Information

**Save these details securely:**

- EC2 Instance ID: `i-0b93a84b308dfec21`
- Public IP: `18.217.67.150`
- SSH Key Location: `~/.ssh/aldeia-staging.pem`
- Security Group: `sg-0c8e7393b1cd59803`

**When you're done testing and want to stop the instance**:
```bash
# Stop instance (saves costs, keeps data)
aws ec2 stop-instances --instance-ids i-0b93a84b308dfec21 --region us-east-2

# Start instance again
aws ec2 start-instances --instance-ids i-0b93a84b308dfec21 --region us-east-2

# Get new IP after restart
aws ec2 describe-instances --instance-ids i-0b93a84b308dfec21 --region us-east-2 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

**To completely remove everything**:
```bash
# Terminate instance (permanent!)
aws ec2 terminate-instances --instance-ids i-0b93a84b308dfec21 --region us-east-2

# Delete security group
aws ec2 delete-security-group --group-id sg-0c8e7393b1cd59803 --region us-east-2

# Delete key pair
aws ec2 delete-key-pair --key-name aldeia-staging --region us-east-2
rm ~/.ssh/aldeia-staging.pem
```

---

## 📞 Need Help?

Refer to `AWS_EC2_DEPLOYMENT.md` for detailed troubleshooting and additional configuration options.

**Deployment Date**: 2025-11-19
