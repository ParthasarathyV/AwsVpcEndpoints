Native Support: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc_endpoint
filter - (Optional) Custom filter block as described below.
id - (Optional) ID of the specific VPC Endpoint to retrieve.
service_name - (Optional) Service name of the specific VPC Endpoint to retrieve. For AWS services the service name is usually in the form com.amazonaws.<region>.<service> (the SageMaker Notebook service is an exception to this rule, the service name is in the form aws.sagemaker.<region>.notebook).
state - (Optional) State of the specific VPC Endpoint to retrieve.
tags - (Optional) Map of tags, each pair of which must exactly match a pair on the specific VPC Endpoint to retrieve.
vpc_id - (Optional) ID of the VPC in which the specific VPC Endpoint is used.

Filter Support from AWS: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeVpcEndpoints.html
ip-address-type - The IP address type (ipv4 | ipv6).
service-name - The name of the service.
tag:<key> - The key/value combination of a tag assigned to the resource. Use the tag key in the filter name and the tag value as the filter value. For example, to find all resources that have a tag with the key Owner and the value TeamA, specify tag:Owner for the filter name and TeamA for the filter value.
tag-key - The key of a tag assigned to the resource. Use this filter to find all resources assigned a tag with a specific key, regardless of the tag value.
vpc-id - The ID of the VPC in which the endpoint resides.
vpc-endpoint-id - The ID of the endpoint.
vpc-endpoint-state - The state of the endpoint (pendingAcceptance | pending | available | deleting | deleted | rejected | failed).
vpc-endpoint-type - The type of VPC endpoint (Interface | Gateway | GatewayLoadBalancer).