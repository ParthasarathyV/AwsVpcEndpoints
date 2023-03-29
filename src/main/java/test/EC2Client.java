package test;

import java.util.List;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.ec2.AmazonEC2;
import com.amazonaws.services.ec2.AmazonEC2ClientBuilder;
import com.amazonaws.services.ec2.model.CreateVpcEndpointRequest;
import com.amazonaws.services.ec2.model.CreateVpcEndpointResult;
import com.amazonaws.services.ec2.model.DescribeVpcEndpointsRequest;
public class EC2Client {
	private static EC2Client instance = new EC2Client();
	
	private static BasicAWSCredentials myCredentials = new BasicAWSCredentials("AKIA5AFUZIPTK7QVSZ2E", "ZwZBotwHFzNcPKaigJicr8yZ8LBf5vwp4wz+cEKv");
	private static AmazonEC2 ec2 = AmazonEC2ClientBuilder.standard().withRegion(Regions.US_EAST_1).withCredentials(new AWSStaticCredentialsProvider(myCredentials)).build();
  
	private EC2Client() {
		
	}

	public static EC2Client getInstance() {
		return instance;
	}
	
	public String createVPCEndpoints(String serviceName, String VpcId, List<String> subnetIds) {
		CreateVpcEndpointRequest req = new CreateVpcEndpointRequest();
	    req.setServiceName(serviceName);
	    req.setVpcId(VpcId);
	    req.setVpcEndpointType("Interface");
	    req.setSubnetIds(subnetIds);
	    CreateVpcEndpointResult result = ec2.createVpcEndpoint(req);
	    return result.getVpcEndpoint().getVpcEndpointId();
//	    System.out.println("The VPC Enpoint Created and the Endpoint Id = " + result.getVpcEndpoint().getVpcEndpointId());
	    
	}
	
	public void getVPCEndpoints() {
		DescribeVpcEndpointsRequest req = new DescribeVpcEndpointsRequest();
//	    ec2.describeVpcEndpoints(null)
	}
	

}
