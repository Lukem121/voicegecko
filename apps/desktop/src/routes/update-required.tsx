import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Progress } from '@acme/ui/components/ui/progress';
import { createFileRoute } from '@tanstack/react-router';
import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useMemo, useState } from 'react';

import { appLifecycle } from '~/lib/app-lifecycle';

export const Route = createFileRoute('/update-required')({
  component: UpdateRequiredPage,
});

function UpdateRequiredPage() {
  const [statusMessage, setStatusMessage] = useState<string>('Preparing…');
  const [progress, setProgress] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    getVersion()
      .then(setCurrentVersion)
      .catch(() => setCurrentVersion(''));
  }, []);

  useEffect(() => {
    const unsubscribeStatus = appLifecycle.onUpdateStatus((msg) => {
      setStatusMessage(msg);
    });
    const unsubscribeProgress = appLifecycle.onUpdateProgress((p) => {
      setProgress(p);
    });
    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
    };
  }, []);

  useEffect(() => {
    if (!started) {
      setStarted(true);
      // Kick off the forced update if not already in progress
      if (!appLifecycle.isUpdating()) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        appLifecycle.forceUpdateNow();
      }
    }
  }, [started]);

  const displayMessage = useMemo(() => {
    if (!statusMessage) {
      return 'Checking for updates…';
    }
    return statusMessage;
  }, [statusMessage]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center">Update Required</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Your VoiceGecko app needs to update to continue. We're downloading
              the latest version automatically. This usually takes under a
              minute.
            </p>
            {currentVersion ? (
              <p className="text-muted-foreground text-xs">
                Current version: v{currentVersion}
              </p>
            ) : null}
            <Progress className="h-2" value={progress} />
            <div className="flex items-center justify-between">
              <span className="text-sm">{displayMessage}</span>
              <span className="text-muted-foreground text-xs">{progress}%</span>
            </div>
            <div className="mt-2 text-muted-foreground text-xs">
              The app will relaunch automatically once the update is installed.
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  // Allow manual retry if something stalls
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  appLifecycle.forceUpdateNow();
                }}
                type="button"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
