# Production Environment - Outputs

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_app_subnet_ids" {
  description = "IDs of private application subnets"
  value       = module.vpc.private_app_subnet_ids
}

output "private_db_subnet_ids" {
  description = "IDs of private database subnets"
  value       = module.vpc.private_db_subnet_ids
}

output "nat_gateway_ids" {
  description = "IDs of NAT Gateways"
  value       = module.vpc.nat_gateway_ids
}

output "nat_gateway_public_ips" {
  description = "Public IPs of NAT Gateways"
  value       = module.vpc.nat_gateway_public_ips
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of ALB security group"
  value       = module.security_groups.alb_security_group_id
}

output "app_security_group_id" {
  description = "ID of application security group"
  value       = module.security_groups.app_security_group_id
}

output "db_security_group_id" {
  description = "ID of database security group"
  value       = module.security_groups.db_security_group_id
}

output "redis_security_group_id" {
  description = "ID of Redis security group"
  value       = module.security_groups.redis_security_group_id
}

# ALB Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.alb.alb_arn
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer (for Route 53)"
  value       = module.alb.alb_zone_id
}

output "backend_target_group_arn" {
  description = "ARN of backend target group"
  value       = module.alb.backend_target_group_arn
}

output "frontend_target_group_arn" {
  description = "ARN of frontend target group"
  value       = module.alb.frontend_target_group_arn
}

# Summary Output
output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    environment       = var.environment
    region            = var.aws_region
    vpc_id            = module.vpc.vpc_id
    vpc_cidr          = module.vpc.vpc_cidr
    alb_dns_name      = module.alb.alb_dns_name
    nat_gateways      = length(module.vpc.nat_gateway_ids)
    public_subnets    = length(module.vpc.public_subnet_ids)
    private_subnets   = length(module.vpc.private_app_subnet_ids) + length(module.vpc.private_db_subnet_ids)
    high_availability = !var.single_nat_gateway
  }
}

# Route 53 Configuration Helper
output "route53_alias_config" {
  description = "Configuration for Route 53 alias records"
  value = {
    alb_dns_name = module.alb.alb_dns_name
    alb_zone_id  = module.alb.alb_zone_id
    example_records = {
      api_record  = "api.aldeia.com → ALIAS → ${module.alb.alb_dns_name}"
      chat_record = "chat.aldeia.com → ALIAS → ${module.alb.alb_dns_name}"
    }
  }
}
