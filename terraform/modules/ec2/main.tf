# EC2 Module - Application Host
#
# Provisions the single Docker host that runs backend, frontend, Redis, and
# ChromaDB containers (see docker-compose.staging.yml). This mirrors what
# was actually running before the 2026-08 teardown: one instance doing
# everything, registered behind the ALB's target groups.
#
# This module only provisions the box and bootstraps Docker - it does not
# deploy the application itself. After apply, run scripts/deployment/
# deploy-redis.sh and deploy-chromadb.sh on the instance, then deploy
# backend/frontend via the existing GitHub Actions workflow
# (.github/workflows/deploy.yml, workflow_dispatch) pointed at this
# instance's public IP.

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM role for SSM Session Manager access (avoids needing a bastion host or
# open SSH ingress - see docs/aws-deployment/02-Infrastructure-Checklist.md
# "EC2-RoleForSSM")
resource "aws_iam_role" "app" {
  name = "${var.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.name_prefix}-ec2-profile"
  role = aws_iam_role.app.name
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [var.security_group_id]
  iam_instance_profile        = aws_iam_instance_profile.app.name
  key_name                    = var.key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
    encrypted   = true

    tags = merge(
      var.tags,
      { Name = "${var.name_prefix}-app-root" }
    )
  }

  user_data = <<-EOF
    #!/bin/bash
    exec > /var/log/user-data.log 2>&1
    set -x

    apt-get update
    apt-get install -y ca-certificates curl gnupg

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    usermod -aG docker ubuntu
    systemctl enable docker
    systemctl start docker

    docker network create aldeia-network || true
  EOF

  tags = merge(
    var.tags,
    { Name = "${var.name_prefix}-app" }
  )

  lifecycle {
    ignore_changes = [ami] # avoid forced replacement when Canonical publishes a newer AMI
  }
}

resource "aws_lb_target_group_attachment" "backend" {
  count            = var.backend_target_group_arn != "" ? 1 : 0
  target_group_arn = var.backend_target_group_arn
  target_id        = aws_instance.app.id
  port             = var.backend_port
}

resource "aws_lb_target_group_attachment" "frontend" {
  count            = var.frontend_target_group_arn != "" ? 1 : 0
  target_group_arn = var.frontend_target_group_arn
  target_id        = aws_instance.app.id
  port             = var.frontend_port
}
