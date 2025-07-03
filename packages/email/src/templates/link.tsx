import * as React from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface LinkEmailProps {
  heading: string;
  description: string;
  url: string;
}

const logoUrl =
  "https://utfs.io/f/SYU615OjI5Qzt9xtEZV4oz5ETXIacVLrg1DiwfSHdv7YmGtU";

export const LinkTemplate = ({ heading, description, url }: LinkEmailProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>{heading}</Preview>
      <Body className="mx-auto bg-white font-sans">
        <Container className="mx-auto w-[580px] max-w-full py-5 pb-12">
          <Section className="mt-8">
            <Img src={logoUrl} width="144" height="36" alt="SMMHubX Logo" />
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

          <Section>
            <Row className="mb-8 w-full px-2">
              <Column className="w-2/3">
                <Img src={logoUrl} width="144" height="36" alt="SMMHubX Logo" />
              </Column>
            </Row>
          </Section>

          <Section>
            <Link
              className="text-[#b7b7b7] underline hover:text-gray-600"
              href="https://docs.smmhubx.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </Link>
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            <Link
              className="text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.smmhubx.com/legal"
              target="_blank"
              rel="noopener noreferrer"
            >
              Policies
            </Link>
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            <Link
              className="text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.smmhubx.com/help"
              target="_blank"
              rel="noopener noreferrer"
            >
              Help center
            </Link>
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            <Link
              className="text-[#b7b7b7] underline hover:text-gray-600"
              href="https://discord.gg/VJh8GyAnuK"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord Community
            </Link>
            <Text className="mb-12 text-left text-xs leading-4 text-[#b7b7b7]">
              ©2025 SMMHUBX, SFN. <br />
              All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default LinkTemplate;
