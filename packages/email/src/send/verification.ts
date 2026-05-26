import { sendEmail } from '../lib/send-email';
import { renderVerificationTemplate } from '../lib/template-renderer';

type UserWithEmail = {
  email: string;
  name: string;
};

export const sendVerificationEmail = async ({
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
      email: 'no-reply@voicegecko.dev',
      name: 'VoiceGecko',
    },
    categories: ['verification'],
    subject: 'Verify your email address',
    react: renderVerificationTemplate({ url }),
  });
};
