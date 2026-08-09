import { sendEmail } from '../lib/send-email';
import { renderWelcomeTemplate } from '../lib/template-renderer';

type UserWithEmail = {
  email: string;
  name?: string;
};

export const sendWelcomeEmail = async ({ user }: { user: UserWithEmail }) => {
  await sendEmail({
    to: {
      email: user.email,
      name: user.name || '',
    },
    from: {
      email: 'no-reply@voicegecko.dev',
      name: 'VoiceGecko',
    },
    categories: ['welcome'],
    subject: 'Welcome to VoiceGecko - Your voice-to-text journey begins now!',
    react: renderWelcomeTemplate({ name: user.name }),
  });
};
