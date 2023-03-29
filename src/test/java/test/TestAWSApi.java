package test;

import java.util.ArrayList;
import java.util.List;

import org.joda.time.LocalTime;



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
    EC2Client.getInstance().createVPCEndpoints("com.amazonaws.vpce.us-east-1.vpce-svc-0a2f07c9944d54ec2", "vpc-0203ed32a98933ac8", subnetIds);
  }
}
