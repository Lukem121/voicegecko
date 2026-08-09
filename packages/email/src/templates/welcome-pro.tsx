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
        Thank you for supporting Voice Gecko — you help keep the project going!
      </Preview>
      <Body className="mx-auto bg-white px-2 font-sans sm:px-4">
        <Container className="mx-auto w-[580px] max-w-full py-3 pb-8 sm:py-5 sm:pb-12">
          <Heading className="mt-4 mb-4 px-2 text-center font-bold text-2xl text-[#1d1c1d] leading-tight sm:mt-8 sm:mb-7 sm:px-0 sm:text-3xl">
            Thank you for supporting
            <br />
            <DarkModeAwareLogo
              alt="VoiceGecko"
              className="inline-block align-middle"
              height="32"
            />
            !
          </Heading>

          <Section className="mb-4 text-center sm:mb-6">
            <Img
              alt="VoiceGecko mascot holding thank you sign"
              className="mx-auto"
              height="120"
              src={thankYouGeckoUrl}
            />
          </Section>

          <Text className="mb-3 px-2 text-lg leading-6 sm:mb-4 sm:px-0 sm:leading-7">
            Thank you{name ? `, ${name}` : ''}! Your support means a lot.
          </Text>

          <Text className="mb-5 px-2 text-base text-gray-700 leading-6 sm:mb-7 sm:px-0">
            Your <strong>{planName}</strong> contribution is now active. Voice
            Gecko is free and open source for everyone — supporters like you
            help fund ongoing development.
          </Text>

          <Section className="mx-2 mb-5 rounded-md bg-blue-50 p-3 sm:mx-0 sm:mb-7 sm:p-6">
            <Heading className="mb-3 text-center font-semibold text-[#1d1c1d] text-lg sm:mb-4 sm:text-xl">
              What your support does
            </Heading>
            <ul className="space-y-2 pl-4 text-gray-700 text-sm leading-5 sm:space-y-3 sm:pl-5 sm:leading-6">
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  <strong>Funds development</strong> — keeps Voice Gecko
                  improving
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  <strong>Same full product</strong> — no gated features; Free
                  and Support are identical
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  <strong>Cancel anytime</strong> — manage billing from your
                  account
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-600">✓</span>
                <span>
                  <strong>Community recognition</strong> — supporter role in
                  Discord when available
                </span>
              </li>
            </ul>
          </Section>

          <Text className="px-2 text-base text-black leading-6 sm:px-0">
            Thank you for supporting Voice Gecko. We are glad you are part of
            the project.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default WelcomeProTemplate;
