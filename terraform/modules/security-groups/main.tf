# Security Groups Module

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-sg-alb"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-sg-alb"
    }
  )
}

# ALB Ingress Rules
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTP from internet"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTPS from internet"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

# ALB Egress Rules
resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow all outbound traffic"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# Application Security Group
resource "aws_security_group" "app" {
  name        = "${var.name_prefix}-sg-app"
  description = "Security group for application servers (ECS/EC2)"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-sg-app"
    }
  )
}

# App Ingress Rules
resource "aws_vpc_security_group_ingress_rule" "app_backend_from_alb" {
  security_group_id            = aws_security_group.app.id
  description                  = "Allow backend port from ALB"
  from_port                    = 3001
  to_port                      = 3001
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_ingress_rule" "app_frontend_from_alb" {
  security_group_id            = aws_security_group.app.id
  description                  = "Allow frontend port from ALB"
  from_port                    = var.frontend_port
  to_port                      = var.frontend_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_ingress_rule" "app_chromadb_internal" {
  security_group_id            = aws_security_group.app.id
  description                  = "Allow ChromaDB port from within app SG"
  from_port                    = 8000
  to_port                      = 8000
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id
}

# Optional: SSH access (if using EC2 with bastion)
resource "aws_vpc_security_group_ingress_rule" "app_ssh" {
  count                        = var.enable_ssh_access ? 1 : 0
  security_group_id            = aws_security_group.app.id
  description                  = "Allow SSH from bastion"
  from_port                    = 22
  to_port                      = 22
  ip_protocol                  = "tcp"
  referenced_security_group_id = var.bastion_security_group_id
}

# App Egress Rules
resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = aws_security_group.app.id
  description       = "Allow all outbound traffic"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# Database Security Group
resource "aws_security_group" "db" {
  name        = "${var.name_prefix}-sg-db"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-sg-db"
    }
  )
}

# DB Ingress Rules
resource "aws_vpc_security_group_ingress_rule" "db_postgres" {
  security_group_id            = aws_security_group.db.id
  description                  = "Allow PostgreSQL from application"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id
}

# DB Egress Rules (for Multi-AZ replication)
resource "aws_vpc_security_group_egress_rule" "db_replication" {
  security_group_id            = aws_security_group.db.id
  description                  = "Allow replication within DB security group"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.db.id
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.name_prefix}-sg-redis"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-sg-redis"
    }
  )
}

# Redis Ingress Rules
resource "aws_vpc_security_group_ingress_rule" "redis_from_app" {
  security_group_id            = aws_security_group.redis.id
  description                  = "Allow Redis from application"
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id
}

# Redis Egress Rules (for replication)
resource "aws_vpc_security_group_egress_rule" "redis_replication" {
  security_group_id            = aws_security_group.redis.id
  description                  = "Allow replication within Redis security group"
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.redis.id
}
