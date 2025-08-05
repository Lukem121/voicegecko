import { PaymentFailedTemplate } from '../templates/payment-failed';

export default function PaymentFailedEmail() {
  return (
    <PaymentFailedTemplate
      accountUrl="https://www.voicegecko.io/app/account"
      name="Sarah"
      planName="VoiceGecko Pro"
      retryPaymentUrl="https://www.voicegecko.io/app/billing/update-payment"
    />
  );
}
