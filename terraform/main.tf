terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
resource "aws_vpc" "cloudmesh_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project_name}-vpc"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.cloudmesh_vpc.id

  tags = {
    Name        = "${var.project_name}-igw"
    Environment = var.environment
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.cloudmesh_vpc.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project_name}-public-subnet"
    Environment = var.environment
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.cloudmesh_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name        = "${var.project_name}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public_rta" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

# Security Group for Worker
resource "aws_security_group" "worker_sg" {
  name        = "${var.project_name}-worker-sg"
  description = "Security group for CloudMesh worker"
  vpc_id      = aws_vpc.cloudmesh_vpc.id

  # SSH access
  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  # Outbound internet access
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-worker-sg"
    Environment = var.environment
  }
}

# IAM Role for EC2 Instance
resource "aws_iam_role" "worker_role" {
  name = "${var.project_name}-worker-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-worker-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "worker_policy" {
  name = "${var.project_name}-worker-policy"
  role = aws_iam_role.worker_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.worker_keypair.arn
      }
    ]
  })
}

resource "aws_iam_instance_profile" "worker_profile" {
  name = "${var.project_name}-worker-profile"
  role = aws_iam_role.worker_role.name
}

# Secrets Manager for Worker Keypair
resource "aws_secretsmanager_secret" "worker_keypair" {
  name        = "${var.project_name}-worker-keypair-${var.environment}"
  description = "Solana worker keypair for CloudMesh"

  tags = {
    Name        = "${var.project_name}-worker-keypair"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "worker_keypair_version" {
  secret_id     = aws_secretsmanager_secret.worker_keypair.id
  secret_string = var.worker_keypair_json
}

# Secrets Manager for Pinata JWT
resource "aws_secretsmanager_secret" "pinata_jwt" {
  name        = "${var.project_name}-pinata-jwt-${var.environment}"
  description = "Pinata JWT token for IPFS uploads"

  tags = {
    Name        = "${var.project_name}-pinata-jwt"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "pinata_jwt_version" {
  secret_id     = aws_secretsmanager_secret.pinata_jwt.id
  secret_string = var.pinata_jwt
}

# EC2 Key Pair for SSH access
resource "aws_key_pair" "deployer" {
  key_name   = "${var.project_name}-deployer-key"
  public_key = var.ssh_public_key
}

# EC2 Instance for Worker
resource "aws_instance" "worker" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.worker_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.worker_profile.name
  key_name               = aws_key_pair.deployer.key_name

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    project_name         = var.project_name
    environment          = var.environment
    solana_rpc_url       = var.solana_rpc_url
    program_id           = var.program_id
    worker_keypair_secret = aws_secretsmanager_secret.worker_keypair.name
    pinata_jwt_secret    = aws_secretsmanager_secret.pinata_jwt.name
    aws_region           = var.aws_region
  })

  tags = {
    Name        = "${var.project_name}-worker"
    Environment = var.environment
    Role        = "Worker"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "worker_logs" {
  name              = "/aws/ec2/${var.project_name}-worker"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.project_name}-worker-logs"
    Environment = var.environment
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

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
