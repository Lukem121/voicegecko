import AIVoiceSection from './_landing/ai-voice-section';
import AppScreenshotSection from './_landing/app-screenshot-section';
import FinalCtaSection from './_landing/final-cta';
import Footer from './_landing/footer';
import GeckoBarSection from './_landing/geckobar-section';
import Header from './_landing/header';
import HeroSection from './_landing/hero-section';
import RiveGeckoPopup from './_landing/rive-gecko-popup';
import SocialProofSection from './_landing/social-proof-section';
import SpeedComparisonSection from './_landing/speed-comparison-section';
import StickyCta from './_landing/sticky-cta';
import TalkToAISection from './_landing/talk-to-ai-section';
import TranscriptionFeaturesSection from './_landing/transcription-features-section';
export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <Header />

      <main>
        {/* Hero */}
        <HeroSection />

        {/* Social proof and integrations */}
        <SocialProofSection />

        {/* App screenshot */}
        <AppScreenshotSection />

        {/* Speed section */}
        <SpeedComparisonSection />

        {/* GeckoBar section */}
        <GeckoBarSection />

        {/* AI + Voice */}
        <AIVoiceSection />

        {/* Talk to AI */}
        <TalkToAISection />

        {/* Transcription Features */}
        <TranscriptionFeaturesSection />

        {/* Final CTA */}
        <FinalCtaSection />

        <Footer />

        <StickyCta />

        <RiveGeckoPopup />
      </main>
    </div>
  );
}
