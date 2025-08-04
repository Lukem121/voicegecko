import { sendEmail } from '../lib/send-email';
import { SubscriptionCancelledTemplate } from '../templates/subscription-cancelled';

type UserWithEmail = {
  email: string;
  name?: string;
};

export const sendSubscriptionCancelledEmail = async ({
  user,
  planName,
  accessUntilDate,
  reactivateUrl,
}: {
  user: UserWithEmail;
  planName: string;
  accessUntilDate: string;
  reactivateUrl?: string;
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
    categories: ['subscription_cancelled'],
    subject: `${planName} subscription has been cancelled`,
    react: (
      <SubscriptionCancelledTemplate
        accessUntilDate={accessUntilDate}
        name={user.name}
        planName={planName}
        reactivateUrl={reactivateUrl}
      />
    ),
  });
};
