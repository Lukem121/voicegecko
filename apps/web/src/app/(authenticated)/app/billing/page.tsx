import { headers } from 'next/headers';

import { authClient } from '~/lib/auth/client';
import { caller } from '~/trpc/server';
import Billing from './_components/billing';

export default async function BillingPage() {
  const [prices, subscriptionData] = await Promise.all([
    caller.stripe.getPrices(),
    authClient.subscription.list({
      fetchOptions: {
        headers: await headers(),
      },
    }),
  ]);

  const subscription = subscriptionData.data?.at(0);
  const error = subscriptionData.error;

  return (
    <Billing
      error={error}
      prices={prices}
      subscription={subscription ?? null}
    />
  );
}
