import { Alert, AlertDescription } from '@acme/ui/components/ui/alert';
import { Button } from '@acme/ui/components/ui/button';
import {
import
{
  log;
}
from;
('@acme/observability');
Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/components/ui/dialog';
import { createFileRoute } from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AlertCircle, Mic, MicOff } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOnboarding } from '~/components/onboarding/onboarding-provider';
import { analytics } from '~/lib/analytics/posthog-analytics';
import { useSettingsStore } from '~/stores/settings.store';
import type { AudioLevelEvent } from '~/types/events';
import type { AudioDevice } from '~/types/settings';

export const Route = createFileRoute('/onboarding/microphone-setup')({
  component: MicrophoneSetupStep,
});

function MicrophoneSetupStep() {
  const {
    markStepCompleted,
    nextStep,
    sendMascotMessage,
    setCanProceed,
    setStepProgress,
  } = useOnboarding();

  const {
    audioDevices,
    settings: { audio: audioSettings },
    updateAudioDevice,
    refreshAudioDevices,
  } = useSettingsStore();

  const [selectedDevice, setSelectedDevice] = useState<AudioDevice | null>(
    audioSettings.selectedDevice
  );
  const [audioLevel, setAudioLevel] = useState(0);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [microphoneTestError, setMicrophoneTestError] = useState<string | null>(
    null
  );
  const [isConfirming, setIsConfirming] = useState(false);

  const microphoneTestUnlistenRef = useRef<(() => void) | null>(null);
  const initialActionsPerformed = React.useRef(false);

  const startMicrophoneTest = useCallback(async (device?: AudioDevice) => {
    try {
      // Set up event listeners for real-time audio levels
      const unlistenLevel = await listen<AudioLevelEvent>(
        'microphone-test-level',
        (event) => {
          const audioData = event.payload;
          // Convert RMS level to percentage and apply some amplification for UI display
          const displayLevel = Math.min(audioData.level * 700, 100);
          setAudioLevel(displayLevel);
        }
      );

      const unlistenError = await listen<string>(
        'microphone-test-error',
        (event) => {
          log.error('[Onboarding] Microphone test error:', event.payload);
          setMicrophoneTestError(event.payload);
        }
      );

      // Store unlisten functions for cleanup
      microphoneTestUnlistenRef.current = () => {
        unlistenLevel();
        unlistenError();
      };

      // Start the microphone test - if no device specified, backend will use system default
      await invoke('start_microphone_test', {
        device: device?.name ?? null,
      });
    } catch (error) {
      log.error('[Onboarding] Failed to start microphone test:', error);
      setMicrophoneTestError(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }, []);

  // Load audio devices and start testing on mount
  useEffect(() => {
    if (initialActionsPerformed.current) return;
    initialActionsPerformed.current = true;

    refreshAudioDevices();

    // Start microphone test immediately with system default device
    startMicrophoneTest();

    sendMascotMessage({
      content:
        "Now let's set up your microphone! I'll test it automatically - just speak and see if the bars light up!",
      type: 'guidance',
      persist: true,
      duration: 5000,
      priority: 'high',
    });
  }, [refreshAudioDevices, sendMascotMessage, startMicrophoneTest]);

  // Auto-select first device for UI display (don't restart test)
  useEffect(() => {
    if (!selectedDevice && audioDevices.length > 0) {
      const defaultDevice = audioDevices[0];
      if (defaultDevice) {
        setSelectedDevice(defaultDevice);
        updateAudioDevice(defaultDevice);
        // Don't restart the test - it's already running with system default
      }
    }
  }, [audioDevices, selectedDevice, updateAudioDevice]);

  // Always allow proceeding (user will confirm manually)
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  // Cleanup microphone test on unmount
  useEffect(() => {
    return () => {
      if (microphoneTestUnlistenRef.current) {
        microphoneTestUnlistenRef.current();
      }
      // Stop any ongoing microphone test
      invoke('stop_microphone_test').catch(console.error);
    };
  }, []);

  const handleDeviceChange = useCallback(
    async (deviceName: string) => {
      const device = audioDevices.find((d) => d.name === deviceName) ?? null;
      if (!device) return;

      setSelectedDevice(device);
      await updateAudioDevice(device);
      setMicrophoneTestError(null);

      // Stop current test and start with new device
      try {
        await invoke('stop_microphone_test');
        if (microphoneTestUnlistenRef.current) {
          microphoneTestUnlistenRef.current();
        }
      } catch (error) {
        log.error('Failed to stop previous test:', error);
      }

      await startMicrophoneTest(device);

      sendMascotMessage({
        content: `Testing "${device.name}" now! Speak and see if the bars light up!`,
        type: 'info',
        duration: 4000,
        priority: 'high',
      });
    },
    [audioDevices, updateAudioDevice, startMicrophoneTest, sendMascotMessage]
  );

  const handleConfirmMicrophone = useCallback(() => {
    if (!selectedDevice || isConfirming) return;

    // Set confirming state immediately for UI feedback
    setIsConfirming(true);

    markStepCompleted('microphone', 100);
    setStepProgress('microphone', 100);

    // Navigate to next onboarding step immediately
    nextStep();
  }, [
    selectedDevice,
    isConfirming,
    markStepCompleted,
    setStepProgress,
    nextStep,
  ]);

  const handleChangeMicrophone = useCallback(() => {
    if (isConfirming) return;
    setShowDeviceSelector(true);
  }, [isConfirming]);

  // No microphones found case
  if (audioDevices.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="mx-auto max-w-lg text-center">
            <Card>
              <CardTitle>Speak to test your microphone</CardTitle>
              <CardDescription>
                Your computer's built-in mic will ensure optimal transcription
              </CardDescription>

              <CardContent className="space-y-6">
                <div className="mx-auto w-fit rounded-full bg-muted/50 p-4">
                  <MicOff className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h2 className="mb-2 font-semibold text-lg">
                    No microphones found
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    VoiceGecko works best with a microphone, but you can set one
                    up later in settings.
                  </p>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No microphones detected. Please make sure a microphone is
                    connected and try refreshing.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-center">
                  <Button onClick={refreshAudioDevices} variant="outline">
                    Refresh Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Speak to test your microphone</CardTitle>
              <CardDescription>
                Your computer's built-in mic will ensure optimal transcription
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Audio Visualization */}
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-1">
                  {Array.from({ length: 12 }).map((_, i) => {
                    // Determine if this bar should be active based on audio level
                    const barThreshold = (i + 1) * (100 / 12); // Each bar represents ~8.3% of max level
                    const isActive = audioLevel > barThreshold;

                    return (
                      <div
                        className={`h-6 flex-1 rounded transition-colors duration-150 ${
                          isActive
                            ? 'bg-primary'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        key={i}
                      />
                    );
                  })}
                </div>

                <p className="text-center font-medium text-base">
                  Do you see bars moving while you speak?
                </p>
              </div>

              {/* Error Message */}
              {microphoneTestError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Microphone test failed: {microphoneTestError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  disabled={isConfirming}
                  onClick={handleChangeMicrophone}
                  variant="outline"
                >
                  No
                </Button>
                <Button
                  className="bg-black text-white hover:bg-gray-800"
                  disabled={isConfirming}
                  onClick={handleConfirmMicrophone}
                >
                  Yes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Device Selector Dialog */}
        <Dialog onOpenChange={setShowDeviceSelector} open={showDeviceSelector}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose your microphone</DialogTitle>
              <DialogDescription>
                Select the microphone device you'd like to use for voice
                transcription
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {audioDevices.map((device) => (
                <Button
                  className={`h-auto w-full justify-start p-3 ${
                    selectedDevice?.name === device.name
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                  key={device.name}
                  onClick={() => {
                    handleDeviceChange(device.name);
                    setShowDeviceSelector(false);
                  }}
                  variant="outline"
                >
                  <div className="flex items-center space-x-2">
                    <Mic className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{device.name}</span>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
