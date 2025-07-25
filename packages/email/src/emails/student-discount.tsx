import { StudentDiscountTemplate } from "../templates/student-discount";

export default function StudentDiscountEmail() {
  return (
    <StudentDiscountTemplate
      name="Alex"
      couponCode="RYGALTMSXJAA"
      discountPercentage="50"
      redemptionUrl="https://www.voicegecko.io/pricing?student=true"
    />
  );
}
