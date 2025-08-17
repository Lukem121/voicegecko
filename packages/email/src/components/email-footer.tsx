import { Column, Link, Row, Section, Text } from '@react-email/components';

import { DarkModeAwareLogo } from './dark-mode-aware-logo';

export const EmailFooter = () => (
  <>
    <Section>
      <Row className="mb-8 w-full">
        <Column className="w-2/3">
          <Link href="https://www.voicegecko.io">
            <DarkModeAwareLogo alt="VoiceGecko Logo Text" height="36" />
          </Link>
        </Column>
      </Row>
    </Section>

    <Section>
      <Row className="mb-6">
        <Column>
          <Text className="m-0 text-left text-[#b7b7b7] text-xs leading-6">
            <Link
              className="mr-3 mb-2 inline-block min-h-[44px] py-1 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.voicegecko.io/pricing"
              rel="noopener noreferrer"
              style={{ minHeight: '44px', padding: '8px 4px' }}
              target="_blank"
            >
              Pricing
            </Link>
            <span className="mx-1 hidden text-[#b7b7b7] sm:inline">|</span>
            <Link
              className="mr-3 mb-2 inline-block min-h-[44px] py-1 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.voicegecko.io/terms/privacy-policy"
              rel="noopener noreferrer"
              style={{ minHeight: '44px', padding: '8px 4px' }}
              target="_blank"
            >
              Privacy Policy
            </Link>
            <span className="mx-1 hidden text-[#b7b7b7] sm:inline">|</span>
            <Link
              className="mr-3 mb-2 inline-block min-h-[44px] py-1 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://www.voicegecko.io/terms/terms-of-service"
              rel="noopener noreferrer"
              style={{ minHeight: '44px', padding: '8px 4px' }}
              target="_blank"
            >
              Terms of Service
            </Link>
            <span className="mx-1 hidden text-[#b7b7b7] sm:inline">|</span>
            <Link
              className="mr-3 mb-2 inline-block min-h-[44px] py-1 text-[#b7b7b7] underline hover:text-gray-600"
              href="https://discord.gg/BFxNQCzZjB"
              rel="noopener noreferrer"
              style={{ minHeight: '44px', padding: '8px 4px' }}
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
