import {
  Body,
  Container,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import { DarkModeAwareLogo } from '../components/dark-mode-aware-logo';
import { DarkModeEmailHead } from '../components/dark-mode-email-head';
import { EmailFooter } from '../components/email-footer';

type WelcomeProEmailProps = {
  name?: string;
  planName: string;
};

const thankYouGeckoUrl =
  'https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZOPfyPvSEiXZxG9dY34AvLazHegtNsJIfWQOV';

export const WelcomeProTemplate = ({
  name,
  planName,
}: WelcomeProEmailProps) => (
  <Tailwind>
    <Html>
      <DarkModeEmailHead />
      <Preview>
        Welcome to {planName} - Unlock the full power of voice-to-text!
      </Preview>
      <Body className="mx-auto bg-white px-2 font-sans sm:px-4">
        <Container className="mx-auto w-[580px] max-w-full py-3 pb-8 sm:py-5 sm:pb-12">
          <Heading className="mt-4 mb-4 px-2 text-center font-bold text-2xl text-[#1d1c1d] leading-tight sm:mt-8 sm:mb-7 sm:px-0 sm:text-3xl">
            Thank you for upgrading
            <br />
            to{' '}
            <DarkModeAwareLogo
              alt="VoiceGecko"
              className="inline-block align-middle"
              height="32"
            />{' '}
            Pro!
          </Heading>

          {/* Thank You Gecko Mascot */}
          <Section className="mb-4 text-center sm:mb-6">
            <Img
              alt="VoiceGecko mascot holding thank you sign"
              className="mx-auto"
              height="120"
              src={thankYouGeckoUrl}
            />
          </Section>

          <Text className="mb-3 px-2 text-lg leading-6 sm:mb-4 sm:px-0 sm:leading-7">
            Congratulations{name ? `, ${name}` : ''}! You've just unlocked the
            full power of voice-to-text transcription.
          </Text>

          <Text className="mb-5 px-2 text-base text-gray-700 leading-6 sm:mb-7 sm:px-0">
            Your <strong>{planName}</strong> subscription is now active. Get
            ready to experience unlimited transcriptions, priority processing,
            and premium features designed for power users.
          </Text>

          {/* Pro Features Section */}
          <Section className="mx-2 mb-5 rounded-md bg-blue-50 p-3 sm:mx-0 sm:mb-7 sm:p-6">
            <Heading className="mb-3 text-center font-semibold text-[#1d1c1d] text-lg sm:mb-4 sm:text-xl">
              🎉 What's New in Your Pro Account
            </Heading>
            <ul className="space-y-2 pl-4 text-gray-700 text-sm leading-5 sm:space-y-3 sm:pl-5 sm:leading-6">
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

          <Text className="px-2 text-base text-black leading-6 sm:px-0">
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
