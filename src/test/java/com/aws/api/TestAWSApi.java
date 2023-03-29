package com.aws.api;

import java.util.ArrayList;
import java.util.List;

import org.joda.time.LocalTime;

import com.amazonaws.services.ec2.model.VpcEndpoint;



public class TestAWSApi {
  public static void main(String[] args) {
    LocalTime currentTime = new LocalTime();
    System.out.println("The current local time is: " + currentTime);
    
    /*
     * aws ec2 create-vpc-endpoint --vpc-id your-application-vpc-id --region us-east-1 
     * --service-name com.amazonaws.vpce.us-east-1.vpce-svc-0a2f07c9944d54ec2 --vpc-endpoint-type Interface 
     * --subnet-ids your-application-subnet-ids
     * AKIA5AFUZIPTK7QVSZ2E	ZwZBotwHFzNcPKaigJicr8yZ8LBf5vwp4wz+cEKv
     */
    
    List<String> subnetIds = new ArrayList<String>();
    subnetIds.add("subnet-0a9da473b73b80600");
    subnetIds.add("subnet-028311e21c2ddd0cc");
    subnetIds.add("subnet-0435cbd93aa7c1349");
    EC2Client ec2 = new Ec2ClientImpl();
    
//    Creating VPC endpoint
    System.out.println("Creating new VPC endpoint");
    String vpcEndpointId = ec2.createVPCEndpoint("com.amazonaws.vpce.us-east-1.vpce-svc-0a2f07c9944d54ec2", "vpc-0203ed32a98933ac8", subnetIds);
    System.out.println("The VPC Endpoint Created is:" + vpcEndpointId);
    
//    Read the VPC Endpoint that is created
    System.out.println("Reading the Endpoint that got created..");
    VpcEndpoint endpointDetails = ec2.getVpcEndpoint(vpcEndpointId);
    System.out.println(endpointDetails.getServiceName());
    System.out.println(endpointDetails.getIpAddressType());
    System.out.println(endpointDetails.getState());
    
    ec2.deleteVpcEndpoint(vpcEndpointId);
  }
}
	