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
} from '@react-email/components';

import { DarkModeAwareLogoFull } from '../components/dark-mode-aware-logo-full';
import { DarkModeEmailHead } from '../components/dark-mode-email-head';
import { EmailFooter } from '../components/email-footer';

interface LinkEmailProps {
  heading: string;
  description: string;
  url: string;
}

export const LinkTemplate = ({ heading, description, url }: LinkEmailProps) => (
  <Tailwind>
    <Html>
      <DarkModeEmailHead />
      <Preview>{heading}</Preview>
      <Body className="mx-auto bg-white px-2 font-sans sm:px-4">
        <Container className="mx-auto w-[580px] max-w-full py-3 pb-8 sm:py-5 sm:pb-12">
          <Section className="mt-4 px-2 sm:mt-8 sm:px-0">
            <DarkModeAwareLogoFull />
          </Section>
          <Heading className="my-4 px-2 font-bold text-2xl text-[#1d1c1d] leading-tight sm:my-7 sm:px-0 sm:text-3xl">
            {heading}
          </Heading>
          <Text className="mb-5 px-2 text-lg leading-6 sm:mb-7 sm:px-0 sm:leading-7">
            {description}
          </Text>

          <Section className="mx-2 mb-5 rounded-md bg-gray-100 p-6 sm:mx-0 sm:mb-7 sm:p-10">
            <Link
              className="break-all text-base text-blue-600 leading-6 hover:text-blue-800 sm:text-lg"
              href={url}
            >
              {url}
            </Link>
          </Section>

          <Text className="px-2 text-base text-black leading-6 sm:px-0">
            If you didn't request this email, there's nothing to worry about,
            you can safely ignore it.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default LinkTemplate;
