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

### Step 2: Copy setup scripts 

** Upload the local script**:

From your local machine (in a new terminal), - assuming you are at Aldeia's root folder
```bash
scp -i ~/.ssh/aldeia-staging.pem ./scripts/setup/setup-ec2-server.sh ubuntu@18.217.67.150:~/
scp -i ~/.ssh/aldeia-staging.pem ./scripts/deployment/deploy-chromadb.sh ubuntu@18.217.67.150:~/
scp -i ~/.ssh/aldeia-staging.pem ./scripts/deployment/deploy-redis.sh ubuntu@18.217.67.150:~/
```

Then on EC2:
```bash
chmod +x setup-ec2-server.sh
chmod +x deploy-chromadb.sh
chmod +x deploy-redis.sh
```

### Step 3: Run the EC2 setup scripts 

Still on EC2:
```bash
./setup-ec2-server.sh
```

This will install:
- Docker and Docker Compose
- Node.js 18.x

### Step 4: Log Out and Back In

After the setup script completes:

```bash
exit
ssh -i ~/.ssh/aldeia-staging.pem ubuntu@18.217.67.150
```
This is necessary for Docker group permissions to take effect.

### Step 5: Install ChromaDB and Redis

```bash
./deploy-redis.sh start
./deploy-chromadb.sh start
```

Verify services are running

```bash
./deploy-redis.sh status
./deploy-chromadb.sh status
```

### Step 6: Ingest Documents into ChromaDB

*** Review the below - it's incorrect because the scripts and documents weren't copied ***

```bash
cd ~/Aldeia_Chatbot_Combined/apps/backend
npm install
npm run ingest:docs
```

Wait for completion (processes 20 PDFs, creates 169 chunks).

### Step 7: Verify Deployment

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

---

## 🎯 Application URLs

Once deployment is complete:

- **Frontend**: http://18.217.67.150:3000
- **Backend API**: http://18.217.67.150:3001/api/health
- **Backend Docs**: http://18.217.67.150:3001/api

---

## 🔧 Maintenance Commands

### Run the deploy scrips with the 'help' parameters to check available options such as logs, update, restart, etc.
```bash
./deploy-chromadb.sh help
./deploy-redis.sh help
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
