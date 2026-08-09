import { sendEmail } from '../lib/send-email';
import { renderSubscriptionCancelledTemplate } from '../lib/template-renderer';

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
  reactivateUrl: string;
}) => {
  await sendEmail({
    to: {
      email: user.email,
      name: user.name || '',
    },
    from: {
      email: 'no-reply@voicegecko.dev',
      name: 'VoiceGecko',
    },
    categories: ['subscription_cancelled'],
    subject: `${planName} subscription has been cancelled`,
    react: renderSubscriptionCancelledTemplate({
      name: user.name,
      planName,
      accessUntilDate,
      reactivateUrl,
    }),
  });
};
