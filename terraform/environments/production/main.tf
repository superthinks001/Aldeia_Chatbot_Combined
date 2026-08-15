# Production Environment - Main Terraform Configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Recommended: Configure S3 backend for production state
  # backend "s3" {
  #   bucket         = "aldeia-terraform-state"
  #   key            = "production/networking/terraform.tfstate"
  #   region         = "us-east-2"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      Owner       = var.owner
      CostCenter  = "Production"
    }
  }
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  name_prefix              = "${var.project_name}-${var.environment}"
  vpc_cidr                 = var.vpc_cidr
  availability_zones       = var.availability_zones
  public_subnet_cidrs      = var.public_subnet_cidrs
  private_app_subnet_cidrs = var.private_app_subnet_cidrs
  private_db_subnet_cidrs  = var.private_db_subnet_cidrs

  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support
  enable_nat_gateway   = var.enable_nat_gateway
  single_nat_gateway   = var.single_nat_gateway # False for production (HA)

  enable_flow_logs = var.enable_flow_logs

  tags = {
    Environment = var.environment
    Tier        = "Networking"
    Compliance  = "Required"
  }
}

# Security Groups Module
module "security_groups" {
  source = "../../modules/security-groups"

  name_prefix               = "${var.project_name}-${var.environment}"
  vpc_id                    = module.vpc.vpc_id
  enable_ssh_access         = false
  bastion_security_group_id = ""

  tags = {
    Environment = var.environment
    Tier        = "Security"
    Compliance  = "Required"
  }
}

# Application Load Balancer Module
module "alb" {
  source = "../../modules/alb"

  name_prefix           = "${var.project_name}-${var.environment}"
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.security_groups.alb_security_group_id
  certificate_arn       = var.acm_certificate_arn
  target_type           = "ip" # Use "instance" if deploying to EC2

  enable_deletion_protection = var.enable_alb_deletion_protection
  enable_access_logs         = var.enable_alb_access_logs
  access_logs_bucket         = var.alb_access_logs_bucket
  access_logs_prefix         = "production-alb"

  tags = {
    Environment = var.environment
    Tier        = "LoadBalancer"
    Compliance  = "Required"
  }
}
