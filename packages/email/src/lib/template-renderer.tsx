import type { ReactElement } from 'react';
import LinkTemplate from '../templates/link';
import { PaymentFailedTemplate } from '../templates/payment-failed';
import { SubscriptionCancelledTemplate } from '../templates/subscription-cancelled';
import { WelcomeTemplate } from '../templates/welcome';
import { WelcomeProTemplate } from '../templates/welcome-pro';

export const renderPaymentFailedTemplate = ({
  accountUrl,
  name,
  planName,
  retryPaymentUrl,
}: {
  accountUrl: string;
  name?: string;
  planName: string;
  retryPaymentUrl: string;
}): ReactElement => (
  <PaymentFailedTemplate
    accountUrl={accountUrl}
    name={name}
    planName={planName}
    retryPaymentUrl={retryPaymentUrl}
  />
);

export const renderResetPasswordTemplate = ({
  url,
}: {
  url: string;
}): ReactElement => (
  <LinkTemplate
    description="Your reset password link is below - click it to reset your password. This will redirect you back to VoiceGecko."
    heading="Reset your password"
    url={url}
  />
);

export const renderSubscriptionCancelledTemplate = ({
  name,
  planName,
  accessUntilDate,
  reactivateUrl,
}: {
  name?: string;
  planName: string;
  accessUntilDate: string;
  reactivateUrl: string;
}): ReactElement => (
  <SubscriptionCancelledTemplate
    accessUntilDate={accessUntilDate}
    name={name}
    planName={planName}
    reactivateUrl={reactivateUrl}
  />
);

export const renderVerificationTemplate = ({
  url,
}: {
  url: string;
}): ReactElement => (
  <LinkTemplate
    description="Your verification link is below - click it to verify your account. This will redirect you back to VoiceGecko."
    heading="Verify your account"
    url={url}
  />
);

export const renderWelcomeTemplate = ({
  name,
}: {
  name?: string;
}): ReactElement => <WelcomeTemplate name={name} />;

export const renderWelcomeProTemplate = ({
  name,
  planName,
}: {
  name?: string;
  planName: string;
}): ReactElement => <WelcomeProTemplate name={name} planName={planName} />;
