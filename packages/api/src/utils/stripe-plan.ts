import { apiEnv } from '../../env';

/** True when priceId matches optional legacy Team Stripe prices. */
export function isTeamPriceId(priceId: string | null | undefined): boolean {
  if (!priceId) {
    return false;
  }
  const { STRIPE_PRICE_ID_TEAM_MONTHLY, STRIPE_PRICE_ID_TEAM_YEARLY } =
    apiEnv();
  return (
    priceId === STRIPE_PRICE_ID_TEAM_MONTHLY ||
    priceId === STRIPE_PRICE_ID_TEAM_YEARLY
  );
}
