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

interface StudentDiscountEmailProps {
  couponCode: string;
  discountPercentage: string;
  redemptionUrl?: string;
}

const logoTextUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZyL7b0tqZywrYS8IcuheEG0Tm1fBLgUx9z56J";

const studentGeckoUrl =
  "https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZVoDCkuyBN8axuchVvfPCJEzF0UmSTXdir9Ot";

export const StudentDiscountTemplate = ({
  couponCode,
  discountPercentage,
  redemptionUrl = "https://voicegecko.io/pricing",
}: StudentDiscountEmailProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>
        Your {discountPercentage}% student discount code for VoiceGecko is here!
      </Preview>
      <Body className="mx-auto bg-white px-4 font-sans">
        <Container className="mx-auto w-[580px] max-w-full py-5 pb-12">
          <Heading className="mt-8 mb-6 text-center text-3xl leading-tight font-bold text-[#1d1c1d]">
            Student Discount for{" "}
            <Img
              src={logoTextUrl}
              height="32"
              alt="VoiceGecko"
              className="inline-block align-middle"
            />
            !
          </Heading>

          <Text className="mb-4 text-lg leading-7">
            Great news! Your student status has been verified and you're
            eligible for our exclusive student discount.
          </Text>

          <Text className="text-base leading-6 text-gray-700">
            As a student, we know every dollar counts. That's why we're excited
            to offer you <strong>{discountPercentage}% off</strong> VoiceGecko
            Pro to help power your studies with accurate voice-to-text
            transcription.
          </Text>

          {/* Coupon Code Section */}
          <Section className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-5 text-center">
              <Text className="mb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Your Coupon Code
              </Text>
              <div className="mb-4 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3">
                <Text className="font-mono text-2xl font-bold tracking-wider text-gray-900">
                  {couponCode}
                </Text>
              </div>
              <Link
                className="inline-block rounded-md bg-green-600 px-8 py-3 text-center font-semibold text-white no-underline transition-colors hover:bg-green-700"
                href={redemptionUrl}
              >
                Claim Discount
              </Link>
            </div>
          </Section>

          {/* How to Use Section */}
          <Section className="mb-7 rounded-md bg-blue-50 p-6">
            <table
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={{ borderCollapse: "collapse" }}
            >
              <tr>
                <td valign="top" style={{ paddingRight: "16px" }}>
                  <Heading className="mb-4 text-lg font-semibold text-[#1d1c1d]">
                    📝 How to Use Your Discount
                  </Heading>
                  <ol className="space-y-2 text-sm leading-6 text-gray-700">
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
                <td width="80" valign="bottom" align="right">
                  <Img
                    src={studentGeckoUrl}
                    height="70"
                    alt="VoiceGecko mascot with graduation cap"
                  />
                </td>
              </tr>
            </table>
          </Section>

          <Text className="text-base leading-6 text-black">
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
