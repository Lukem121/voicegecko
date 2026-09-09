import {
  Body,
  Container,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import { DarkModeAwareLogoFull } from '../components/dark-mode-aware-logo-full';
import { DarkModeEmailHead } from '../components/dark-mode-email-head';
import { EmailFooter } from '../components/email-footer';

type PaymentFailedEmailProps = {
  name?: string;
  planName: string;
  retryPaymentUrl: string;
  accountUrl: string;
};

export const PaymentFailedTemplate = ({
  planName,
  retryPaymentUrl,
  accountUrl,
}: PaymentFailedEmailProps) => (
  <Tailwind>
    <Html>
      <DarkModeEmailHead />
      <Preview>Payment issue with your {planName} subscription</Preview>
      <Body className="mx-auto bg-white px-2 font-sans sm:px-4">
        <Container className="mx-auto w-[580px] max-w-full py-3 pb-8 sm:py-5 sm:pb-12">
          <Section className="mt-4 px-2 sm:mt-8 sm:px-0">
            <DarkModeAwareLogoFull />
          </Section>

          <Heading className="my-4 px-2 font-bold text-2xl text-[#1d1c1d] leading-tight sm:my-7 sm:px-0 sm:text-3xl">
            Payment Issue with Your Subscription
          </Heading>

          <Text className="mb-3 px-2 text-lg leading-6 sm:mb-4 sm:px-0 sm:leading-7">
            We had trouble processing the payment for your{' '}
            <strong>{planName}</strong> subscription.
          </Text>

          <Text className="mb-5 px-2 text-base text-gray-700 leading-6 sm:mb-7 sm:px-0">
            Don't worry – your subscription is still active for now, and we'll
            retry the payment automatically. However, to avoid any interruption
            to your service, we recommend updating your payment method.
          </Text>

          {/* Action Section */}
          <Section className="mx-2 mb-5 rounded-md bg-blue-50 p-4 text-center sm:mx-0 sm:mb-7 sm:p-6">
            <Text className="mb-4 px-2 text-base text-gray-700 leading-6 sm:mb-6 sm:px-0">
              To continue enjoying your VoiceGecko subscription without
              interruption, please update your payment information.
            </Text>
            <Link
              className="mb-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-green-600 px-6 py-3 text-center font-medium text-white no-underline hover:bg-green-700 sm:px-8 sm:py-4"
              href={retryPaymentUrl}
              style={{ minHeight: '44px' }}
            >
              Resolve Payment Issue
            </Link>
            <div className="mt-4">
              <Link
                className="inline-block min-h-[44px] py-2 text-blue-600 text-sm underline hover:text-blue-800"
                href={accountUrl}
                style={{ minHeight: '44px', padding: '8px 4px' }}
              >
                Or manage your account settings
              </Link>
            </div>
          </Section>

          {/* Account Status */}
          <Section className="mb-5 px-2 sm:mb-7 sm:px-0">
            <Heading className="mb-3 font-semibold text-[#1d1c1d] text-base sm:text-lg">
              📋 Your Account Status
            </Heading>
            <ul className="space-y-2 pl-4 text-gray-700 text-sm leading-6 sm:pl-5">
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  Your <strong>{planName}</strong> features are still active
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>No data or dictations have been lost</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-yellow-600">⚠</span>
                <span>
                  Service may be interrupted if payment isn't resolved within 7
                  days
                </span>
              </li>
            </ul>
          </Section>

          {/* Help Section */}
          <Section className="mb-5 px-2 sm:mb-7 sm:px-0">
            <Text className="mb-3 text-base leading-6 sm:mb-4">
              Need help? We're here for you:
            </Text>
            <Text className="text-sm leading-6">
              <Link
                className="mr-4 mb-2 inline-block min-h-[44px] py-2 text-blue-600 underline hover:text-blue-800"
                href="mailto:support@voicegecko.dev?subject=Need Help"
                style={{ minHeight: '44px', padding: '8px 4px' }}
              >
                Contact Support
              </Link>
              <span className="hidden sm:inline"> • </span>
              <Link
                className="mb-2 inline-block min-h-[44px] py-2 text-blue-600 underline hover:text-blue-800"
                href="https://discord.gg/wfMY47mUvM"
                style={{ minHeight: '44px', padding: '8px 4px' }}
              >
                Discord Community
              </Link>
            </Text>
          </Section>

          <Text className="px-2 text-base text-black leading-6 sm:px-0">
            Thank you for being a VoiceGecko user. We appreciate your business
            and want to keep you transcribing!
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default PaymentFailedTemplate;
