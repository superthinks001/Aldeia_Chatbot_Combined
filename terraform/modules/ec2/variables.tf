# EC2 Module Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID to launch the instance into (public subnet, matches current SSH-deploy model)"
  type        = string
}

variable "security_group_id" {
  description = "Security group ID to attach to the instance (app security group)"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 50
}

variable "key_name" {
  description = "EC2 key pair name for SSH access (optional - SSM Session Manager works without one)"
  type        = string
  default     = null
}

variable "backend_target_group_arn" {
  description = "ARN of the ALB backend target group to register this instance with"
  type        = string
  default     = ""
}

variable "frontend_target_group_arn" {
  description = "ARN of the ALB frontend target group to register this instance with"
  type        = string
  default     = ""
}

variable "backend_port" {
  description = "Host port the backend container listens on"
  type        = number
  default     = 3001
}

variable "frontend_port" {
  description = "Host port the frontend container listens on (docker-compose.staging.yml maps this to container port 3002)"
  type        = number
  default     = 3000
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
