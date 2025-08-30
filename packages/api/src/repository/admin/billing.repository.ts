import { desc, eq } from '@acme/db';
import { db } from '@acme/db/client';
import {
  subscription as SubscriptionTable,
  user as UserTable,
} from '@acme/db/schema';

export type LatestSubscription = {
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean | null;
  periodEnd: Date | null;
  latestInvoiceId: string | null;
};

class BillingRepository {
  async getLatestSubscription(
    userId: string
  ): Promise<LatestSubscription | null> {
    const [user] = await db
      .select({ stripeCustomerId: UserTable.stripeCustomerId })
      .from(UserTable)
      .where(eq(UserTable.id, userId))
      .limit(1);

    if (!user?.stripeCustomerId) {
      return null;
    }

    const [subscription] = await db
      .select({
        stripeSubscriptionId: SubscriptionTable.stripeSubscriptionId,
        stripeCustomerId: SubscriptionTable.stripeCustomerId,
        status: SubscriptionTable.status,
        cancelAtPeriodEnd: SubscriptionTable.cancelAtPeriodEnd,
        periodEnd: SubscriptionTable.periodEnd,
        latestInvoiceId: SubscriptionTable.stripeSubscriptionId,
      })
      .from(SubscriptionTable)
      .where(eq(SubscriptionTable.stripeCustomerId, user.stripeCustomerId))
      .orderBy(desc(SubscriptionTable.periodEnd))
      .limit(1);

    return subscription || null;
  }
}

export const billingRepository = new BillingRepository();
