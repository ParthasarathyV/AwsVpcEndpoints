import com.amazonaws.auth.STSAssumeRoleWithSAMLSessionCredentialsProvider;
import com.amazonaws.auth.profile.ProfileCredentialsProvider;
import com.amazonaws.regions.Region;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.securitytoken.model.AssumeRoleWithSAMLRequest;
import com.amazonaws.services.securitytoken.model.AssumeRoleWithSAMLResult;
import com.amazonaws.services.securitytoken.model.Credentials;

public class GetCallerIdentityWithSAMLExample {
    public static void main(String[] args) {
        // Replace with your SAML assertion and role ARN
        String samlAssertion = "<your_SAML_assertion>";
        String roleArn = "<your_role_ARN>";

        // Set up the AWS STS client using the SAML credentials provider
        STSAssumeRoleWithSAMLSessionCredentialsProvider credentialsProvider =
                new STSAssumeRoleWithSAMLSessionCredentialsProvider.Builder(roleArn, samlAssertion)
                        .build();

        // Create the STS client with the custom credentials provider
        AWSStaticCredentialsProvider staticCredentialsProvider =
                new AWSStaticCredentialsProvider(credentialsProvider);

        AWSSTSClient stsClient = AWSSTSClientBuilder.standard()
                .withRegion(Regions.US_EAST_1) // Replace with your desired region
                .withCredentials(staticCredentialsProvider)
                .build();

        // Create the request to get the caller identity
        GetCallerIdentityRequest request = new GetCallerIdentityRequest();

        // Call the STS service to get the caller identity
        GetCallerIdentityResult response = stsClient.getCallerIdentity(request);

        // Extract and print the caller identity details
        System.out.println("Account ID: " + response.getAccount());
        System.out.println("User ID: " + response.getUserId());
        System.out.println("ARN: " + response.getArn());
    }
}
