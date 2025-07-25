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

interface LinkEmailProps {
  heading: string;
  description: string;
  url: string;
}

const logoUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6Zmsa6y8txHjw8FtJgoYun3QXP4fViazMpIhRc";

export const LinkTemplate = ({ heading, description, url }: LinkEmailProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>{heading}</Preview>
      <Body className="mx-auto bg-white px-4 font-sans">
        <Container className="mx-auto w-[580px] max-w-full py-5 pb-12">
          <Section className="mt-8">
            <Img src={logoUrl} height="42" alt="VoiceGecko Logo" />
          </Section>
          <Heading className="my-7 text-3xl leading-tight font-bold text-[#1d1c1d]">
            {heading}
          </Heading>
          <Text className="mb-7 text-lg leading-7">{description}</Text>

          <Section className="mb-7 rounded-md bg-gray-100 p-10">
            <Link
              className="text-lg leading-6 break-all text-blue-600 hover:text-blue-800"
              href={url}
            >
              {url}
            </Link>
          </Section>

          <Text className="text-base leading-6 text-black">
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
