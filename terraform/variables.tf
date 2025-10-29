variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name to be used for resource naming"
  type        = string
  default     = "cloudmesh"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_type" {
  description = "EC2 instance type for worker"
  type        = string
  default     = "t3.medium"
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 30
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH into the worker"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict this in production!
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
}

variable "worker_keypair_json" {
  description = "Solana worker keypair in JSON format"
  type        = string
  sensitive   = true
}

variable "pinata_jwt" {
  description = "Pinata JWT token for IPFS"
  type        = string
  sensitive   = true
}

variable "solana_rpc_url" {
  description = "Solana RPC URL"
  type        = string
  default     = "https://api.mainnet-beta.solana.com"
}

variable "program_id" {
  description = "CloudMesh program ID"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "enable_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "auto_scaling_enabled" {
  description = "Enable auto-scaling for workers"
  type        = bool
  default     = false
}

variable "min_workers" {
  description = "Minimum number of worker instances (if auto-scaling enabled)"
  type        = number
  default     = 1
}

variable "max_workers" {
  description = "Maximum number of worker instances (if auto-scaling enabled)"
  type        = number
  default     = 3
}
