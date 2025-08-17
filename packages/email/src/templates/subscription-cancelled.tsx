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

type SubscriptionCancelledEmailProps = {
  name?: string;
  planName: string;
  accessUntilDate: string;
  reactivateUrl?: string;
};

export const SubscriptionCancelledTemplate = ({
  planName,
  accessUntilDate,
  reactivateUrl,
}: SubscriptionCancelledEmailProps) => (
  <Tailwind>
    <Html>
      <DarkModeEmailHead />
      <Preview>{planName} subscription has been cancelled</Preview>
      <Body className="mx-auto bg-white px-2 font-sans sm:px-4">
        <Container className="mx-auto w-[580px] max-w-full py-3 pb-8 sm:py-5 sm:pb-12">
          <Section className="mt-4 px-2 sm:mt-8 sm:px-0">
            <DarkModeAwareLogoFull />
          </Section>

          <Heading className="my-4 px-2 font-bold text-2xl text-[#1d1c1d] leading-tight sm:my-7 sm:px-0 sm:text-3xl">
            Your Subscription is Cancelled
          </Heading>

          <Text className="mb-3 px-2 text-lg leading-6 sm:mb-4 sm:px-0 sm:leading-7">
            We're sorry to see you go. Your <strong>{planName}</strong>{' '}
            subscription has been successfully cancelled.
          </Text>

          <Text className="mb-5 px-2 text-base text-gray-700 leading-6 sm:mb-7 sm:px-0">
            Your premium features will remain active until{' '}
            <strong>{accessUntilDate}</strong>. After that, your account will
            automatically switch to our free tier.
          </Text>

          {/* Access Information */}
          <Section className="mx-2 mb-5 rounded-md bg-blue-50 p-3 sm:mx-0 sm:mb-7 sm:p-6">
            <Heading className="mb-3 font-semibold text-[#1d1c1d] text-lg sm:mb-4 sm:text-xl">
              What Happens Next
            </Heading>
            <ul className="space-y-2 pl-4 text-gray-700 text-sm leading-5 sm:space-y-3 sm:pl-5 sm:leading-6">
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  You keep all <strong>{planName}</strong> features until{' '}
                  <strong>{accessUntilDate}</strong>
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  Your transcription history stays safe and accessible
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>No more charges will be made to your payment method</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-blue-600">ℹ</span>
                <span>
                  After {accessUntilDate}, you'll have access to our free tier
                  features
                </span>
              </li>
            </ul>
          </Section>

          {/* Win-back Section */}
          {reactivateUrl && (
            <Section className="mb-5 px-2 text-center sm:mb-7 sm:px-0">
              <Heading className="mb-3 font-semibold text-[#1d1c1d] text-lg sm:mb-4 sm:text-xl">
                Changed Your Mind?
              </Heading>
              <Text className="mb-4 text-base text-gray-700 leading-6 sm:mb-6">
                You can reactivate your subscription anytime before{' '}
                {accessUntilDate} and pick up right where you left off.
              </Text>
              <Link
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-green-600 px-6 py-3 text-center font-medium text-white no-underline hover:bg-green-700 sm:px-8 sm:py-4"
                href={reactivateUrl}
                style={{ minHeight: '44px' }}
              >
                Reactivate Subscription
              </Link>
            </Section>
          )}

          {/* Feedback Section */}
          <Section className="mx-2 mb-5 rounded-md bg-gray-50 p-3 sm:mx-0 sm:mb-7 sm:p-6">
            <Heading className="mb-3 font-semibold text-[#1d1c1d] text-base sm:text-lg">
              💬 Help Us Improve
            </Heading>
            <Text className="mb-3 text-base text-gray-700 leading-6 sm:mb-4">
              We'd love to know what we could have done better. Your feedback
              helps us build a better experience for everyone.
            </Text>
            <Link
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-center font-medium text-white no-underline hover:bg-blue-700 sm:px-6 sm:py-3"
              href="mailto:feedback@voicegecko.io?subject=Subscription Cancellation Feedback"
              style={{ minHeight: '44px' }}
            >
              Share Feedback
            </Link>
          </Section>

          <Text className="px-2 text-base text-black leading-6 sm:px-0">
            Thank you for being part of the VoiceGecko community. We hope to see
            you again in the future! 🦎
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default SubscriptionCancelledTemplate;
