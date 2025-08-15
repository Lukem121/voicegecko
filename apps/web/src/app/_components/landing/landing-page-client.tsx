'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import type { DownloadsData } from '~/lib/downloads-utils';
import RiveGeckoPopup from './components/rive-gecko-popup';
import FaqSection from './sections/faq';
import FinalCtaSection from './sections/final-cta';
import FooterSection from './sections/footer';
import HeroSection from './sections/hero';
import Navigation from './sections/navigation';
import OutcomesSection from './sections/outcomes';
import PerformanceSection from './sections/performance';
import PersonalDictionarySection from './sections/personal-dictionary';
import PersonasSection from './sections/personas';
import PricingSection from './sections/pricing';
import WhySection from './sections/why';
import WorksEverywhereSection from './sections/works-everywhere';

export default function LandingPageClient({
  downloadsData,
  downloadError,
  prices,
  pricingError,
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
  prices: Record<string, PriceWithMetadata> | null;
  pricingError?: string;
}) {
  return (
    <div className="relative pt-20">
      <Navigation downloadError={downloadError} downloadsData={downloadsData} />
      <HeroSection
        downloadError={downloadError}
        downloadsData={downloadsData}
      />
      <WhySection />
      <OutcomesSection />
      <PerformanceSection />
      <WorksEverywhereSection />
      <PersonalDictionarySection />
      <PersonasSection />
      <PricingSection prices={prices} pricingError={pricingError} />
      <FaqSection />
      <FinalCtaSection
        downloadError={downloadError}
        downloadsData={downloadsData}
      />
      <FooterSection />
      <RiveGeckoPopup className="mt-[-4rem]" />
    </div>
  );
}
