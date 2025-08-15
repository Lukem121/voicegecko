import Image from 'next/image';
import SectionWrapper from './section-wrapper';

export default function AppScreenshotSection() {
  return (
    <SectionWrapper className="mx-auto max-w-7xl px-4 pt-8 pb-20 md:px-6 lg:px-12">
      <div className="relative mx-auto max-w-4xl">
        <div
          className="-inset-x-40 -top-16 pointer-events-none absolute bottom-[-8rem] rounded-[4rem] blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(124, 228, 93, 0.25), transparent)',
          }}
        />
        <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-black/5">
          <Image
            alt="VoiceGecko desktop app showing the transcription interface"
            className="h-auto w-full select-none"
            height={1080}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
            src="/assets/images/app-screenshots/light-recording.png"
            width={1728}
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
