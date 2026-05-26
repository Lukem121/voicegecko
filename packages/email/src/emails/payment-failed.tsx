import { PaymentFailedTemplate } from '../templates/payment-failed';

export default function PaymentFailedEmail() {
  return (
    <PaymentFailedTemplate
      accountUrl="https://www.voicegecko.dev/app/account"
      name="Sarah"
      planName="VoiceGecko Pro"
      retryPaymentUrl="https://www.voicegecko.dev/app/billing/update-payment"
    />
  );
}
