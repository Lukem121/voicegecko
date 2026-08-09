import { eq } from '@acme/db';
import { db } from '@acme/db/client';
import { user as UserTable } from '@acme/db/schema';

class AuthRepository {
  async getBanByEmail(email: string) {
    const [result] = await db
      .select({
        banned: UserTable.banned,
        banReason: UserTable.banReason,
        banExpires: UserTable.banExpires,
      })
      .from(UserTable)
      .where(eq(UserTable.email, email));

    return result ?? null;
  }
}

export const authRepository = new AuthRepository();
