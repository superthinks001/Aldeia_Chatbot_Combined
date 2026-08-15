# EC2 Module Outputs

output "instance_id" {
  description = "ID of the application EC2 instance"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Public IP of the application EC2 instance (use as SERVER_HOST for deploy.yml)"
  value       = aws_instance.app.public_ip
}

output "private_ip" {
  description = "Private IP of the application EC2 instance"
  value       = aws_instance.app.private_ip
}

output "iam_role_arn" {
  description = "ARN of the instance's IAM role"
  value       = aws_iam_role.app.arn
}
