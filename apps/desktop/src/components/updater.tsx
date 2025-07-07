import { AlertTriangle, Download, RefreshCw, X } from "lucide-react";

import { Alert, AlertDescription } from "@acme/ui/components/ui/alert";
import { Button } from "@acme/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/components/ui/dialog";
import { Progress } from "@acme/ui/components/ui/progress";

import { CriticalUpdateOverlay } from "~/components/critical-update-overlay";
import { useUpdater } from "~/hooks/use-updater";

export function AppUpdater() {
  const {
    updateAvailable,
    isChecking,
    isDownloading,
    isInstalling,
    downloadProgress,
    error,
    update,
    isCritical,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
  } = useUpdater();

  // Show full-screen overlay for critical updates (detected, in progress, or with errors)
  if (
    isCritical &&
    (updateAvailable || isDownloading || isInstalling || error)
  ) {
    return (
      <CriticalUpdateOverlay
        isDownloading={isDownloading}
        isInstalling={isInstalling}
        downloadProgress={downloadProgress}
        version={update?.version ?? "Unknown"}
        error={error}
        onRetry={checkForUpdates}
      />
    );
  }

  // Show loading state during check
  if (isChecking) {
    return (
      <div className="bg-background fixed right-4 bottom-4 rounded-lg border p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Checking for updates...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-background fixed right-4 bottom-4 rounded-lg border p-4 shadow-lg">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={checkForUpdates}>
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={dismissUpdate}>
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  // Show update available dialog
  if (updateAvailable && update) {
    const dialogTitle = isCritical
      ? "Critical Update Required"
      : "Update Available";
    const dialogDescription = isCritical
      ? `A critical security update (${update.version}) must be installed for Voice Gecko. This update cannot be skipped.`
      : `A new version (${update.version}) of Voice Gecko is available.`;

    return (
      <Dialog
        open={updateAvailable}
        onOpenChange={isCritical ? undefined : () => dismissUpdate()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className={
                isCritical ? "flex items-center gap-2 text-orange-600" : ""
              }
            >
              {isCritical && <AlertTriangle className="h-5 w-5" />}
              {dialogTitle}
            </DialogTitle>
            <DialogDescription>
              {dialogDescription}
              {update.body && (
                <div className="mt-2 text-sm">
                  <strong>Release notes:</strong>
                  <div className="mt-1 whitespace-pre-wrap">{update.body}</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Critical update warning banner */}
          {isCritical && (
            <Alert
              variant="destructive"
              className="border-orange-200 bg-orange-50"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-orange-800">
                This is a mandatory security update. The application cannot be
                used without installing this update.
              </AlertDescription>
            </Alert>
          )}

          {isDownloading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="text-sm">Downloading update...</span>
              </div>
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-muted-foreground text-xs">
                {downloadProgress}% complete
              </p>
            </div>
          )}

          {isInstalling && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Installing update...</span>
              </div>
              <p className="text-muted-foreground text-xs">
                The app will restart automatically once installation is
                complete.
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {/* Only show "Later" button for non-critical updates */}
            {!isCritical && (
              <Button
                variant="outline"
                onClick={dismissUpdate}
                disabled={isDownloading || isInstalling}
              >
                <X className="mr-1 h-4 w-4" />
                Later
              </Button>
            )}

            {/* Show different buttons based on the current state */}
            {!isDownloading && !isInstalling && (
              <Button
                onClick={downloadUpdate}
                variant={isCritical ? "destructive" : "default"}
                className={isCritical ? "w-full" : ""}
              >
                <Download className="mr-1 h-4 w-4" />
                {isCritical ? "Install Critical Update" : "Update Now"}
              </Button>
            )}

            {isDownloading && (
              <Button
                disabled
                variant={isCritical ? "destructive" : "default"}
                className={isCritical ? "w-full" : ""}
              >
                <Download className="mr-1 h-4 w-4" />
                Downloading...
              </Button>
            )}

            {isInstalling && (
              <Button
                onClick={installUpdate}
                variant={isCritical ? "destructive" : "default"}
                className={isCritical ? "w-full" : ""}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Restart App
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
