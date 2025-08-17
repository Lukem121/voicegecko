import { sendWelcomeEmail } from '@acme/email/send/welcome';
import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import type { GenericEndpointContext, User } from 'better-auth';

const discordAdapter = new DiscordAdapter();

export const handleCreateAfterHook = async (
  user: User,
  _?: GenericEndpointContext
) => {
  await Promise.all([
    discordAdapter.sendUserSignup({
      userId: user.id,
      email: user.email,
      username: user.name,
      timestamp: new Date().toISOString(),
    }),
    sendWelcomeEmail({
      user: {
        email: user.email,
        name: user.name,
      },
    }),
  ]);
};
