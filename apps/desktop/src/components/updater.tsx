import { Download, RefreshCw, X } from "lucide-react";

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
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
  } = useUpdater();

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
    return (
      <Dialog open={updateAvailable} onOpenChange={() => dismissUpdate()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Available</DialogTitle>
            <DialogDescription>
              A new version ({update.version}) of Voice Gecko is available.
              {update.body && (
                <div className="mt-2 text-sm">
                  <strong>Release notes:</strong>
                  <div className="mt-1 whitespace-pre-wrap">{update.body}</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

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
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Installing update...</span>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={dismissUpdate}
              disabled={isDownloading || isInstalling}
            >
              <X className="mr-1 h-4 w-4" />
              Later
            </Button>
            <Button
              onClick={downloadUpdate}
              disabled={isDownloading || isInstalling}
            >
              <Download className="mr-1 h-4 w-4" />
              {isDownloading ? "Downloading..." : "Update Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
