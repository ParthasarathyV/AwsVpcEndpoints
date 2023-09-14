import java.util.Scanner;

public class ConvertTimeToDays {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Enter a number: ");
        int number = scanner.nextInt();

        System.out.print("Enter type (month, year, or week): ");
        String type = scanner.next();

        int days = convertToDays(number, type);

        if (days >= 0) {
            System.out.println(number + " " + type + " is exactly " + days + " days.");
        } else {
            System.out.println("Invalid type. Please enter 'month', 'year', or 'week'.");
        }
    }

    public static int convertToDays(int number, String type) {
        int days = 0;

        switch (type.toLowerCase()) {
            case "month":
                days = number * 30; // Approximate average month length
                break;
            case "year":
                days = number * 365; // Assuming 365 days in a year
                break;
            case "week":
                days = number * 7; // 7 days in a week
                break;
            default:
                days = -1; // Invalid type
                break;
        }

        return days;
    }
}
