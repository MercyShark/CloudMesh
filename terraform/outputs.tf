output "worker_instance_id" {
  description = "EC2 instance ID of the worker"
  value       = aws_instance.worker.id
}

output "worker_public_ip" {
  description = "Public IP address of the worker"
  value       = aws_instance.worker.public_ip
}

output "worker_private_ip" {
  description = "Private IP address of the worker"
  value       = aws_instance.worker.private_ip
}

output "worker_public_dns" {
  description = "Public DNS of the worker"
  value       = aws_instance.worker.public_dns
}

output "ssh_command" {
  description = "SSH command to connect to the worker"
  value       = "ssh -i <your-private-key.pem> ubuntu@${aws_instance.worker.public_ip}"
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.cloudmesh_vpc.id
}

output "security_group_id" {
  description = "Security group ID for the worker"
  value       = aws_security_group.worker_sg.id
}

output "worker_keypair_secret_arn" {
  description = "ARN of the worker keypair secret in Secrets Manager"
  value       = aws_secretsmanager_secret.worker_keypair.arn
}

output "pinata_jwt_secret_arn" {
  description = "ARN of the Pinata JWT secret in Secrets Manager"
  value       = aws_secretsmanager_secret.pinata_jwt.arn
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.worker_logs.name
}

output "iam_role_arn" {
  description = "IAM role ARN for the worker"
  value       = aws_iam_role.worker_role.arn
}
