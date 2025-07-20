import { Info, MessageCircle } from "lucide-react";
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

export default function DownloadsPage() {
  const downloadOptions = [
    {
      platform: "Windows",
      title: "Windows",
      description:
        "The fastest and most accurate voice dictation experience is here. Flow on Windows.",
      available: true,
      icon: FaWindows,
      downloads: [{ label: "Download for Windows", href: "#" }],
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
      platform: "macOS",
      title: "Mac OS",
      description:
        "Flow for desktop runs in the background and lets you voice dictate in every application.",
      available: true,
      icon: FaApple,
      downloads: [
        { label: "Download Apple Silicon Mac", href: "#" },
        { label: "Download Apple Intel Mac", href: "#" },
      ],
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

  return (
    <div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
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

        {/* Download Cards */}
        <div className="mx-auto mb-16 grid max-w-4xl gap-8 md:grid-cols-2">
          {downloadOptions.map((option) => {
            const IconComponent = option.icon;

            return (
              <Card
                key={option.platform}
                className="border-0 shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl font-medium">
                    {option.title}
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
                            {option.systemRequirements.title}
                          </DialogTitle>
                          <DialogDescription>
                            Minimum requirements to run VoiceGecko on{" "}
                            {option.platform}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <ul className="space-y-2">
                            {option.systemRequirements.requirements.map(
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
                    {option.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {option.downloads?.map((download, index) => (
                    <Button
                      key={index}
                      className="h-12 w-full bg-gradient-to-r from-[#6E9C4A] to-[#5A8038] font-medium text-white shadow-lg transition-all duration-300 hover:from-[#5A8038] hover:to-[#4A6B2F] hover:shadow-xl"
                      asChild
                    >
                      <a
                        href={download.href}
                        className="flex items-center justify-center gap-3"
                      >
                        <IconComponent className="h-4 w-4" />
                        {download.label}
                      </a>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            );
          })}
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
                <a href="#" className="flex items-center gap-2">
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
