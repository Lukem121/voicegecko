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
      <Body className="mx-auto bg-white px-4 font-sans">
        <Container className="mx-auto w-[580px] max-w-full py-5 pb-12">
          <Heading className="mt-8 mb-7 text-center text-3xl leading-tight font-bold text-[#1d1c1d]">
            Welcome to{" "}
            <Img
              src={logoTextUrl}
              height="32"
              alt="VoiceGecko"
              className="inline-block align-middle"
            />
            ! 🎉
          </Heading>

          {/* Welcome Gecko Mascot */}
          <Section className="mb-6 text-center">
            <Img
              src={welcomeGeckoUrl}
              height="120"
              alt="VoiceGecko mascot holding welcome sign"
              className="mx-auto"
            />
          </Section>

          <Text className="mb-4 text-lg leading-7">
            Thanks for joining{name ? `, ${name}` : ""}! You're now part of a
            community that's transforming how we interact with technology
            through voice.
          </Text>

          <Text className="mb-7 text-base leading-6 text-gray-700">
            VoiceGecko provides instant, accurate voice-to-text transcription
            that works everywhere. Whether you're writing emails, taking notes,
            or coding, just speak and watch your words appear.
          </Text>

          {/* Tips Section */}
          <Section className="mb-7 rounded-md bg-gray-50 p-6">
            <Heading className="mb-3 text-lg font-semibold text-[#1d1c1d]">
              💡 Pro Tips for Best Results
            </Heading>
            <ul className="text-sm leading-6 text-gray-700">
              <li className="mb-2">Speak clearly and at a natural pace</li>
              <li className="mb-2">
                Start recording with push-to-dictate, toggle recording, or click
                the Gecko bar
              </li>
              <li className="mb-2">
                Try it in different apps - email, documents, chat, even code
                editors!
              </li>
              <li className="mb-2">
                Don't like the Gecko bar? You can disable it in settings
              </li>
              <li className="mb-2">
                Add words to your dictionary in the desktop app to fix recurring
                transcription errors
              </li>
            </ul>
          </Section>

          {/* Resources Section */}
          <Section className="mb-7">
            <Text className="mb-4 text-base leading-6">
              Need help getting started? We've got you covered:
            </Text>
            <Text className="text-sm leading-6">
              <Link
                className="text-blue-600 underline hover:text-blue-800"
                href="mailto:support@voicegecko.io?subject=Need Help"
              >
                💬 Contact Support
              </Link>
              {" • "}
              <Link
                className="text-blue-600 underline hover:text-blue-800"
                href="https://discord.gg/BFxNQCzZjB"
              >
                💬 Discord Community
              </Link>
            </Text>
          </Section>

          <Text className="text-base leading-6 text-black">
            Ready to experience the future of voice-to-text? Let's get started!
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default WelcomeTemplate;
