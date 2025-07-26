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

interface WelcomeEmailProps {
  name?: string;
  downloadUrl?: string;
}

const logoUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6Zmsa6y8txHjw8FtJgoYun3QXP4fViazMpIhRc";

const logoTextUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZyL7b0tqZywrYS8IcuheEG0Tm1fBLgUx9z56J";

const welcomeGeckoUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZIZUGNcEATV6Nv5s4hzMj9rdBkWbRKc7JtqLC";

export const WelcomeTemplate = ({
  name,
  downloadUrl = "https://voicegecko.io/downloads",
}: WelcomeEmailProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>
        Welcome to VoiceGecko - Your voice-to-text journey begins now!
      </Preview>
      <Body className="mx-auto bg-white px-2 font-sans sm:px-4">
        <Container className="mx-auto w-[580px] max-w-full py-3 pb-8 sm:py-5 sm:pb-12">
          <Heading className="mt-4 mb-4 px-2 text-center text-2xl leading-tight font-bold text-[#1d1c1d] sm:mt-8 sm:mb-7 sm:px-0 sm:text-3xl">
            Thanks for joining!
            <br className="sm:hidden" />
            <Img
              src={logoTextUrl}
              height="32"
              alt="VoiceGecko"
              className="inline-block align-middle sm:ml-2"
            />
          </Heading>

          {/* Welcome Gecko Mascot */}
          <Section className="mb-4 text-center sm:mb-6">
            <Img
              src={welcomeGeckoUrl}
              height="120"
              alt="VoiceGecko mascot holding welcome sign"
              className="mx-auto"
            />
          </Section>

          <Text className="mb-3 px-2 text-lg leading-6 sm:mb-4 sm:px-0 sm:leading-7">
            Thanks for joining{name ? `, ${name}` : ""}! You're now part of a
            community that's transforming how we interact with technology
            through voice.
          </Text>

          <Text className="mb-5 px-2 text-base leading-6 text-gray-700 sm:mb-7 sm:px-0">
            VoiceGecko provides instant, accurate voice-to-text transcription
            that works everywhere. Whether you're writing emails, taking notes,
            or coding, just speak and watch your words appear.
          </Text>

          {/* Tips Section */}
          <Section className="mx-2 mb-5 rounded-md bg-gray-50 p-3 sm:mx-0 sm:mb-7 sm:p-6">
            <Heading className="mb-3 text-base font-semibold text-[#1d1c1d] sm:mb-3 sm:text-lg">
              💡 Pro Tips for Best Results
            </Heading>
            <ul className="space-y-2 pl-4 text-sm leading-5 text-gray-700 sm:space-y-2 sm:pl-5 sm:leading-6">
              <li>Speak clearly and at a natural pace</li>
              <li>
                Start recording with push-to-dictate, toggle recording, or click
                the Gecko bar
              </li>
              <li>
                Try it in different apps - email, documents, chat, even code
                editors!
              </li>
              <li>Don't like the Gecko bar? You can disable it in settings</li>
              <li>
                Add words to your dictionary in the desktop app to fix recurring
                transcription errors
              </li>
            </ul>
          </Section>

          {/* Resources Section */}
          <Section className="mb-5 px-2 sm:mb-7 sm:px-0">
            <Text className="mb-3 text-base leading-6 sm:mb-4">
              Need help getting started? We've got you covered:
            </Text>
            <Text className="text-sm leading-6">
              <Link
                className="text-blue-600 underline hover:text-blue-800"
                href="mailto:support@voicegecko.io?subject=Need Help"
              >
                Contact Support
              </Link>
              {" • "}
              <Link
                className="text-blue-600 underline hover:text-blue-800"
                href="https://discord.gg/BFxNQCzZjB"
              >
                Discord Community
              </Link>
            </Text>
          </Section>

          <Text className="px-2 text-base leading-6 text-black sm:px-0">
            Ready to experience the future of voice-to-text? Let's get started!
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default WelcomeTemplate;
