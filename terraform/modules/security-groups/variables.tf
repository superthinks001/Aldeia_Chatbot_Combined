# Security Groups Module Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "enable_ssh_access" {
  description = "Enable SSH access to application instances"
  type        = bool
  default     = false
}

variable "bastion_security_group_id" {
  description = "Security group ID of bastion host (if SSH access enabled)"
  type        = string
  default     = ""
}

variable "frontend_port" {
  description = "Host port the ALB forwards frontend traffic to (3002 for ECS/Fargate container port, 3000 for the EC2 host-published port per docker-compose.staging.yml)"
  type        = number
  default     = 3002
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
