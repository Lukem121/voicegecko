import { sendEmail } from '../lib/send-email';
import { renderStudentDiscountTemplate } from '../lib/template-renderer';

type UserWithEmail = {
  email: string;
};

export const sendStudentDiscountEmail = async ({
  user,
  couponCode,
  discountPercentage,
  redemptionUrl,
}: {
  user: UserWithEmail;
  couponCode: string;
  discountPercentage: string;
  redemptionUrl: string;
}) => {
  await sendEmail({
    to: {
      email: user.email,
    },
    from: {
      email: 'no-reply@voicegecko.io',
      name: 'VoiceGecko',
    },
    categories: ['student_discount'],
    subject: 'VoiceGecko student discount',
    react: renderStudentDiscountTemplate({
      couponCode,
      discountPercentage,
      redemptionUrl,
    }),
  });
};
