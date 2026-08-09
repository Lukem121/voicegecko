import { headers } from 'next/headers';

import { authClient } from '~/lib/auth/client';
import { caller, HydrateClient, prefetch, trpc } from '~/trpc/server';
import Plans from './_components/plans';

export default async function PlansPage() {
  const [prices, subscriptionData, effective] = await Promise.all([
    caller.stripe.getPrices(),
    authClient.subscription.list({
      fetchOptions: {
        headers: await headers(),
      },
    }),
    caller.stripe.getEffectiveSubscription(),
  ]);

  const subscription = effective ?? subscriptionData.data?.at(0);
  const error = subscriptionData.error;

  // Prefetch effective subscription to hydrate client query instantly
  await prefetch(trpc.stripe.getEffectiveSubscription.queryOptions());

  return (
    <HydrateClient>
      <Plans
        error={error}
        prices={prices}
        subscription={subscription ?? null}
      />
    </HydrateClient>
  );
}
