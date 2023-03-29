package com.aws.api;

import java.util.List;

import com.amazonaws.services.ec2.model.UnsuccessfulItem;
import com.amazonaws.services.ec2.model.VpcEndpoint;
public interface EC2Client {
	
 String createVPCEndpoint(String serviceName, String VpcId, List<String> subnetIds);
 VpcEndpoint getVpcEndpoint (String vpcEndpointId);
 List<VpcEndpoint> listVpcEndpoint(List<String> endpointIds);
 void deleteVpcEndpoint (String vpcEndpointId);
 List<UnsuccessfulItem> deleteVpcEndpoints(List<String> endpointIds);

}
