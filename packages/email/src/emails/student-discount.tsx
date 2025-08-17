import { StudentDiscountTemplate } from '../templates/student-discount';

export default function StudentDiscountEmail() {
  return (
    <StudentDiscountTemplate
      couponCode="RYGALTMSXJAA"
      discountPercentage="50"
      redemptionUrl="https://www.voicegecko.io/pricing?student=true"
    />
  );
}
