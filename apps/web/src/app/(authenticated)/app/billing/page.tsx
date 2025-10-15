import { headers } from 'next/headers';

import { authClient } from '~/lib/auth/client';
import { caller } from '~/trpc/server';
import Billing from './_components/billing';

export default async function BillingPage() {
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

  return (
    <Billing
      error={error}
      prices={prices}
      subscription={subscription ?? null}
    />
  );
}
