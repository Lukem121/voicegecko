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

interface WelcomeProEmailProps {
  name?: string;
  planName: string;
}

const logoTextUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZyL7b0tqZywrYS8IcuheEG0Tm1fBLgUx9z56J";

const thankYouGeckoUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6Z3nnGQtFXVJa1EhulKH9YL0eUvGTmb7C4PRFr";

export const WelcomeProTemplate = ({
  name,
  planName,
}: WelcomeProEmailProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>
        Welcome to {planName} - Unlock the full power of voice-to-text!
      </Preview>
      <Body className="mx-auto bg-white px-4 font-sans">
        <Container className="mx-auto w-[580px] max-w-full py-5 pb-12">
          <Heading className="mt-8 mb-7 text-center text-3xl leading-tight font-bold text-[#1d1c1d]">
            Thank you for upgrading
            <br />
            to{" "}
            <Img
              src={logoTextUrl}
              height="32"
              alt="VoiceGecko"
              className="inline-block align-middle"
            />{" "}
            Pro!
          </Heading>

          {/* Thank You Gecko Mascot */}
          <Section className="mb-6 text-center">
            <Img
              src={thankYouGeckoUrl}
              height="120"
              alt="VoiceGecko mascot holding thank you sign"
              className="mx-auto"
            />
          </Section>

          <Text className="mb-4 text-lg leading-7">
            Congratulations{name ? `, ${name}` : ""}! You've just unlocked the
            full power of voice-to-text transcription.
          </Text>

          <Text className="mb-7 text-base leading-6 text-gray-700">
            Your <strong>{planName}</strong> subscription is now active. Get
            ready to experience unlimited transcriptions, priority processing,
            and premium features designed for power users.
          </Text>

          {/* Pro Features Section */}
          <Section className="mb-7 rounded-md bg-blue-50 p-6">
            <Heading className="mb-4 text-center text-xl font-semibold text-[#1d1c1d]">
              🎉 What's New in Your Pro Account
            </Heading>
            <ul className="space-y-3 text-sm leading-6 text-gray-700">
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  <strong>Unlimited Transcriptions</strong> - No more limits,
                  transcribe as much as you need
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  <strong>Priority Processing</strong> - Your transcriptions get
                  processed first
                </span>
              </li>

              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  <strong>Priority Support</strong> - Get help faster when you
                  need it
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  <strong>Custom Discord Role</strong> - Get recognized as a Pro
                  member in our community
                </span>
              </li>
            </ul>
          </Section>

          <Text className="text-base leading-6 text-black">
            Thank you for choosing VoiceGecko Pro. We're excited to see what
            you'll accomplish with unlimited voice-to-text power!
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default WelcomeProTemplate;
