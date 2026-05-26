import { sendEmail } from '../lib/send-email';
import { renderWelcomeProTemplate } from '../lib/template-renderer';

type UserWithEmail = {
  email: string;
  name?: string;
};

export const sendWelcomeProEmail = async ({
  user,
  planName,
}: {
  user: UserWithEmail;
  planName: string;
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
    categories: ['welcome_pro'],
    subject: `Welcome to ${planName} - Unlock the full power of voice-to-text!`,
    react: renderWelcomeProTemplate({ name: user.name, planName }),
  });
};
