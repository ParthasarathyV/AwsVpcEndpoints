import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityRequest;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityResponse;

public class GetCallerIdentityExample {
    public static void main(String[] args) {
        // Set up the AWS STS client
        StsClient stsClient = StsClient.builder()
                .region(Region.US_EAST_1) // Replace with your desired region
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();

        // Create the request to get the caller identity
        GetCallerIdentityRequest request = GetCallerIdentityRequest.builder().build();

        // Call the STS service to get the caller identity
        GetCallerIdentityResponse response = stsClient.getCallerIdentity(request);

        // Extract and print the caller identity details
        System.out.println("Account ID: " + response.account());
        System.out.println("User ID: " + response.userId());
        System.out.println("ARN: " + response.arn());
    }
}
