import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { createFileRoute } from '@tanstack/react-router';
import { openUrl } from '@tauri-apps/plugin-opener';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Check,
  Clipboard,
  ExternalLink,
  Globe,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect } from 'react';
import { useOnboarding } from '~/components/onboarding/onboarding-provider';

export const Route = createFileRoute('/onboarding/completion')({
  component: CompletionStep,
});

const handleConfetti = () => {
  const end = Date.now() + 250; // 3 seconds

  const frame = () => {
    if (Date.now() > end) {
      return;
    }

    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: -0.1, y: 0.5 },
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1.1, y: 0.5 },
    });

    requestAnimationFrame(frame);
  };

  frame();
};

function CompletionStep() {
  const { markStepCompleted } = useOnboarding();

  const completionActionsPerformed = React.useRef(false);

  useEffect(() => {
    // Prevent running multiple times
    if (completionActionsPerformed.current) {
      return;
    }
    completionActionsPerformed.current = true;

    // Mark step completed
    handleConfetti();
    markStepCompleted('completion', 100);
  }, [markStepCompleted]);

  const handleJoinDiscord = () => {
    openUrl('https://discord.gg/BFxNQCzZjB');
  };

  const handleUpgradeToPro = () => {
    openUrl('https://www.voicegecko.dev/pricing');
  };

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col">
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Simple Hero */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-2 font-medium text-3xl">🎉 You're All Set!</h1>
            <p className="text-muted-foreground">
              VoiceGecko is ready to transcribe your voice anywhere
            </p>
          </motion.div>

          {/* Main Actions - Two Columns */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
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
                  className="w-full bg-[#5865F2] text-white hover:bg-[#4752C4]"
                  onClick={handleJoinDiscord}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Join Discord
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            {/* Optional support */}
            <Card>
              <CardHeader>
                <CardTitle>Support the project</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Voice Gecko is free and open source. Optional Support helps
                  fund ongoing development — same product either way.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    Full product on Free
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    No usage limits
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    MIT open source
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={handleUpgradeToPro}
                  variant="outline"
                >
                  Support Voice Gecko
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <Globe className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-medium text-sm">
                        Global Access
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Use your shortcut from any app to transcribe instantly
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clipboard className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-medium text-sm">Auto-Paste</h4>
                      <p className="text-muted-foreground text-xs">
                        Transcribed text automatically appears where you need it
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-medium text-sm">
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
