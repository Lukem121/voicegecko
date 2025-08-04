import { Column, Link, Row, Section, Text } from '@react-email/components';

import { DarkModeAwareLogo } from './dark-mode-aware-logo';

export const EmailFooter = () => (
  <>
    <Section>
      <Row className="mb-8 w-full">
        <Column className="w-2/3">
          <Link href="https://voicegecko.io">
            <DarkModeAwareLogo alt="VoiceGecko Logo Text" height="36" />
          </Link>
        </Column>
      </Row>
    </Section>

    <Section>
      <Row className="mb-6">
        <Column>
          <Text className="m-0 text-left text-[#b7b7b7] text-xs leading-4">
            <Link
              className="mr-2 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://docs.voicegecko.io"
              rel="noopener noreferrer"
              target="_blank"
            >
              Docs
            </Link>
            <span className="mx-2 text-[#b7b7b7]">|</span>
            <Link
              className="mx-2 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.voicegecko.io/legal"
              rel="noopener noreferrer"
              target="_blank"
            >
              Policies
            </Link>
            <span className="mx-2 text-[#b7b7b7]">|</span>
            <Link
              className="mx-2 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.voicegecko.io/help"
              rel="noopener noreferrer"
              target="_blank"
            >
              Help center
            </Link>
            <span className="mx-2 text-[#b7b7b7]">|</span>
            <Link
              className="mx-2 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://discord.gg/BFxNQCzZjB"
              rel="noopener noreferrer"
              target="_blank"
            >
              Discord Community
            </Link>
          </Text>
        </Column>
      </Row>
      <Row>
        <Column>
          <Text className="m-0 mb-12 text-left text-[#b7b7b7] text-xs leading-4">
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
