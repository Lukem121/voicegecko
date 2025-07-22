import Link from "next/link";
import { Check, Download, FolderOpen, Play } from "lucide-react";
import { FaWindows } from "react-icons/fa";

import VoiceGeckoLogo from "@acme/ui/components/logos/logo-full";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

export default function WindowsThankYouPage() {
  const installationSteps = [
    {
      step: 1,
      title: "Open the Installer",
      description:
        "Locate the downloaded file in your Downloads folder and double-click to run it",
      icon: FolderOpen,
      details: [
        "Look for 'Voice Gecko-[version].msi' in your Downloads folder",
        "Double-click the file to start the installation",
        "Windows may show a security warning - click 'Yes' or 'Run anyway'",
      ],
    },
    {
      step: 2,
      title: "Follow Installation Prompts",
      description:
        "Complete the installation wizard by following the on-screen instructions",
      icon: Download,
      details: [
        "Accept the license agreement",
        "Choose your installation directory (default is recommended)",
        "Click 'Install' and wait for the process to complete",
        "The installer will automatically configure VoiceGecko",
      ],
    },
    {
      step: 3,
      title: "Launch VoiceGecko",
      description: "Open the application and start your voice-to-text journey",
      icon: Play,
      details: [
        "Click 'Finish' when installation completes",
        "VoiceGecko will appear in your Start Menu",
        "Launch the app and complete the initial setup",
        "Grant microphone permissions when prompted",
      ],
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
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <FaWindows className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mb-4 text-4xl font-bold">
            Thank You for Downloading!
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Your download has started. Just a few steps left to get VoiceGecko
            up and running on your Windows computer.
          </p>
        </div>

        {/* Installation Steps */}
        <div className="mx-auto mb-16 max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold">
            Installation Guide
          </h2>
          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
            {installationSteps.map((step) => {
              const IconComponent = step.icon;

              return (
                <Card
                  key={step.step}
                  className="border-0 shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6E9C4A]/10">
                      <IconComponent className="h-8 w-8 text-[#6E9C4A]" />
                    </div>
                    <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#6E9C4A] text-sm font-bold text-white">
                      {step.step}
                    </div>
                    <CardTitle className="text-xl font-medium">
                      {step.title}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* Placeholder for screenshot */}
                    <div className="mb-4 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100">
                      <span className="text-sm text-gray-500">
                        Screenshot placeholder
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {step.details.map((detail, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                        >
                          <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#6E9C4A]" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Help Section */}
        <div className="mx-auto max-w-2xl text-center">
          <Card className="border-0 p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold">Need Help?</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              If you encounter any issues during installation, we're here to
              help.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="outline" asChild>
                <Link href="/downloads">Download Again</Link>
              </Button>
              <Button
                className="bg-[#5865F2] text-white hover:bg-[#4752C4]"
                asChild
              >
                <a href="#" className="flex items-center gap-2">
                  Get Support
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
