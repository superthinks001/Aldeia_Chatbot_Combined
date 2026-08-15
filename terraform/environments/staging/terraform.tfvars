# Staging Environment - Terraform Variables
# This file contains the actual values for the staging environment

# Basic Configuration
aws_region   = "us-east-2" # Ohio
environment  = "staging"
project_name = "aldeia"
owner        = "DevOps Team"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-2a", "us-east-2b"]

# Public Subnets (for ALB and NAT Gateway)
public_subnet_cidrs = [
  "10.0.1.0/24", # us-east-2a
  "10.0.2.0/24"  # us-east-2b
]

# Private Application Subnets (for ECS/EC2)
private_app_subnet_cidrs = [
  "10.0.10.0/24", # us-east-2a
  "10.0.11.0/24"  # us-east-2b
]

# Private Database Subnets (for RDS and ElastiCache)
private_db_subnet_cidrs = [
  "10.0.20.0/24", # us-east-2a
  "10.0.21.0/24"  # us-east-2b
]

# VPC Features
enable_dns_hostnames = true
enable_dns_support   = true
enable_nat_gateway   = true
single_nat_gateway   = true # Cost optimization: single NAT for staging

# ALB Configuration
# Leave empty if ACM certificate not ready yet
# Update this after requesting certificate from ACM
acm_certificate_arn = ""
# Example: "arn:aws:acm:us-east-2:123456789:certificate/xxxxx"

# EC2 Configuration
# Instance is placed in a public subnet (module.ec2 uses public_subnet_ids[0]),
# not the private-app subnets - this matches how staging actually ran
# (direct public IP, SSH-deployed via GitHub Actions), not the ECS/Fargate-
# behind-a-private-subnet model the rest of this doc assumes.
instance_type    = "t3.medium"
root_volume_size = 50
key_name         = null # set to an existing EC2 key pair name if you want SSH access in addition to SSM
