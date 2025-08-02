import React, { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, ExternalLink, MessageCircle } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 text-center"
          >
            <h1 className="mb-2 text-3xl font-medium">🎉 You're All Set!</h1>
            <p className="text-muted-foreground">
              Start transcribing anywhere with your push-to-talk shortcut
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Pro Plan Info Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Upgrade to Pro</p>
                      <p className="text-muted-foreground text-sm">
                        Unlock unlimited transcriptions and advanced features
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="grid grid-cols-1 gap-x-3 gap-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="text-xs">Unlimited transcriptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="text-xs">Advanced AI processing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="text-xs">Priority support</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleUpgradeToPro}
                    className="mt-4 w-full"
                    variant="outline"
                  >
                    Learn more
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Discord Community Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Join Our Community</p>
                      <p className="text-muted-foreground text-sm">
                        Connect with other VoiceGecko users and get support
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="grid grid-cols-1 gap-x-3 gap-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="text-xs">Get help and share tips</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="text-xs">
                        Early access to new features
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="text-xs">
                        Direct feedback to our team
                      </span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleJoinDiscord}
                    className="mt-4 w-full bg-[#5865F2] text-white hover:bg-[#4752C4]"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Join our Discord
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
