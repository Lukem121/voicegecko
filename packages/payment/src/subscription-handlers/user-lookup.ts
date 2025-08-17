import { db } from '@acme/db/client';
import { user as UserTable } from '@acme/db/schema';
import { log } from '@acme/observability/log';
import { eq } from 'drizzle-orm';

export type UserForEmail = {
  email: string;
  name?: string;
};

/**
 * Fetches user details needed for sending emails
 */
export async function getUserForEmail(
  userId: string
): Promise<UserForEmail | null> {
  try {
    const [userRecord] = await db
      .select({
        email: UserTable.email,
        name: UserTable.name,
      })
      .from(UserTable)
      .where(eq(UserTable.id, userId))
      .limit(1);

    if (!userRecord) {
      log.error(`[Email] User not found for userId: ${userId}`);
      return null;
    }

    return {
      email: userRecord.email,
      name: userRecord.name || undefined,
    };
  } catch (error) {
    log.error('[Email] Error fetching user for email:', error);
    return null;
  }
}
