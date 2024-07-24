variable "aws_region" {
  description = "The AWS region to create resources in"
  type        = string
  default     = "us-east-2"
}

variable "vpc_id" {
  description = "The ID of the VPC where the endpoint is created"
  type        = string
  default     = "vpc-0a392bb24ce9572c6"
}