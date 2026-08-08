import { SubscriptionCancelledTemplate } from '../templates/subscription-cancelled';

export default function SubscriptionCancelledEmail() {
  return (
    <SubscriptionCancelledTemplate
      accessUntilDate="March 15, 2025"
      name="Michael"
      planName="Voice Gecko Support"
      reactivateUrl="https://www.voicegecko.dev/app/billing/reactivate"
    />
  );
}
