import { SubscriptionCancelledTemplate } from "../templates/subscription-cancelled";

export default function SubscriptionCancelledEmail() {
  return (
    <SubscriptionCancelledTemplate
      name="Michael"
      planName="VoiceGecko Pro"
      accessUntilDate="March 15, 2025"
      reactivateUrl="https://www.voicegecko.io/app/billing/reactivate"
    />
  );
}
