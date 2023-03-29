package com.aws.api;

import java.util.ArrayList;
import java.util.List;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.ec2.AmazonEC2;
import com.amazonaws.services.ec2.AmazonEC2ClientBuilder;
import com.amazonaws.services.ec2.model.CreateVpcEndpointRequest;
import com.amazonaws.services.ec2.model.CreateVpcEndpointResult;
import com.amazonaws.services.ec2.model.DeleteVpcEndpointsRequest;
import com.amazonaws.services.ec2.model.DeleteVpcEndpointsResult;
import com.amazonaws.services.ec2.model.DescribeVpcEndpointsRequest;
import com.amazonaws.services.ec2.model.DescribeVpcEndpointsResult;
import com.amazonaws.services.ec2.model.UnsuccessfulItem;
import com.amazonaws.services.ec2.model.VpcEndpoint;

public class Ec2ClientImpl implements EC2Client {

	private static BasicAWSCredentials myCredentials = new BasicAWSCredentials("",
			"");
	private static AmazonEC2 ec2 = AmazonEC2ClientBuilder.standard().withRegion(Regions.US_EAST_1)
			.withCredentials(new AWSStaticCredentialsProvider(myCredentials)).build();


	@Override
	public String createVPCEndpoint(String serviceName, String VpcId, List<String> subnetIds) {
		// TODO Auto-generated method stub
		CreateVpcEndpointRequest req = new CreateVpcEndpointRequest();
		req.setServiceName(serviceName);
		req.setVpcId(VpcId);
		req.setVpcEndpointType("Interface");
		req.setSubnetIds(subnetIds);
		CreateVpcEndpointResult result = ec2.createVpcEndpoint(req);
		return result.getVpcEndpoint().getVpcEndpointId();
	}

	@Override
	public VpcEndpoint getVpcEndpoint(String vpcEndpointId) {
		// TODO Auto-generated method stub
		VpcEndpoint vpcEndpoint;
		List<String> endpoints = new ArrayList<String>();
		endpoints.add(vpcEndpointId);
		List<VpcEndpoint> endpointsList = listVpcEndpoint(endpoints);
		vpcEndpoint = endpointsList.size() > 0 ? endpointsList.get(0) : null;
		return vpcEndpoint;
	}

	@Override
	public List<VpcEndpoint> listVpcEndpoint(List<String> endpointIds) {
		// TODO Auto-generated method stub
		DescribeVpcEndpointsResult res;
		if (endpointIds.size() > 0) {
			DescribeVpcEndpointsRequest req = new DescribeVpcEndpointsRequest();
			req.setVpcEndpointIds(endpointIds);
			res = ec2.describeVpcEndpoints(req);
		} else {
			res = ec2.describeVpcEndpoints();
		}

		return res.getVpcEndpoints();
	}

	@Override
	public void deleteVpcEndpoint(String vpcEndpointId) {
		// TODO Auto-generated method stub
		List<String> endpoints = new ArrayList<String>();
		endpoints.add(vpcEndpointId);
		
		if(deleteVpcEndpoints(endpoints).size()==0) {
			System.out.println("Successfully Deleted VpcEndpoint" + vpcEndpointId);
		}
		else {
			System.out.println("Failed to delete VpcEndpoint" + vpcEndpointId);
		}
	}

	@Override
	public List<UnsuccessfulItem> deleteVpcEndpoints(List<String> endpointIds) {
		// TODO Auto-generated method stub
		DeleteVpcEndpointsRequest req = new DeleteVpcEndpointsRequest();
		req.setVpcEndpointIds(endpointIds);
		DeleteVpcEndpointsResult res = ec2.deleteVpcEndpoints(req);
		return res.getUnsuccessful();
	}
}
