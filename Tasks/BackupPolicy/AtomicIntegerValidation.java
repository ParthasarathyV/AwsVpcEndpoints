import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicInteger;

public class AtomicIntegerValidation {
    public static void main(String[] args) {
        AtomicInteger int1 = new AtomicInteger(5);
        AtomicInteger int2 = new AtomicInteger(8);
        ArrayList<AtomicInteger> int3 = new ArrayList<>();
        ArrayList<AtomicInteger> int4 = new ArrayList<>();

        int3.add(new AtomicInteger(10));
        int3.add(new AtomicInteger(12));
        int3.add(new AtomicInteger(15));

        int4.add(new AtomicInteger(20));
        int4.add(new AtomicInteger(25));
        int4.add(new AtomicInteger(30));

        boolean condition1 = int1.get() < int2.get();
        boolean condition2 = int3.stream().allMatch(val -> int2.get() < val.get());
        boolean condition3 = int3.stream().allMatch(val -> int4.stream().allMatch(innerVal -> val.get() < innerVal.get()));

        if (condition1 && condition2 && condition3) {
            System.out.println("Validation successful.");
        } else {
            System.out.println("Validation failed.");
        }
    }
}
