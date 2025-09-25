variable "instance_type_override" {
  description = "Override instance type for all instances"
  type        = string
}

variable "key_name" {
  description = "EC2 Key Pair name for SSH access"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed for SSH access"
  type        = string
  default     = "10.0.0.0/8"
}

variable "bucket_prefix" {
  description = "Prefix for S3 bucket names"
  type        = string
  default     = "optimisely"
}

variable "enable_versioning" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = true
}

variable "web-app-mysql_db_name" {
  description = "Database name for web-app-mysql"
  type        = string
  default     = "web-app-mysql"
}

variable "web-app-mysql_username" {
  description = "Database username for web-app-mysql"
  type        = string
  default     = "admin"
}

variable "web-app-mysql_password" {
  description = "Database password for web-app-mysql"
  type        = string
}

variable "db_prefix" {
  description = "Prefix for database identifiers"
  type        = string
  default     = "optimisely"
}

variable "mysql_version" {
  description = "MySQL engine version"
  type        = string
  default     = "8.0"
}

variable "postgres_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Daily backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Weekly maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "final_snapshot_enabled" {
  description = "Enable final snapshot on deletion"
  type        = bool
  default     = true
}

variable "database_subnet_ids" {
  description = "List of subnet IDs for database"
  type        = list(string)
}

variable "web-app-vpc_cidr" {
  description = "CIDR block for web-app-vpc VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "image-resizer_handler" {
  description = "Handler for image-resizer function"
  type        = string
  default     = "index.handler"
}

variable "image-resizer_runtime" {
  description = "Runtime for image-resizer function"
  type        = string
  default     = "nodejs18.x"
}

variable "image-resizer_timeout" {
  description = "Timeout for image-resizer function"
  type        = number
  default     = 30
}

variable "image-resizer_memory" {
  description = "Memory for image-resizer function"
  type        = number
  default     = 128
}

variable "function_prefix" {
  description = "Prefix for Lambda function names"
  type        = string
  default     = "optimisely"
}
