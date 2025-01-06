import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api") // Optional: base path for your APIs
public class CustomController {

    @PostMapping("/custom-api")
    public ResponseEntity<String> handleCustomPost(@RequestBody CustomRequest request) {
        // Your business logic here
        String responseMessage = "Received: " + request.getData();
        return ResponseEntity.ok(responseMessage);
    }
}
