'use client';
import { useIsMobile } from '@acme/ui/hooks/use-mobile';
import VideoWithPoster from '~/components/video/video-with-poster';
import GeckoWithCursorTracking from './gecko-with-cursor-tracking';
import SectionWrapper from './section-wrapper';

export default function AppScreenshotSection() {
  const isMobile = useIsMobile();
  return (
    <SectionWrapper className="">
      <div className="relative mx-auto max-w-4xl">
        {!isMobile && (
          <GeckoWithCursorTracking className="-mb-7 z-10 cursor-pointer self-end justify-self-end" />
        )}
        <div
          className="-inset-x-40 -top-16 pointer-events-none absolute bottom-[-8rem] rounded-[4rem] blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(124, 228, 93, 0.25), transparent)',
          }}
        />
        <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-black/5">
          <VideoWithPoster
            className="aspect-[16/9]"
            posterAlt="VoiceGecko desktop app showing the dictation interface"
            posterSrc="/assets/images/app-screenshots/light-recording.png"
            videoUrl="https://d3m1o0v7ywfar9.cloudfront.net/0901(6).mp4"
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
