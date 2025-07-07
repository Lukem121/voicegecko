import { RefreshCw, Shield } from "lucide-react";

import VoiceGeckoLogo from "@acme/ui/components/logos/voice-gecko";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@acme/ui/components/ui/card";
import { Progress } from "@acme/ui/components/ui/progress";

interface CriticalUpdateOverlayProps {
  isDownloading: boolean;
  isInstalling: boolean;
  downloadProgress: number;
  version: string;
  error?: string | null;
  onRetry?: () => void;
  onStartUpdate?: () => void;
  showInitialPrompt?: boolean;
}

export function CriticalUpdateOverlay({
  isDownloading,
  isInstalling,
  downloadProgress,
  version,
  error,
  onRetry,
  onStartUpdate,
  showInitialPrompt,
}: CriticalUpdateOverlayProps) {
  return (
    <div className="bg-background fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 transform-gpu overflow-hidden blur-[120px] sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="to-primary-muted relative left-[calc(50%)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[45deg] bg-gradient-to-tr from-[#6E9C4A] via-[#6E9C4A]/60 via-[#6E9C4A]/80 to-[#6E9C4A]/40 opacity-25 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-[120px] sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#6E9C4A]/70 via-[#6E9C4A]/60 via-[#6E9C4A]/85 to-[#6E9C4A]/90 opacity-25 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          />
        </div>
      </div>

      <div className="w-full max-w-sm px-4">
        <div className="flex flex-col gap-6">
          <Card className="shadow-lg">
            <CardHeader className="space-y-3">
              <VoiceGeckoLogo
                className="mx-auto h-10"
                aria-label="VoiceGecko Logo"
              />

              {/* Security badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                  <Shield className="h-3 w-3" />
                  Security Update
                </div>
              </div>

              <CardDescription className="min-h-[1.25rem] text-center">
                {showInitialPrompt
                  ? "Review and install security update"
                  : error
                    ? "Update encountered an issue"
                    : `${
                        isInstalling
                          ? "Installing Update"
                          : isDownloading
                            ? "Downloading Update"
                            : "Preparing Update"
                      }: ${version}`}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Initial prompt state */}
              {showInitialPrompt && (
                <div className="space-y-4 text-center">
                  <div className="space-y-2">
                    <h3 className="font-medium">
                      Critical Security Update Required
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      The update will download automatically and restart the app
                      when complete.
                    </p>
                  </div>

                  {onStartUpdate && (
                    <Button
                      onClick={onStartUpdate}
                      className="w-full"
                      size="sm"
                    >
                      Install Security Update
                    </Button>
                  )}
                </div>
              )}

              {/* Progress section */}
              {!showInitialPrompt && isDownloading && (
                <div className="space-y-3">
                  <Progress value={downloadProgress} className="h-2" />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>Progress</span>
                    <span>{downloadProgress}%</span>
                  </div>
                </div>
              )}

              {/* Loading indicator for installing/preparing */}
              {!showInitialPrompt && !isDownloading && !error && (
                <div className="flex items-center justify-center py-6">
                  <div className="flex space-x-1">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:0ms] [animation-duration:1.5s]"></div>
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:150ms] [animation-duration:1.5s]"></div>
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:300ms] [animation-duration:1.5s]"></div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {!showInitialPrompt && error && (
                <div className="space-y-4">
                  <div className="bg-destructive/10 rounded-md p-3 text-sm text-red-600">
                    {error}
                  </div>

                  {onRetry && (
                    <Button
                      onClick={onRetry}
                      variant="destructive"
                      className="w-full"
                      size="sm"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer notice */}
          <p className="text-muted-foreground text-center text-xs">
            Security updates are automatically installed for your protection.
          </p>
        </div>
      </div>
    </div>
  );
}
