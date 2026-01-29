#!/bin/bash

# Aldeia Chatbot - EC2 Server Setup Script
# This script installs and configures everything needed on the EC2 instance

set -e

echo "========================================="
echo "Aldeia Chatbot - EC2 Setup Script"
echo "========================================="
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  htop

# Install Docker
echo "🐳 Installing Docker..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Enable Docker
sudo systemctl enable docker
sudo systemctl start docker

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Set ownership
sudo chown -R ubuntu:ubuntu /home/ubuntu/Aldeia_Chatbot_Combined

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Log out and back in for Docker group changes to take effect"
echo ""
