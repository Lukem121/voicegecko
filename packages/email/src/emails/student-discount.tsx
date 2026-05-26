import { StudentDiscountTemplate } from '../templates/student-discount';

export default function StudentDiscountEmail() {
  return (
    <StudentDiscountTemplate
      couponCode="RYGALTMSXJAA"
      discountPercentage="50"
      redemptionUrl="https://www.voicegecko.dev/pricing?student=true"
    />
  );
}
