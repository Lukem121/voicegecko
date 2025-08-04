import { useCallback, useEffect, useState } from 'react';
import {
  AUDIO,
  DEFAULT_AUDIO_LEVEL,
} from '~/components/gecko-bar/gecko-bar-app.constants';
import type { UseAudioProcessorReturn } from '~/components/gecko-bar/gecko-bar-app.types';
import type { AudioLevelEvent } from '~/types/events';

interface UseAudioProcessorProps {
  isRecording: boolean;
  isTranscribing: boolean;
  isTransitioning: boolean;
  recordingStatus: string;
}

export function useAudioProcessor({
  isRecording,
  isTranscribing,
  isTransitioning,
  recordingStatus,
}: UseAudioProcessorProps): UseAudioProcessorReturn {
  const [audioLevel, setAudioLevel] =
    useState<AudioLevelEvent>(DEFAULT_AUDIO_LEVEL);
  const [isActive, setIsActive] = useState(false);

  // Audio amplification function
  const amplifyAudio = useCallback((level: number): number => {
    // Use exponential curve to make quiet sounds more visible
    const amplified =
      (level * AUDIO.DEFAULT_SENSITIVITY) ** AUDIO.AMPLIFICATION_CURVE;
    return Math.min(amplified, AUDIO.MAX_LEVEL); // Cap at max level
  }, []);

  // Handle audio level events
  useEffect(() => {
    const handleAudioLevel = (event: CustomEvent<AudioLevelEvent>) => {
      const rawAudioLevel = event.detail;

      const enhancedAudioLevel: AudioLevelEvent = {
        ...rawAudioLevel,
        level: amplifyAudio(rawAudioLevel.level),
      };

      setAudioLevel(enhancedAudioLevel);
    };

    window.addEventListener('audio-level', handleAudioLevel as EventListener);
    return () => {
      window.removeEventListener(
        'audio-level',
        handleAudioLevel as EventListener
      );
    };
  }, [amplifyAudio]);

  // Manage visualizer active state to prevent decay during transitions
  useEffect(() => {
    if (isRecording) {
      // Start visualizer when recording begins
      setIsActive(true);
    } else if (
      !(isTranscribing || isTransitioning) &&
      recordingStatus === 'idle'
    ) {
      // Only stop visualizer when completely idle
      setIsActive(false);
    }
    // Keep visualizer active during transcribing, transitioning, or processing
  }, [isRecording, isTranscribing, isTransitioning, recordingStatus]);

  return {
    audioLevel,
    isActive,
  };
}
