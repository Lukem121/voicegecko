import { sendEmail } from '../lib/send-email';
import { PaymentFailedTemplate } from '../templates/payment-failed';

type UserWithEmail = {
  email: string;
  name?: string;
};

export const sendPaymentFailedEmail = async ({
  user,
  planName,
  retryPaymentUrl,
  accountUrl,
}: {
  user: UserWithEmail;
  planName: string;
  retryPaymentUrl: string;
  accountUrl: string;
}) => {
  await sendEmail({
    to: {
      email: user.email,
      name: user.name || '',
    },
    from: {
      email: 'no-reply@voicegecko.io',
      name: 'VoiceGecko',
    },
    categories: ['payment_failed'],
    subject: `Payment issue with your ${planName} subscription`,
    react: (
      <PaymentFailedTemplate
        accountUrl={accountUrl}
        name={user.name}
        planName={planName}
        retryPaymentUrl={retryPaymentUrl}
      />
    ),
  });
};
