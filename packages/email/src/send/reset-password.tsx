import { sendEmail } from '../lib/send-email';
import LinkTemplate from '../templates/link';

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
    react: (
      <LinkTemplate
        description="Your reset password link is below - click it to reset your password. This will redirect you back to VoiceGecko."
        heading="Reset your password"
        url={url}
      />
    ),
  });
};
