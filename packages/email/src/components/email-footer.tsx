import { Column, Link, Row, Section, Text } from "@react-email/components";

import { DarkModeAwareLogo } from "./dark-mode-aware-logo";

export const EmailFooter = () => (
  <>
    <Section>
      <Row className="mb-8 w-full">
        <Column className="w-2/3">
          <Link href="https://voicegecko.io">
            <DarkModeAwareLogo height="36" alt="VoiceGecko Logo Text" />
          </Link>
        </Column>
      </Row>
    </Section>

    <Section>
      <Row className="mb-6">
        <Column>
          <Text className="m-0 text-left text-xs leading-4 text-[#b7b7b7]">
            <Link
              className="mr-2 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://docs.voicegecko.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </Link>
            <span className="mx-2 text-[#b7b7b7]">|</span>
            <Link
              className="mx-2 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.voicegecko.io/legal"
              target="_blank"
              rel="noopener noreferrer"
            >
              Policies
            </Link>
            <span className="mx-2 text-[#b7b7b7]">|</span>
            <Link
              className="mx-2 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.voicegecko.io/help"
              target="_blank"
              rel="noopener noreferrer"
            >
              Help center
            </Link>
            <span className="mx-2 text-[#b7b7b7]">|</span>
            <Link
              className="mx-2 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://discord.gg/BFxNQCzZjB"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord Community
            </Link>
          </Text>
        </Column>
      </Row>
      <Row>
        <Column>
          <Text className="m-0 mb-12 text-left text-xs leading-4 text-[#b7b7b7]">
            ©2025 Voice Gecko Ltd.
            <br />
            All rights reserved.
          </Text>
        </Column>
      </Row>
    </Section>
  </>
);

export default EmailFooter;
