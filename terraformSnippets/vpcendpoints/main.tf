provider "aws" {
  region     = "us-east-2" # Specify your region
  access_key = ""
  secret_key = ""
}

data "aws_vpc_endpoint" "s3_endpoint" {
  service_name = format("com.amazonaws.%s.s3", var.aws_region)
  # private_dns_enabled = true
  #   filter {
  #   name   = "private-dns-enabled"
  #   values = [false]
  # }
  id="vpce-048554d664e43300f"
}

output "s3_vpc_endpoint" {
  value = {
    id                = data.aws_vpc_endpoint.s3_endpoint.id
    vpc_id            = data.aws_vpc_endpoint.s3_endpoint.vpc_id
    service_name      = data.aws_vpc_endpoint.s3_endpoint.service_name
    vpc_endpoint_type = data.aws_vpc_endpoint.s3_endpoint.vpc_endpoint_type
  }
}


