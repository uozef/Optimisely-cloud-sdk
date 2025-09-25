output "web-server-prod_id" {
  description = "ID of the web-server-prod EC2 instance"
  value       = aws_instance.web-server-prod.id
}

output "web-server-prod_public_ip" {
  description = "Public IP address of the web-server-prod EC2 instance"
  value       = aws_instance.web-server-prod.public_ip
}

output "web-server-prod_private_ip" {
  description = "Private IP address of the web-server-prod EC2 instance"
  value       = aws_instance.web-server-prod.private_ip
}

output "app-server-prod_id" {
  description = "ID of the app-server-prod EC2 instance"
  value       = aws_instance.app-server-prod.id
}

output "app-server-prod_public_ip" {
  description = "Public IP address of the app-server-prod EC2 instance"
  value       = aws_instance.app-server-prod.public_ip
}

output "app-server-prod_private_ip" {
  description = "Private IP address of the app-server-prod EC2 instance"
  value       = aws_instance.app-server-prod.private_ip
}

output "web-app-assets_id" {
  description = "ID of the web-app-assets S3 bucket"
  value       = aws_s3_bucket.web-app-assets.id
}

output "web-app-assets_arn" {
  description = "ARN of the web-app-assets S3 bucket"
  value       = aws_s3_bucket.web-app-assets.arn
}

output "web-app-backups_id" {
  description = "ID of the web-app-backups S3 bucket"
  value       = aws_s3_bucket.web-app-backups.id
}

output "web-app-backups_arn" {
  description = "ARN of the web-app-backups S3 bucket"
  value       = aws_s3_bucket.web-app-backups.arn
}

output "web-app-mysql_endpoint" {
  description = "Database endpoint for web-app-mysql"
  value       = aws_db_instance.web-app-mysql.endpoint
}

output "web-app-mysql_port" {
  description = "Database port for web-app-mysql"
  value       = aws_db_instance.web-app-mysql.port
}

output "web-app-vpc_id" {
  description = "ID of the web-app-vpc VPC"
  value       = aws_vpc.web-app-vpc.id
}

output "image-resizer_arn" {
  description = "ARN of the image-resizer Lambda function"
  value       = aws_lambda_function.image-resizer.arn
}

output "image-resizer_name" {
  description = "Name of the image-resizer Lambda function"
  value       = aws_lambda_function.image-resizer.function_name
}
