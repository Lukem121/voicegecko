import { sendEmail } from '../lib/send-email';
import { renderResetPasswordTemplate } from '../lib/template-renderer';
import { assertEmailRateLimit } from '../lib/email-rate-limit';

type UserWithEmail = {
  name: string;
  email: string;
};

export const sendResetPasswordEmail = async ({
  user,
  url,
}: {
  user: UserWithEmail;
  url: string;
}) => {
  await assertEmailRateLimit('reset-password', user.email);

  await sendEmail({
    to: {
      email: user.email,
      name: user.name,
    },
    from: {
      email: 'no-reply@voicegecko.dev',
      name: 'VoiceGecko',
    },
    categories: ['reset_password'],
    subject: 'Reset your password',
    react: renderResetPasswordTemplate({ url }),
  });
};
