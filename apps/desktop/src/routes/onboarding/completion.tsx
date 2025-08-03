import React, { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  BookOpen,
  Check,
  Clipboard,
  ExternalLink,
  Globe,
  MessageCircle,
} from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

import { useOnboarding } from "~/components/onboarding/onboarding-provider";

export const Route = createFileRoute("/onboarding/completion")({
  component: CompletionStep,
});

function CompletionStep() {
  const { markStepCompleted, sendMascotMessage } = useOnboarding();

  const completionActionsPerformed = React.useRef(false);

  useEffect(() => {
    // Prevent running multiple times
    if (completionActionsPerformed.current) return;
    completionActionsPerformed.current = true;

    // Send completion message
    sendMascotMessage({
      content:
        "🎉 Setup complete! You're ready to start transcribing with VoiceGecko.",
      type: "celebration",
      persist: true,
    });

    // Mark step completed
    markStepCompleted("completion", 100);
  }, [markStepCompleted, sendMascotMessage]);

  const handleJoinDiscord = () => {
    void openUrl("https://discord.gg/BFxNQCzZjB");
  };

  const handleUpgradeToPro = () => {
    // TODO: Open upgrade modal or navigate to subscription page
    console.log("Navigate to pro upgrade");
  };

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col">
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Simple Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="mb-2 text-3xl font-medium">🎉 You're All Set!</h1>
            <p className="text-muted-foreground">
              VoiceGecko is ready to transcribe your voice anywhere
            </p>
          </motion.div>

          {/* Main Actions - Two Columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Community */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Join Our Community
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Connect with other VoiceGecko users and get support
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Get help and share tips
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Early access to new features
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Direct feedback to our team
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleJoinDiscord}
                  className="w-full bg-[#5865F2] text-white hover:bg-[#4752C4]"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Join Discord
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Features */}
            <Card>
              <CardHeader>
                <CardTitle>Unlock More Features</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Upgrade to Pro for unlimited transcriptions and advanced
                  features
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Unlimited transcriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Priority transcription queue
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Priority support
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleUpgradeToPro}
                  variant="outline"
                  className="w-full"
                >
                  Learn About Pro
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <Globe className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <h4 className="mb-1 text-sm font-medium">
                        Global Access
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Use your shortcut from any app to transcribe instantly
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clipboard className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <h4 className="mb-1 text-sm font-medium">Auto-Paste</h4>
                      <p className="text-muted-foreground text-xs">
                        Transcribed text automatically appears where you need it
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <BookOpen className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <h4 className="mb-1 text-sm font-medium">
                        Custom Dictionary
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Add business names or tricky words for better accuracy
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
