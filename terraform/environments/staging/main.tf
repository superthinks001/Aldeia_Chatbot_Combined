# Staging Environment - Main Terraform Configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Configure S3 backend for remote state
  # backend "s3" {
  #   bucket         = "aldeia-terraform-state"
  #   key            = "staging/networking/terraform.tfstate"
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
  single_nat_gateway   = var.single_nat_gateway

  enable_flow_logs = false # Disabled for staging to save costs

  tags = {
    Environment = var.environment
    Tier        = "Networking"
  }
}

# Security Groups Module
module "security_groups" {
  source = "../../modules/security-groups"

  name_prefix               = "${var.project_name}-${var.environment}"
  vpc_id                    = module.vpc.vpc_id
  enable_ssh_access         = false
  bastion_security_group_id = ""
  frontend_port             = 3000 # EC2 host-published port, see module.alb frontend_port note above

  tags = {
    Environment = var.environment
    Tier        = "Security"
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
  target_type           = "instance" # single EC2 host, not ECS/Fargate
  frontend_port         = 3000       # host port docker-compose.staging.yml publishes (maps to container 3002)

  enable_deletion_protection = false # Disabled for staging
  enable_access_logs         = false # Disabled for staging to save costs

  tags = {
    Environment = var.environment
    Tier        = "LoadBalancer"
  }
}

# EC2 Module - single Docker host running backend, frontend, Redis, ChromaDB
module "ec2" {
  source = "../../modules/ec2"

  name_prefix       = "${var.project_name}-${var.environment}"
  subnet_id         = module.vpc.public_subnet_ids[0]
  security_group_id = module.security_groups.app_security_group_id
  instance_type     = var.instance_type
  root_volume_size  = var.root_volume_size
  key_name          = var.key_name

  backend_target_group_arn  = module.alb.backend_target_group_arn
  frontend_target_group_arn = module.alb.frontend_target_group_arn

  tags = {
    Environment = var.environment
    Tier        = "Application"
  }
}
