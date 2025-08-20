'use client';

import { log } from '@acme/observability/log';
import {
  Card,
  CardAction,
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
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaAndroid, FaApple, FaLinux, FaWindows } from 'react-icons/fa';
import { HiInformationCircle } from 'react-icons/hi';
import { HiGlobeAlt } from 'react-icons/hi2';
import { SiApple } from 'react-icons/si';
import { useGTM } from '~/hooks/use-gtm';
import type { DownloadsData } from '~/lib/downloads-utils';
import { SOURCES } from '~/lib/gtm/constants';

type PlatformCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  downloads: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  downloadError?: string;
  osType: 'windows' | 'mac' | 'linux' | 'unknown';
};

type VotingCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const systemRequirements = {
  'Mac OS': {
    title: 'Minimum System Requirements (macOS)',
    requirements: [
      'Any Mac with Apple or Intel Silicon',
      'Mac OS 11.0 or newer',
      'Storage: 500MB free space for installation + caching',
      'Microphone: Built-in or external microphone required for voice input',
      'Internet connection',
    ],
  },
  Windows: {
    title: 'Minimum System Requirements (Windows)',
    requirements: [
      'Windows 10 (64-bit) or later',
      'Intel Core i3 (or AMD Ryzen 3) or better',
      'Minimum 4GB RAM (8GB recommended)',
      '500MB free space for installation + caching',
      'Built-in or external microphone required for voice input',
      'Internet connection',
    ],
  },
  Linux: {
    title: 'Minimum System Requirements (Linux)',
    requirements: [
      'Ubuntu 20.04 or equivalent distribution',
      'Intel Core i3 (or AMD Ryzen 3) or better',
      'Minimum 4GB RAM (8GB recommended)',
      '500MB free space for installation + caching',
      'Built-in or external microphone required for voice input',
      'Internet connection',
    ],
  },
  iOS: {
    title: 'Minimum System Requirements (iOS)',
    requirements: [
      'iPhone or iPad',
      'iOS 15.0 or later',
      'Storage: 200MB free space',
      'Built-in microphone',
      'Internet connection',
    ],
  },
  Android: {
    title: 'Minimum System Requirements (Android)',
    requirements: [
      'Android 8.0 or later',
      'Minimum 3GB RAM (4GB recommended)',
      'Storage: 200MB free space',
      'Built-in or external microphone',
      'Internet connection',
    ],
  },
  Web: {
    title: 'Minimum System Requirements (Web)',
    requirements: [
      'Modern web browser (Chrome, Firefox, Safari, Edge)',
      'Microphone permissions enabled',
      'Stable internet connection',
      'JavaScript enabled',
    ],
  },
} as const;

function VotingCard({ title, description }: VotingCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showVoteAnimation, setShowVoteAnimation] = useState(false);

  const handleVote = () => {
    if (hasVoted) {
      return;
    }

    setHasVoted(true);
    setShowVoteAnimation(true);

    // Reset animation after it completes
    setTimeout(() => setShowVoteAnimation(false), 800);

    log.info(`Vote cast for ${title} platform`);
  };

  const requirements =
    systemRequirements[title as keyof typeof systemRequirements];

  return (
    <Card className="flex h-48 flex-col bg-neutral-50 text-foreground">
      <CardHeader>
        <CardTitle className="text-foreground text-lg dark:text-black">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs dark:text-black">
          {description}
        </CardDescription>
        <CardAction>
          <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
            <DialogTrigger asChild>
              <button
                className="cursor-pointer rounded-full p-1 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                type="button"
              >
                <HiInformationCircle className="h-4 w-4" />
                <span className="sr-only">View system requirements</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{requirements.title}</DialogTitle>
                <DialogDescription>
                  Make sure your system meets these requirements for optimal
                  performance.
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-2 text-sm">
                {requirements.requirements.map((req) => (
                  <li className="flex items-start gap-2" key={req}>
                    <span className="mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>

      <CardContent className="mt-auto">
        <motion.div className="relative">
          <motion.button
            animate={showVoteAnimation ? { scale: [1, 1.02, 1] } : {}}
            className={`flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold text-sm transition-all ${
              hasVoted
                ? 'cursor-default bg-muted text-muted-foreground dark:text-white'
                : 'cursor-pointer bg-muted text-foreground hover:bg-muted/80 dark:text-white'
            }`}
            disabled={hasVoted}
            onClick={handleVote}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            type="button"
            whileTap={hasVoted ? {} : { scale: 0.98 }}
          >
            <span>
              {hasVoted ? 'Thanks for voting!' : `Vote to build for ${title}`}
            </span>
          </motion.button>
        </motion.div>
      </CardContent>
    </Card>
  );
}

function PlatformCard({
  title,
  description,
  icon,
  available,
  downloads,
  downloadError,
  osType,
}: PlatformCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { trackEvent } = useGTM();

  const handleDownload = (download: {
    name: string;
    url: string;
    size: number;
  }) => {
    if (!available) {
      alert(`${title} download currently unavailable`);
      return;
    }

    if (downloadError) {
      alert(downloadError);
      return;
    }

    trackEvent({
      event: 'download_completed',
      source: SOURCES.DOWNLOAD_PAGE,
      os_type: osType,
      file_name: download.name,
      timestamp: new Date().toISOString(),
    });

    const link = document.createElement('a');
    link.href = download.url;
    link.download = download.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    log.info(`Download initiated: ${download.name}`);
  };

  const getDownloadButtonText = (download: {
    name: string;
    url: string;
    size: number;
  }) => {
    if (title === 'Mac OS') {
      // Detect if it's Apple Silicon or Intel based on the filename
      if (
        download.name.toLowerCase().includes('aarch64') ||
        download.name.toLowerCase().includes('arm64')
      ) {
        return 'Download Apple Silicon Mac';
      }
      if (
        download.name.toLowerCase().includes('x86_64') ||
        download.name.toLowerCase().includes('intel')
      ) {
        return 'Download Apple Intel Mac';
      }
      return 'Download for Mac';
    }
    return `Download for ${title}`;
  };

  const requirements =
    systemRequirements[title as keyof typeof systemRequirements];

  return (
    <Card className="flex h-64 flex-col border-neutral-800 bg-neutral-900 text-white">
      <CardHeader className="">
        <CardTitle className="text-2xl text-white">{title}</CardTitle>
        <CardDescription className="text-base text-white/80">
          {description}
        </CardDescription>
        <CardAction>
          <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
            <DialogTrigger asChild>
              <button
                className="cursor-pointer rounded-full p-1 text-white/60 transition-colors hover:text-white"
                type="button"
              >
                <HiInformationCircle className="h-5 w-5" />
                <span className="sr-only">View system requirements</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{requirements.title}</DialogTitle>
                <DialogDescription>
                  Make sure your system meets these requirements for optimal
                  performance.
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-2 text-sm">
                {requirements.requirements.map((req) => (
                  <li className="flex items-start gap-2" key={req}>
                    <span className="mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>

      <CardContent className="mt-auto">
        <div className="space-y-3">
          {(() => {
            // For Windows, prefer .msi over .exe
            let filteredDownloads = downloads;

            if (title === 'Windows') {
              const msiDownloads = downloads.filter((download) =>
                download.name.endsWith('.msi')
              );
              if (msiDownloads.length > 0) {
                filteredDownloads = msiDownloads;
              } else {
                filteredDownloads = downloads.slice(0, 1); // fallback to first download if no .msi
              }
            }

            return filteredDownloads.map((download, index) => (
              <button
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 font-semibold text-white transition-all hover:bg-primary/90"
                key={`${download.name}-${index}`}
                onClick={() => handleDownload(download)}
                type="button"
              >
                {icon}
                <span>{getDownloadButtonText(download)}</span>
              </button>
            ));
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DownloadCards({
  downloadsData,
  downloadError,
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
}) {
  const downloadPlatforms = [
    {
      key: 'windows' as const,
      title: 'Windows',
      description:
        'The easiest way to dictate on Windows — no typos, no slowdown, just your words.',
      icon: <FaWindows />,
      osType: 'windows' as const,
    },
  ];

  const votingPlatforms = [
    {
      title: 'Web',
      description:
        'Use Voice Gecko directly in your browser without installation.',
      icon: <HiGlobeAlt />,
    },
    {
      title: 'Android',
      description: 'Voice dictation on Android phones and tablets.',
      icon: <FaAndroid />,
    },
    {
      title: 'Linux',
      description: 'Voice dictation for Linux distributions.',
      icon: <FaLinux />,
    },
    {
      title: 'Mac OS',
      description: 'Voice dictation for macOS desktop and laptop.',
      icon: <FaApple />,
    },
    {
      title: 'iOS',
      description: 'Voice dictation on iPhone and iPad.',
      icon: <SiApple />,
    },
  ];

  // Get available download platforms
  const availableDownloads = downloadPlatforms.filter((platform) => {
    const platformData = downloadsData?.platforms[platform.key];
    return platformData?.available && platformData.assets.length > 0;
  });

  return (
    <div className="mt-6 space-y-8 md:mt-12 md:space-y-16">
      {/* Download Section */}
      {availableDownloads.length > 0 && (
        <div>
          <div className="mb-3 text-left sm:mb-8">
            <h2 className="mb-2 font-semibold text-2xl tracking-tight">
              Available Downloads
            </h2>
            <p className="text-muted-foreground">
              Download Voice Gecko for your platform
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {downloadPlatforms.map((platform) => {
              const platformData = downloadsData?.platforms[platform.key];
              const isAvailable =
                platformData?.available && platformData.assets.length > 0;

              if (!isAvailable) {
                return null;
              }

              return (
                <PlatformCard
                  available={true}
                  description={platform.description}
                  downloadError={downloadError}
                  downloads={platformData.assets}
                  icon={platform.icon}
                  key={platform.key}
                  osType={platform.osType}
                  title={platform.title}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Voting Section */}
      <div>
        <div className="mb-3 text-left sm:mb-8">
          <h2 className="mb-2 font-semibold text-2xl tracking-tight">
            Vote for Future Platforms
          </h2>
          <p className="text-muted-foreground">
            Help us prioritize which platforms to build next
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {votingPlatforms.map((platform) => (
            <VotingCard
              description={platform.description}
              icon={platform.icon}
              key={platform.title}
              title={platform.title}
            />
          ))}
        </div>
      </div>

      {/* Feature info */}
      {availableDownloads.length > 0 && (
        <div className="text-left">
          <p className="text-muted-foreground text-sm">
            All versions include: Lightning fast transcription • Global shortcut
            access • Privacy mode
          </p>
        </div>
      )}
    </div>
  );
}
