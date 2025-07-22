"use client";

import { AlertTriangle, Info, MessageCircle } from "lucide-react";
import { FaApple, FaWindows } from "react-icons/fa";

import VoiceGeckoLogo from "@acme/ui/components/logos/logo-full";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acme/ui/components/ui/dialog";

import type { DownloadsData } from "~/lib/downloads-utils";
import { getPrimaryDownload } from "~/lib/downloads-utils";

interface PlatformConfig {
  platform: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  systemRequirements: {
    title: string;
    requirements: string[];
  };
}

const platformConfigs: PlatformConfig[] = [
  {
    platform: "windows",
    title: "Windows",
    description:
      "The fastest and most accurate voice dictation experience is here. Flow on Windows.",
    icon: FaWindows,
    systemRequirements: {
      title: "Windows System Requirements",
      requirements: [
        "Windows 10 64-bit or later",
        "Intel i3 or AMD Ryzen 3 or better",
        "Minimum 4GB of RAM, 8GB recommended",
        "500MB free space for installation and caching",
        "Built-in or external microphone required for voice input",
        "Internet connection",
      ],
    },
  },
  {
    platform: "macos",
    title: "Mac OS",
    description:
      "Flow for desktop runs in the background and lets you voice dictate in every application.",
    icon: FaApple,
    systemRequirements: {
      title: "macOS System Requirements",
      requirements: [
        "Any Mac with Apple or Intel silicon",
        "macOS 11 or newer",
        "500MB of free space for installation and caching",
        "A microphone, built-in or external, required for voice input",
        "An internet connection",
      ],
    },
  },
];

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-4 flex justify-center">
        <AlertTriangle className="text-destructive h-12 w-12" />
      </div>
      <h3 className="mb-2 text-lg font-medium">Unable to Load Downloads</h3>
      <p className="text-muted-foreground mb-4 text-sm">{error}</p>
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

interface DownloadsPageClientProps {
  downloadsData: DownloadsData | null;
  error?: string;
}

export default function DownloadsPageClient({
  downloadsData,
  error,
}: DownloadsPageClientProps) {
  const handleRetry = () => {
    // For server-side errors, refresh the page
    window.location.reload();
  };

  return (
    <div className="bg-background min-h-screen">
      <main className="container mx-auto max-w-6xl px-4 py-16">
        {/* Header Section */}
        <div className="mb-16 text-center">
          <div className="mb-8 flex justify-center">
            <VoiceGeckoLogo className="h-12" />
          </div>
          <h1 className="mb-4 text-4xl font-bold">Download VoiceGecko</h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Experience seamless voice-to-text conversion with privacy-first,
            AI-powered accuracy.
          </p>
        </div>

        {/* Content Section */}
        <div className="mx-auto mb-16 max-w-4xl">
          {error && <ErrorDisplay error={error} onRetry={handleRetry} />}

          {downloadsData && !error && (
            <div className="grid gap-8 md:grid-cols-2">
              {platformConfigs.map((config) => {
                const IconComponent = config.icon;
                const platformData =
                  downloadsData.platforms[
                    config.platform as keyof typeof downloadsData.platforms
                  ];
                const primaryDownload = getPrimaryDownload(platformData);

                return (
                  <Card
                    key={config.platform}
                    className="border-0 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <CardHeader className="pb-6">
                      <CardTitle className="text-2xl font-medium">
                        {config.title}
                      </CardTitle>
                      <CardAction>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Info className="text-muted-foreground h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                {config.systemRequirements.title}
                              </DialogTitle>
                              <DialogDescription>
                                Minimum requirements to run VoiceGecko on{" "}
                                {config.title}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              <ul className="space-y-2">
                                {config.systemRequirements.requirements.map(
                                  (req, index) => (
                                    <li
                                      key={index}
                                      className="flex items-start gap-2"
                                    >
                                      <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#6E9C4A]" />
                                      <span className="text-sm">{req}</span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardAction>
                      <CardDescription className="text-base leading-relaxed">
                        {config.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      {platformData.available && primaryDownload ? (
                        <Button
                          className="h-12 w-full bg-gradient-to-r from-[#6E9C4A] to-[#5A8038] font-medium text-white shadow-lg transition-all duration-300 hover:from-[#5A8038] hover:to-[#4A6B2F] hover:shadow-xl"
                          onClick={() => {
                            // Trigger download
                            const link = document.createElement("a");
                            link.href = primaryDownload.url;
                            link.download = primaryDownload.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);

                            // Redirect to thank you page after short delay
                            if (config.platform === "windows") {
                              setTimeout(() => {
                                window.location.href =
                                  "/downloads/windows/thank-you";
                              }, 1000);
                            }
                          }}
                        >
                          <IconComponent className="h-4 w-4" />
                          Download for {config.title}
                        </Button>
                      ) : (
                        <Button
                          disabled
                          className="bg-muted text-muted-foreground h-12 w-full font-medium"
                        >
                          <IconComponent className="mr-3 h-4 w-4" />
                          Coming Soon
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Join the Community Section */}
        <div className="mx-auto max-w-4xl">
          <Card className="border-0 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Join the Community</p>
                <p className="text-muted-foreground text-sm">
                  Connect with other VoiceGecko users and get support
                </p>
              </div>
              <Button
                className="bg-[#5865F2] font-medium text-white hover:bg-[#4752C4]"
                asChild
              >
                <a
                  href="https://discord.gg/BFxNQCzZjB"
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Join our Discord
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
