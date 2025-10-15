// import { sendWelcomeEmail } from '@acme/email/send/welcome';

import { db } from '@acme/db/client';
import { TeamMemberTable } from '@acme/db/schema';
import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import type { GenericEndpointContext, User } from 'better-auth';
import { eq } from 'drizzle-orm';

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
    // sendWelcomeEmail({
    //   user: {
    //     email: user.email,
    //     name: user.name,
    //   },
    // }),
  ]);

  // Link any pending team membership by email to this new user
  try {
    if (user.email) {
      await db
        .update(TeamMemberTable)
        .set({ userId: user.id, status: 'active' })
        .where(eq(TeamMemberTable.email, user.email));
    }
  } catch {
    // Non-critical; ignore failures
  }
};
