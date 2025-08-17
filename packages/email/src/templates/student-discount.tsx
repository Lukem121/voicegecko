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
} from '@react-email/components';

import { DarkModeAwareLogoFull } from '../components/dark-mode-aware-logo-full';
import { DarkModeEmailHead } from '../components/dark-mode-email-head';
import { EmailFooter } from '../components/email-footer';

interface StudentDiscountEmailProps {
  couponCode: string;
  discountPercentage: string;
  redemptionUrl?: string;
}

const studentGeckoUrl =
  'https://90yklj7887.ufs.sh/f/Wzb1OBsC8B6ZcQyRTazBT5UxRZaDh7eC29OQc6zNA04G8qLw';

export const StudentDiscountTemplate = ({
  couponCode,
  discountPercentage,
  redemptionUrl = 'https://www.voicegecko.io/pricing',
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

          <Heading className="my-4 px-2 font-bold text-2xl text-[#1d1c1d] leading-tight sm:my-7 sm:px-0 sm:text-3xl">
            Student Discount for VoiceGecko
          </Heading>

          <Text className="mb-3 px-2 text-lg leading-6 sm:mb-4 sm:px-0 sm:leading-7">
            Great news! Your student status has been verified and you're
            eligible for our exclusive student discount.
          </Text>

          <Text className="mb-5 px-2 text-base text-gray-700 leading-6 sm:mb-6 sm:px-0">
            As a student, we know every dollar counts. That's why we're excited
            to offer you <strong>{discountPercentage}% off</strong> VoiceGecko
            Pro to help power your studies with accurate voice-to-text
            transcription.
          </Text>

          {/* Coupon Code Section */}
          <Section className="mx-2 mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:mx-0 sm:mb-6">
            <div className="px-4 py-4 text-center sm:px-6 sm:py-5">
              <Text className="mb-2 font-semibold text-gray-500 text-xs uppercase tracking-widest">
                Your Coupon Code
              </Text>
              <div className="mb-3 rounded-md border-2 border-gray-300 border-dashed bg-gray-50 px-3 py-2 sm:mb-4 sm:px-4 sm:py-3">
                <Text className="font-bold font-mono text-gray-900 text-xl tracking-wider sm:text-2xl">
                  {couponCode}
                </Text>
              </div>
              <Link
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-green-600 px-6 py-3 text-center font-semibold text-white no-underline transition-colors hover:bg-green-700 sm:px-8"
                href={redemptionUrl}
                style={{ minHeight: '44px' }}
              >
                Claim Discount
              </Link>
            </div>
          </Section>

          {/* How to Use Section */}
          <Section className="mx-2 mb-5 rounded-md bg-blue-50 p-3 sm:mx-0 sm:mb-7 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <Heading className="mb-3 font-semibold text-[#1d1c1d] text-base sm:mb-4 sm:text-lg">
                  📝 How to Use Your Discount
                </Heading>
                <ol className="space-y-2 pl-4 text-gray-700 text-sm leading-5 sm:pl-5 sm:leading-6">
                  <li className="flex items-start">
                    <span className="mr-3 font-semibold text-blue-600">1.</span>
                    <span>Click the "Claim Discount" button above</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 font-semibold text-blue-600">2.</span>
                    <span>Choose your VoiceGecko Pro plan</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 font-semibold text-blue-600">3.</span>
                    <span>
                      Enter coupon code <strong>{couponCode}</strong> at
                      checkout
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 font-semibold text-blue-600">4.</span>
                    <span>
                      Enjoy {discountPercentage}% off your subscription!
                    </span>
                  </li>
                </ol>
              </div>
              <div className="mt-4 text-center sm:mt-0 sm:ml-4 sm:flex-shrink-0">
                <Img
                  alt="VoiceGecko mascot with graduation cap"
                  className="mx-auto"
                  height="70"
                  src={studentGeckoUrl}
                />
              </div>
            </div>
          </Section>

          <Text className="px-2 text-base text-black leading-6 sm:px-0">
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
