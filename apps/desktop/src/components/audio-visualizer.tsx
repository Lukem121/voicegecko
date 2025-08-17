import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AudioLevelEvent } from '~/types/events';

export type VisualizationMode =
  | 'waveform'
  | 'spectrum'
  | 'circular'
  | 'voice-reactive';

type AudioVisualizerProps = {
  audioLevel: AudioLevelEvent;
  isRecording: boolean;
  mode?: VisualizationMode;
  size?: 'small' | 'medium' | 'large';
  className?: string;
};

type SmoothedAudioData = {
  levels: number[];
  peaks: number[];
  frequencyBands: number[];
  lastUpdate: number;
};

export function AudioVisualizer({
  audioLevel,
  isRecording,
  mode = 'voice-reactive',
  size = 'small',
  className = '',
}: AudioVisualizerProps) {
  const smoothedDataRef = useRef<SmoothedAudioData>({
    levels: new Array(10).fill(0),
    peaks: new Array(10).fill(0),
    frequencyBands: new Array(10).fill(0),
    lastUpdate: Date.now(),
  });

  const animationFrameRef = useRef<number>(0);

  // Configuration based on size
  const config = {
    small: { maxHeight: 16, dotCount: 10, baseSize: 3, spacing: 2 },
    medium: { maxHeight: 24, dotCount: 12, baseSize: 4, spacing: 3 },
    large: { maxHeight: 32, dotCount: 15, baseSize: 5, spacing: 4 },
  }[size];

  // Smoothing parameters
  const SMOOTHING_FACTOR = 0.3; // Less smoothing for more responsiveness
  const PEAK_DECAY = 0.92;
  const MIN_UPDATE_INTERVAL = 33; // ~30 FPS for better performance

  // Helper function to update levels for spectrum mode
  const updateSpectrumLevels = useCallback(
    (smoothedData: SmoothedAudioData, i: number) => {
      const targetLevel = audioLevel.frequency_bands?.[i] ?? 0;
      smoothedData.levels[i] =
        (smoothedData.levels[i] || 0) * SMOOTHING_FACTOR +
        targetLevel * (1 - SMOOTHING_FACTOR);
      smoothedData.frequencyBands[i] = targetLevel;
    },
    [audioLevel]
  );

  // Helper function to update levels for other modes
  const updateWaveformLevels = useCallback(
    (smoothedData: SmoothedAudioData, i: number, now: number) => {
      const wavePhase = (now / 100 + i * 0.7) % (Math.PI * 2);
      const waveMultiplier = Math.sin(wavePhase) * 0.3 + 0.7;
      const targetLevel = Math.max(0, audioLevel.level * waveMultiplier * 3);
      smoothedData.levels[i] =
        (smoothedData.levels[i] || 0) * SMOOTHING_FACTOR +
        targetLevel * (1 - SMOOTHING_FACTOR);
    },
    [audioLevel]
  );

  // Helper function to update peaks
  const updatePeaks = useCallback(
    (smoothedData: SmoothedAudioData, i: number) => {
      const currentLevel = smoothedData.levels[i] || 0;
      smoothedData.peaks[i] = Math.max(
        (smoothedData.peaks[i] || 0) * PEAK_DECAY,
        currentLevel
      );
    },
    []
  );

  // Helper function to decay levels when not recording
  const decayLevels = useCallback(
    (smoothedData: SmoothedAudioData) => {
      for (let i = 0; i < config.dotCount; i++) {
        smoothedData.levels[i] = (smoothedData.levels[i] || 0) * 0.9;
        smoothedData.peaks[i] = (smoothedData.peaks[i] || 0) * 0.9;
        smoothedData.frequencyBands[i] =
          (smoothedData.frequencyBands[i] || 0) * 0.9;
      }
    },
    [config.dotCount]
  );

  // Helper function to process recording data
  const processRecordingData = useCallback(
    (smoothedData: SmoothedAudioData, now: number) => {
      for (let i = 0; i < config.dotCount; i++) {
        const isSpectrumWithData =
          mode === 'spectrum' && audioLevel.frequency_bands?.[i] !== undefined;

        if (isSpectrumWithData) {
          updateSpectrumLevels(smoothedData, i);
        } else if (audioLevel.level !== undefined) {
          updateWaveformLevels(smoothedData, i, now);
        }

        updatePeaks(smoothedData, i);
      }
    },
    [
      mode,
      audioLevel,
      config.dotCount,
      updateSpectrumLevels,
      updateWaveformLevels,
      updatePeaks,
    ]
  );

  useEffect(() => {
    const updateSmoothedData = () => {
      const now = Date.now();
      const smoothedData = smoothedDataRef.current;

      if (now - smoothedData.lastUpdate < MIN_UPDATE_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(updateSmoothedData);
        return;
      }

      if (audioLevel && isRecording) {
        processRecordingData(smoothedData, now);
      } else {
        decayLevels(smoothedData);
      }

      smoothedData.lastUpdate = now;
      setForceUpdate((prev) => prev + 1);
      animationFrameRef.current = requestAnimationFrame(updateSmoothedData);
    };

    animationFrameRef.current = requestAnimationFrame(updateSmoothedData);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, isRecording, processRecordingData, decayLevels]);

  const [_forceUpdate, setForceUpdate] = useState(0);

  // Helper function for voice-reactive coloring
  const getVoiceReactiveColor = (level: number) => {
    if (!audioLevel) {
      return 'bg-muted-foreground/50';
    }
    if (audioLevel.is_silence) {
      return 'bg-gray-400';
    }
    if (!audioLevel.is_voice_detected) {
      return 'bg-blue-400';
    }

    const intensity = Math.min(level * 2, 1);
    if (intensity > 0.7) {
      return 'bg-red-500';
    }
    if (intensity > 0.3) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  // Helper function for spectrum coloring
  const getSpectrumColor = (level: number, index: number) => {
    const hue = (index / config.dotCount) * 240; // Red to Blue spectrum
    const saturation = Math.min(level * 100, 80);
    const lightness = 40 + Math.min(level * 30, 30);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Helper function for circular coloring
  const getCircularColor = (level: number) => {
    const intensity = Math.min(level * 2, 1);
    if (intensity > 0.7) {
      return 'bg-purple-500';
    }
    if (intensity > 0.3) {
      return 'bg-blue-500';
    }
    return 'bg-cyan-500';
  };

  // Helper function for default waveform coloring
  const getWaveformColor = (level: number) => {
    const intensity = Math.min(level * 2, 1);
    if (intensity > 0.7) {
      return 'bg-red-500';
    }
    if (intensity > 0.3) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const getVisualizationColor = (level: number, index: number) => {
    if (!isRecording) {
      return 'bg-muted-foreground/50';
    }

    switch (mode) {
      case 'voice-reactive':
        return getVoiceReactiveColor(level);
      case 'spectrum':
        return getSpectrumColor(level, index);
      case 'circular':
        return getCircularColor(level);
      default:
        return getWaveformColor(level);
    }
  };

  const renderWaveform = () => {
    // Calculate fixed width based on dot count and spacing to prevent layout shifts
    const totalWidth =
      config.dotCount * config.baseSize + (config.dotCount - 1) * 2; // 2px spacing

    return (
      <div
        className="flex items-center justify-center"
        style={{ width: `${totalWidth}px` }}
      >
        <div className="flex items-center space-x-[2px]">
          {Array.from({ length: config.dotCount }).map((_, i) => {
            // Calculate height directly from audio level (similar to original)
            const baseSize = config.baseSize;
            const maxHeight = config.maxHeight;

            let height = baseSize;
            let colorClass = 'bg-muted-foreground/50';

            if (isRecording && audioLevel) {
              // Add subtle wave effect that travels across the dots
              const wavePhase = (Date.now() / 150 + i * 0.5) % (Math.PI * 2);
              const waveMultiplier = Math.sin(wavePhase) * 0.2 + 0.8; // Reduced wave effect

              // More direct audio response with baseline
              const audioMultiplier = Math.max(0.15, audioLevel.level); // Minimum 15% height for better visibility
              height =
                baseSize +
                (maxHeight - baseSize) * audioMultiplier * waveMultiplier;

              // Clean white color scheme for audio waves
              if (audioLevel.level > 0.05) {
                colorClass = 'bg-white';
              } else if (audioLevel.level > 0.01) {
                colorClass = 'bg-white/80';
              } else {
                colorClass = 'bg-muted-foreground/70';
              }
            } else if (isRecording) {
              // Still recording but no audio level - maintain a baseline active state
              const wavePhase = (Date.now() / 150 + i * 0.5) % (Math.PI * 2);
              const waveMultiplier = Math.sin(wavePhase) * 0.1 + 0.9; // Subtle baseline animation
              height = baseSize + (maxHeight - baseSize) * 0.2 * waveMultiplier; // 20% baseline height
              colorClass = 'bg-muted-foreground/70';
            }

            return (
              <motion.div
                animate={{
                  width: baseSize,
                  height,
                }}
                className={`rounded-full transition-colors duration-150 ${colorClass}`}
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed order visualization elements
                key={i}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  mass: 0.5,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderSpectrum = () => {
    const smoothedData = smoothedDataRef.current;

    return (
      <div className="flex items-center justify-center">
        <div className={`flex items-end space-x-[${config.spacing}px]`}>
          {Array.from({ length: config.dotCount }).map((_, i) => {
            const level = smoothedData.frequencyBands[i] || 0;
            const height =
              config.baseSize + (config.maxHeight - config.baseSize) * level;
            const colorClass = getVisualizationColor(level, i);

            return (
              <motion.div
                animate={{
                  width: Math.max(config.baseSize, 4),
                  height,
                }}
                className="rounded-t-sm"
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed order visualization elements
                key={i}
                style={
                  typeof colorClass === 'string' && colorClass.startsWith('hsl')
                    ? { backgroundColor: colorClass }
                    : {}
                }
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  mass: 0.3,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderCircular = () => {
    const smoothedData = smoothedDataRef.current;
    const radius = config.maxHeight;
    const centerX = radius + 5;
    const centerY = radius + 5;

    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: (radius + 5) * 2, height: (radius + 5) * 2 }}
      >
        {Array.from({ length: config.dotCount }).map((_, i) => {
          const level = smoothedData.levels[i] || 0;
          const angle = (i / config.dotCount) * Math.PI * 2 - Math.PI / 2;
          const distance = radius * 0.3 + radius * 0.7 * level;
          const x = centerX + Math.cos(angle) * distance;
          const y = centerY + Math.sin(angle) * distance;
          const dotSize = config.baseSize + level * 4;
          const colorClass = getVisualizationColor(level, i);

          return (
            <motion.div
              animate={{
                x: x - dotSize / 2,
                y: y - dotSize / 2,
                width: dotSize,
                height: dotSize,
              }}
              className={`absolute rounded-full ${
                typeof colorClass === 'string' && colorClass.startsWith('bg-')
                  ? colorClass
                  : 'bg-muted-foreground/50'
              }`}
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed order visualization elements
              key={i}
              style={
                typeof colorClass === 'string' && colorClass.startsWith('hsl')
                  ? { backgroundColor: colorClass }
                  : {}
              }
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                mass: 0.5,
              }}
            />
          );
        })}
      </div>
    );
  };

  const renderVisualization = () => {
    switch (mode) {
      case 'spectrum':
        return renderSpectrum();
      case 'circular':
        return renderCircular();
      default:
        return renderWaveform();
    }
  };

  // Helper function to get width based on size
  const getVisualizerWidth = () => {
    if (size === 'small') {
      return '60px';
    }
    if (size === 'medium') {
      return '72px';
    }
    return '90px';
  };

  return (
    <div
      className={`audio-visualizer ${className}`}
      style={{
        width: getVisualizerWidth(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {renderVisualization()}
    </div>
  );
}
