import { sendEmail } from '../lib/send-email';
import { renderResetPasswordTemplate } from '../lib/template-renderer';

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
  await sendEmail({
    to: {
      email: user.email,
      name: user.name,
    },
    from: {
      email: 'no-reply@voicegecko.io',
      name: 'VoiceGecko',
    },
    categories: ['reset_password'],
    subject: 'Reset your password',
    react: renderResetPasswordTemplate({ url }),
  });
};
