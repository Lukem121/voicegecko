'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@acme/ui/components/ui/dialog';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import SectionHeader from '~/app/_landing/section-header';
import SectionWrapper from '~/app/_landing/section-wrapper';

type Step = {
  stepNumber: number;
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
};

function StepCard({
  stepNumber,
  title,
  description,
  imageSrc,
  imageAlt,
}: Step) {
  return (
    <Card className="flex h-full flex-col bg-neutral-50 text-foreground dark:bg-zinc-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {stepNumber}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>

      <CardContent className="mt-auto">
        {imageSrc ? (
          <div
            className="relative w-full overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-zinc-900"
            style={{ aspectRatio: '1.308 / 1' }}
          >
            <Image
              alt={imageAlt || title}
              className="object-contain"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              src={imageSrc}
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-neutral-300 border-dashed bg-neutral-100 text-muted-foreground dark:border-neutral-700 dark:bg-zinc-900">
            <span className="text-xs">Screenshot placeholder</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DownloadSuccessPage() {
  const searchParams = useSearchParams();

  const osTypeParam = (searchParams.get('os') || 'windows').toLowerCase();
  const osType =
    osTypeParam === 'windows' ||
    osTypeParam === 'mac' ||
    osTypeParam === 'linux'
      ? (osTypeParam as 'windows' | 'mac' | 'linux')
      : 'windows';
  const fileName = searchParams.get('file_name') || 'VoiceGeckoSetup.msi';
  const fileUrl = searchParams.get('file_url') || undefined;

  const steps: Step[] = useMemo(() => {
    if (osType === 'mac') {
      return [
        {
          stepNumber: 1,
          title: 'Open the installer',
          description:
            'Find the downloaded file in your Downloads folder and open the .dmg.',
          imageSrc: '/assets/images/Installation-steps/find-download.png',
          imageAlt: 'Find download in Downloads folder',
        },
        {
          stepNumber: 2,
          title: 'Drag to Applications',
          description:
            'Drag Voice Gecko into Applications and finish security prompts.',
          imageSrc: '/assets/images/Installation-steps/follow-installation.png',
          imageAlt: 'Follow installation steps',
        },
        {
          stepNumber: 3,
          title: 'Launch Voice Gecko',
          description:
            'Open from Applications or Spotlight. Grant microphone access when asked.',
          imageSrc: '/assets/images/Installation-steps/run-app.png',
          imageAlt: 'Run the app',
        },
      ];
    }

    if (osType === 'linux') {
      return [
        {
          stepNumber: 1,
          title: 'Open the package',
          description:
            'Find the downloaded package in your Downloads folder and open it.',
          imageSrc: '/assets/images/Installation-steps/find-download.png',
          imageAlt: 'Find download in Downloads folder',
        },
        {
          stepNumber: 2,
          title: 'Follow your distro installer',
          description:
            'Use your package manager’s prompts to complete the installation.',
          imageSrc: '/assets/images/Installation-steps/follow-installation.png',
          imageAlt: 'Follow installation steps',
        },
        {
          stepNumber: 3,
          title: 'Launch Voice Gecko',
          description:
            'Open from your app launcher. Grant microphone permissions if prompted.',
          imageSrc: '/assets/images/Installation-steps/run-app.png',
          imageAlt: 'Run the app',
        },
      ];
    }

    // Default: Windows
    return [
      {
        stepNumber: 1,
        title: 'Open the installer',
        description:
          'Go to your Downloads folder and double‑click the .msi file.',
        imageSrc: '/assets/images/Installation-steps/find-download.png',
        imageAlt: 'Find download in Downloads folder',
      },
      {
        stepNumber: 2,
        title: 'Follow the setup wizard',
        description:
          'Accept the prompts to complete installation. It only takes a moment.',
        imageSrc: '/assets/images/Installation-steps/follow-installation.png',
        imageAlt: 'Follow installation steps',
      },
      {
        stepNumber: 3,
        title: 'Launch Voice Gecko',
        description:
          'Click Finish to open the app, or start it later from the Start menu.',
        imageSrc: '/assets/images/Installation-steps/run-app.png',
        imageAlt: 'Run the app',
      },
    ];
  }, [osType]);

  return (
    <div className="bg-background">
      <SectionWrapper className="py-2 md:py-10" useXPadding={false}>
        <div className="relative z-10 w-full rounded-3xl bg-[#F9F8F6] p-4 md:p-12 lg:p-16 dark:bg-zinc-900">
          <div
            className="-inset-x-40 -top-16 pointer-events-none absolute bottom-[-8rem] rounded-[4rem] blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(124, 228, 93, 0.25), transparent)',
            }}
          />

          <div className="relative">
            <SectionHeader
              description="Finish setup in three quick steps."
              descriptionWidth="normal"
              eyebrow="You're moments away"
              heading="Thanks — your download is on the way!"
              headingSize="xl"
            />

            <div className="mb-6 text-center text-muted-foreground text-sm">
              <span>Download didn't start?</span>{' '}
              {fileUrl ? (
                <a
                  className="underline underline-offset-4 hover:text-foreground"
                  download={fileName}
                  href={fileUrl}
                >
                  Download now
                </a>
              ) : (
                <Link
                  className="underline underline-offset-4 hover:text-foreground"
                  href="/download"
                >
                  Open downloads page
                </Link>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <StepCard key={step.stepNumber} {...step} />
              ))}
            </div>

            {/* SmartScreen helper for Windows */}
            {osType === 'windows' && (
              <div className="mt-8 text-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="mx-auto rounded-full bg-neutral-800 px-4 py-2 text-white hover:bg-neutral-700"
                      type="button"
                    >
                      Seeing a Windows protection message?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Windows protected your PC</DialogTitle>
                      <DialogDescription>
                        Windows SmartScreen may show this prompt when it hasn't
                        yet recognized the app's publisher. To continue:
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                      <div>
                        <p className="mb-2 text-left font-medium text-sm">
                          1) Click More info
                        </p>
                        <div
                          className="relative w-full overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-zinc-900"
                          style={{ aspectRatio: '1.905 / 1' }}
                        >
                          <Image
                            alt="Windows protection dialog showing More info"
                            className="object-contain"
                            height={282.54}
                            src="/assets/images/Installation-steps/windows-protection-step-1.png"
                            width={538.19}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-left font-medium text-sm">
                          2) Click Run anyway
                        </p>
                        <div
                          className="relative w-full overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-zinc-900"
                          style={{ aspectRatio: '1.905 / 1' }}
                        >
                          <Image
                            alt="Windows protection dialog showing Run anyway"
                            className="object-contain"
                            height={282.54}
                            src="/assets/images/Installation-steps/windows-protection-step-2.png"
                            width={538.19}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-muted-foreground text-xs">
                      This is normal for newly distributed apps. Once Windows
                      recognizes the publisher, this prompt will disappear.
                    </p>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
