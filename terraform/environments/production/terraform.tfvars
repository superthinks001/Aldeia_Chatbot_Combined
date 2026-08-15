# Production Environment - Terraform Variables
# This file contains the actual values for the production environment

# Basic Configuration
aws_region   = "us-east-2" # Ohio
environment  = "production"
project_name = "aldeia"
owner        = "DevOps Team"

# VPC Configuration
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["us-east-2a", "us-east-2b"]

# Public Subnets (for ALB and NAT Gateway)
public_subnet_cidrs = [
  "10.1.1.0/24", # us-east-2a
  "10.1.2.0/24"  # us-east-2b
]

# Private Application Subnets (for ECS/EC2)
private_app_subnet_cidrs = [
  "10.1.10.0/24", # us-east-2a
  "10.1.11.0/24"  # us-east-2b
]

# Private Database Subnets (for RDS and ElastiCache)
private_db_subnet_cidrs = [
  "10.1.20.0/24", # us-east-2a
  "10.1.21.0/24"  # us-east-2b
]

# VPC Features
enable_dns_hostnames = true
enable_dns_support   = true
enable_nat_gateway   = true
single_nat_gateway   = false # High Availability: dual NAT for production

# VPC Flow Logs
enable_flow_logs = false
# Set to true after creating CloudWatch log group:
# aws logs create-log-group --log-group-name /aws/vpc/aldeia-production-flowlogs

# ALB Configuration
acm_certificate_arn = ""
# Update this after requesting certificate from ACM:
# Example: "arn:aws:acm:us-east-2:123456789:certificate/xxxxx"

enable_alb_deletion_protection = true
enable_alb_access_logs         = false
alb_access_logs_bucket         = ""
# Set to true and provide bucket name after creating S3 bucket for logs:
# Example: "aldeia-prod-alb-logs"
