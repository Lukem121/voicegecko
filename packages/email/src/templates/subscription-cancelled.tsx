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

interface SubscriptionCancelledEmailProps {
  name?: string;
  planName: string;
  accessUntilDate: string;
  reactivateUrl?: string;
}

const logoTextUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZyL7b0tqZywrYS8IcuheEG0Tm1fBLgUx9z56J";

const fullLogoUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6Zmsa6y8txHjw8FtJgoYun3QXP4fViazMpIhRc";

export const SubscriptionCancelledTemplate = ({
  name,
  planName,
  accessUntilDate,
  reactivateUrl,
}: SubscriptionCancelledEmailProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>Your {planName} subscription has been cancelled</Preview>
      <Body className="mx-auto bg-white px-4 font-sans">
        <Container className="mx-auto w-[580px] max-w-full py-5 pb-12">
          <Section className="mt-8">
            <Img src={fullLogoUrl} height="42" alt="VoiceGecko Logo" />
          </Section>

          <Heading className="my-7 text-3xl leading-tight font-bold text-[#1d1c1d]">
            Your Subscription is Cancelled
          </Heading>

          <Text className="mb-4 text-lg leading-7">
            We're sorry to see you go. Your <strong>{planName}</strong>{" "}
            subscription has been successfully cancelled.
          </Text>

          <Text className="mb-7 text-base leading-6 text-gray-700">
            Your premium features will remain active until{" "}
            <strong>{accessUntilDate}</strong>. After that, your account will
            automatically switch to our free tier.
          </Text>

          {/* Access Information */}
          <Section className="mb-7 rounded-md bg-blue-50 p-6">
            <Heading className="mb-4 text-xl font-semibold text-[#1d1c1d]">
              What Happens Next
            </Heading>
            <ul className="space-y-3 text-sm leading-6 text-gray-700">
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  You keep all <strong>{planName}</strong> features until{" "}
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
            <Section className="mb-7 text-center">
              <Heading className="mb-4 text-xl font-semibold text-[#1d1c1d]">
                Changed Your Mind?
              </Heading>
              <Text className="mb-6 text-base leading-6 text-gray-700">
                You can reactivate your subscription anytime before{" "}
                {accessUntilDate} and pick up right where you left off.
              </Text>
              <Link
                className="inline-block rounded-md bg-green-600 px-8 py-4 text-center font-medium text-white no-underline hover:bg-green-700"
                href={reactivateUrl}
              >
                Reactivate Subscription
              </Link>
            </Section>
          )}

          {/* Feedback Section */}
          <Section className="mb-7 rounded-md bg-gray-50 p-6">
            <Heading className="mb-3 text-lg font-semibold text-[#1d1c1d]">
              💬 Help Us Improve
            </Heading>
            <Text className="mb-4 text-base leading-6 text-gray-700">
              We'd love to know what we could have done better. Your feedback
              helps us build a better experience for everyone.
            </Text>
            <Link
              className="inline-block rounded-md bg-blue-600 px-6 py-3 text-center font-medium text-white no-underline hover:bg-blue-700"
              href="mailto:feedback@voicegecko.io?subject=Subscription Cancellation Feedback"
            >
              Share Feedback
            </Link>
          </Section>

          <Text className="text-base leading-6 text-black">
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
