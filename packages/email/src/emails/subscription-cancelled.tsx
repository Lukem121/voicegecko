import { SubscriptionCancelledTemplate } from '../templates/subscription-cancelled';

export default function SubscriptionCancelledEmail() {
  return (
    <SubscriptionCancelledTemplate
      accessUntilDate="March 15, 2025"
      name="Michael"
      planName="VoiceGecko Pro"
      reactivateUrl="https://www.voicegecko.dev/app/billing/reactivate"
    />
  );
}
