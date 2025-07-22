import type { AudioLevelEvent } from "~/types/events";

// Timeout management types
export interface TimeoutState {
  expand: number | null;
  collapse: number | null;
  tooltip: number | null;
  cleanup: number | null;
}

export interface TimeoutManager {
  timeouts: TimeoutState;
  clearTimeout: (type: keyof TimeoutState) => void;
  clearAllTimeouts: () => void;
  setTimeout: (
    type: keyof TimeoutState,
    callback: () => void,
    delay: number,
  ) => void;
}

// UI state types
export interface UIState {
  isExpanded: boolean;
  isHovered: boolean;
  showTooltip: boolean;
  isLoading: boolean;
}

// Recording state types
export interface RecordingState {
  isTransitioning: boolean;
  wasRecentlyRecording: boolean;
  visualizerActive: boolean;
}

// Combined state for the main hook
export interface GeckoBarState {
  isExpanded: boolean;
  isHovered: boolean;
  showTooltip: boolean;
  isLoading: boolean;
  isTransitioning: boolean;
  wasRecentlyRecording: boolean;
  visualizerActive: boolean;
  audioLevel: AudioLevelEvent;
  tooltipMessage?: string;
}

// Event handler types
export interface GeckoBarEventHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void | Promise<void>;
  onCancel: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  onFinish: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
}

// Audio processor types
export interface AudioProcessor {
  audioLevel: AudioLevelEvent;
  isActive: boolean;
}

// Utility function types
export type SafeToCollapseChecker = (state: {
  isRecording: boolean;
  isLoading: boolean;
  isTranscribing: boolean;
  isTransitioning: boolean;
  recordingStatus: string;
  isHovered: boolean;
  wasRecentlyRecording: boolean;
}) => boolean;

// Button state types
export interface ButtonState {
  isVisible: boolean;
  isEnabled: boolean;
  isLoading: boolean;
}

// Animation state types
export interface AnimationState {
  width: number;
  height: number;
  opacity: number;
}

// Component props types
export interface GeckoBarTooltipProps {
  show: boolean;
  isRecording: boolean;
  message?: string;
}

export interface GeckoBarButtonProps {
  type: "cancel" | "finish";
  state: ButtonState;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  className?: string;
}

// Hook return types
export interface UseGeckoBarStateReturn {
  state: GeckoBarState;
  handlers: GeckoBarEventHandlers;
  safeToCollapse: boolean;
}

export type UseTimeoutManagerReturn = TimeoutManager;

export type UseAudioProcessorReturn = AudioProcessor;
