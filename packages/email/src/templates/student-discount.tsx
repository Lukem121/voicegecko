import {
  Body,
  Container,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { DarkModeAwareLogo } from "../components/dark-mode-aware-logo";
import { DarkModeAwareLogoFull } from "../components/dark-mode-aware-logo-full";
import { DarkModeEmailHead } from "../components/dark-mode-email-head";
import { EmailFooter } from "../components/email-footer";

interface StudentDiscountEmailProps {
  couponCode: string;
  discountPercentage: string;
  redemptionUrl?: string;
}

const studentGeckoUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZVoDCkuyBN8axuchVvfPCJEzF0UmSTXdir9Ot";

export const StudentDiscountTemplate = ({
  couponCode,
  discountPercentage,
  redemptionUrl = "https://voicegecko.io/pricing",
}: StudentDiscountEmailProps) => (
  <Tailwind>
    <Html>
      <DarkModeEmailHead />
      <Preview>
        Your {discountPercentage}% student discount code for VoiceGecko is here!
      </Preview>
      <Body className="mx-auto bg-white px-2 font-sans sm:px-4">
        <Container className="mx-auto w-[580px] max-w-full py-3 pb-8 sm:py-5 sm:pb-12">
          <Section className="mt-4 px-2 sm:mt-8 sm:px-0">
            <DarkModeAwareLogoFull />
          </Section>

          <Heading className="my-4 px-2 text-2xl leading-tight font-bold text-[#1d1c1d] sm:my-7 sm:px-0 sm:text-3xl">
            Student Discount for VoiceGecko
          </Heading>

          <Text className="mb-3 px-2 text-lg leading-6 sm:mb-4 sm:px-0 sm:leading-7">
            Great news! Your student status has been verified and you're
            eligible for our exclusive student discount.
          </Text>

          <Text className="mb-5 px-2 text-base leading-6 text-gray-700 sm:mb-6 sm:px-0">
            As a student, we know every dollar counts. That's why we're excited
            to offer you <strong>{discountPercentage}% off</strong> VoiceGecko
            Pro to help power your studies with accurate voice-to-text
            transcription.
          </Text>

          {/* Coupon Code Section */}
          <Section className="mx-2 mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:mx-0 sm:mb-6">
            <div className="px-4 py-4 text-center sm:px-6 sm:py-5">
              <Text className="mb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Your Coupon Code
              </Text>
              <div className="mb-3 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2 sm:mb-4 sm:px-4 sm:py-3">
                <Text className="font-mono text-xl font-bold tracking-wider text-gray-900 sm:text-2xl">
                  {couponCode}
                </Text>
              </div>
              <Link
                className="inline-block rounded-md bg-green-600 px-6 py-3 text-center font-semibold text-white no-underline transition-colors hover:bg-green-700 sm:px-8"
                href={redemptionUrl}
              >
                Claim Discount
              </Link>
            </div>
          </Section>

          {/* How to Use Section */}
          <Section className="mx-2 mb-5 rounded-md bg-blue-50 p-3 sm:mx-0 sm:mb-7 sm:p-6">
            <table
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={{ borderCollapse: "collapse" }}
            >
              <tr>
                <td valign="top" style={{ paddingRight: "16px" }}>
                  <Heading className="mb-3 text-base font-semibold text-[#1d1c1d] sm:mb-4 sm:text-lg">
                    📝 How to Use Your Discount
                  </Heading>
                  <ol className="space-y-2 pl-4 text-sm leading-5 text-gray-700 sm:pl-5 sm:leading-6">
                    <li className="flex items-start">
                      <span className="mr-3 font-semibold text-blue-600">
                        1.
                      </span>
                      <span>Click the "Claim Discount" button above</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 font-semibold text-blue-600">
                        2.
                      </span>
                      <span>Choose your VoiceGecko Pro plan</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 font-semibold text-blue-600">
                        3.
                      </span>
                      <span>
                        Enter coupon code <strong>{couponCode}</strong> at
                        checkout
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 font-semibold text-blue-600">
                        4.
                      </span>
                      <span>
                        Enjoy {discountPercentage}% off your subscription!
                      </span>
                    </li>
                  </ol>
                </td>
                <td
                  width="80"
                  valign="bottom"
                  align="right"
                  className="hidden sm:table-cell"
                >
                  <Img
                    src={studentGeckoUrl}
                    height="70"
                    alt="VoiceGecko mascot with graduation cap"
                  />
                </td>
              </tr>
            </table>
          </Section>

          <Text className="px-2 text-base leading-6 text-black sm:px-0">
            Questions about your student discount? We're here to help! Just
            reply to this email or reach out through our support channels.
          </Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default StudentDiscountTemplate;
