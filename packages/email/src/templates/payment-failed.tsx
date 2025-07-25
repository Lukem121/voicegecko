import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { EmailFooter } from "../components/email-footer";

interface PaymentFailedEmailProps {
  name?: string;
  planName: string;
  retryPaymentUrl: string;
  accountUrl: string;
}

const logoTextUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZyL7b0tqZywrYS8IcuheEG0Tm1fBLgUx9z56J";

const fullLogoUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6Zmsa6y8txHjw8FtJgoYun3QXP4fViazMpIhRc";

export const PaymentFailedTemplate = ({
  name,
  planName,
  retryPaymentUrl,
  accountUrl,
}: PaymentFailedEmailProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>Payment issue with your {planName} subscription</Preview>
      <Body className="mx-auto bg-white px-4 font-sans">
        <Container className="mx-auto w-[580px] max-w-full py-5 pb-12">
          <Section className="mt-8">
            <Img src={fullLogoUrl} height="42" alt="VoiceGecko Logo" />
          </Section>

          <Heading className="my-7 text-3xl leading-tight font-bold text-[#1d1c1d]">
            Payment Issue with Your Subscription
          </Heading>

          <Text className="mb-4 text-lg leading-7">
            We had trouble processing the payment for your{" "}
            <strong>{planName}</strong> subscription.
          </Text>

          <Text className="mb-7 text-base leading-6 text-gray-700">
            Don't worry – your subscription is still active for now, and we'll
            retry the payment automatically. However, to avoid any interruption
            to your service, we recommend updating your payment method.
          </Text>

          {/* Action Section */}
          <Section className="mb-7 rounded-md bg-blue-50 p-6 text-center">
            <Text className="mb-6 text-base leading-6 text-gray-700">
              To continue enjoying your VoiceGecko subscription without
              interruption, please update your payment information.
            </Text>
            <Link
              className="mb-4 inline-block rounded-md bg-green-600 px-8 py-4 text-center font-medium text-white no-underline hover:bg-green-700"
              href={retryPaymentUrl}
            >
              Resolve Payment Issue
            </Link>
            <div className="mt-4">
              <Link
                className="text-sm text-blue-600 underline hover:text-blue-800"
                href={accountUrl}
              >
                Or manage your account settings
              </Link>
            </div>
          </Section>

          {/* Account Status */}
          <Section className="mb-7">
            <Heading className="mb-3 text-lg font-semibold text-[#1d1c1d]">
              📋 Your Account Status
            </Heading>
            <ul className="space-y-2 text-sm leading-6 text-gray-700">
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  Your <strong>{planName}</strong> features are still active
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>No data or transcriptions have been lost</span>
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
          <Section className="mb-7">
            <Text className="mb-4 text-base leading-6">
              Need help? We're here for you:
            </Text>
            <Text className="text-sm leading-6">
              <Link
                className="text-blue-600 underline hover:text-blue-800"
                href="mailto:support@voicegecko.io?subject=Need Help"
              >
                💬 Contact Support
              </Link>
              {" • "}
              <Link
                className="text-blue-600 underline hover:text-blue-800"
                href="https://discord.gg/BFxNQCzZjB"
              >
                💬 Discord Community
              </Link>
            </Text>
          </Section>

          <Text className="text-base leading-6 text-black">
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
