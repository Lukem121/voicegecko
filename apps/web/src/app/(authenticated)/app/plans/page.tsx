import { headers } from 'next/headers';

import { authClient } from '~/lib/auth/client';
import { caller } from '~/trpc/server';
import Plans from './_components/plans';

export default async function PlansPage() {
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
    <Plans error={error} prices={prices} subscription={subscription ?? null} />
  );
}
