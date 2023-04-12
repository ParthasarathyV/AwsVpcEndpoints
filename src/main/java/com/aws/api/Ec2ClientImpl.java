package com.aws.api;

import java.util.ArrayList;
import java.util.List;

import com.amazonaws.AmazonServiceException;
import com.amazonaws.SdkClientException;
import com.amazonaws.auth.AWSCredentialsProvider;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.auth.BasicSessionCredentials;
import com.amazonaws.auth.profile.ProfileCredentialsProvider;
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
import com.amazonaws.services.securitytoken.AWSSecurityTokenService;
import com.amazonaws.services.securitytoken.AWSSecurityTokenServiceClientBuilder;
import com.amazonaws.services.securitytoken.model.AssumeRoleRequest;
import com.amazonaws.services.securitytoken.model.AssumeRoleResult;
import com.amazonaws.services.securitytoken.model.Credentials;

public class Ec2ClientImpl implements EC2Client {

	private static AmazonEC2 ec2;

	public Ec2ClientImpl() {
		// TODO Auto-generated constructor stub
		String clientRegion = "us-east-1";
		String roleARN = "arn:aws:iam::893732340710:role/example-role";
		String roleSessionName = "Session1";
		ec2 = assumeEc2Role(clientRegion, roleARN, roleSessionName);

	}

	private static AmazonEC2 assumeEc2Role(String clientRegion, String roleARN, String roleSessionName)
			throws AmazonServiceException, SdkClientException {
		// Creating the STS client is part of your trusted code. It has
		// the security credentials you use to obtain temporary security credentials.
		AWSSecurityTokenService stsClient = AWSSecurityTokenServiceClientBuilder.standard()
				.withCredentials(new ProfileCredentialsProvider()).withRegion(clientRegion).build();

		// Obtain credentials for the IAM role. Note that you cannot assume the role of
		// an AWS root account;
		// Amazon EC2 will deny access. You must use credentials for an IAM user or an
		// IAM role.
		AssumeRoleRequest roleRequest = new AssumeRoleRequest().withRoleArn(roleARN)
				.withRoleSessionName(roleSessionName);
		AssumeRoleResult roleResponse = stsClient.assumeRole(roleRequest);
		Credentials sessionCredentials = roleResponse.getCredentials();

		// Create a BasicSessionCredentials object that contains the credentials you
		// just retrieved.
		BasicSessionCredentials awsCredentials = new BasicSessionCredentials(sessionCredentials.getAccessKeyId(),
				sessionCredentials.getSecretAccessKey(), sessionCredentials.getSessionToken());
		AmazonEC2 ec2 = AmazonEC2ClientBuilder.standard()
				.withCredentials(new AWSStaticCredentialsProvider(awsCredentials)).withRegion(clientRegion).build();
		return ec2;

	}

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

		if (deleteVpcEndpoints(endpoints).size() == 0) {
			System.out.println("Successfully Deleted VpcEndpoint" + vpcEndpointId);
		} else {
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
