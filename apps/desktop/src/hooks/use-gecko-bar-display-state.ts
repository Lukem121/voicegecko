import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useReducer } from 'react';

import { useEventStore } from '~/stores/event.store';
import { useGeckoBarNotificationStore } from '~/stores/gecko-bar-notification.store';
import { trpc } from '~/trpc';

// State machine for gecko bar display
export type GeckoBarDisplayMode =
  | 'idle' // Nothing happening, collapsed
  | 'hover' // User hovering, show appropriate message
  | 'notification' // Active notification, highest priority
  | 'recording' // Currently recording, expanded
  | 'transcribing'; // Processing transcription, expanded

export interface GeckoBarDisplayState {
  mode: GeckoBarDisplayMode;
  isExpanded: boolean;
  showTooltip: boolean;
  tooltipMessage: string;
}

type DisplayAction =
  | { type: 'HOVER_START'; canTranscribe: boolean }
  | { type: 'HOVER_END' }
  | { type: 'NOTIFICATION_START'; message: string }
  | { type: 'NOTIFICATION_END' }
  | { type: 'RECORDING_START' }
  | { type: 'RECORDING_END' }
  | { type: 'TRANSCRIBING_START' }
  | { type: 'TRANSCRIBING_END' }
  | { type: 'FORCE_IDLE' };

// Helper functions for state transitions
const createIdleState = (): GeckoBarDisplayState => ({
  mode: 'idle',
  isExpanded: false,
  showTooltip: false,
  tooltipMessage: '',
});

const createNotificationState = (message: string): GeckoBarDisplayState => ({
  mode: 'notification',
  isExpanded: true,
  showTooltip: true,
  tooltipMessage: message,
});

const createRecordingState = (): GeckoBarDisplayState => ({
  mode: 'recording',
  isExpanded: true,
  showTooltip: false,
  tooltipMessage: '',
});

const createTranscribingState = (): GeckoBarDisplayState => ({
  mode: 'transcribing',
  isExpanded: true,
  showTooltip: false,
  tooltipMessage: '',
});

const createHoverState = (canTranscribe: boolean): GeckoBarDisplayState => ({
  mode: 'hover',
  isExpanded: true,
  showTooltip: true,
  tooltipMessage: canTranscribe
    ? 'Click to start dictating'
    : 'Usage limit reached',
});

const isHighPriorityState = (mode: GeckoBarDisplayMode): boolean => {
  return (
    mode === 'notification' || mode === 'recording' || mode === 'transcribing'
  );
};

// State machine reducer with clear priorities
function displayReducer(
  state: GeckoBarDisplayState,
  action: DisplayAction
): GeckoBarDisplayState {
  switch (action.type) {
    case 'NOTIFICATION_START':
      return createNotificationState(action.message);

    case 'RECORDING_START':
      return state.mode === 'notification' ? state : createRecordingState();

    case 'TRANSCRIBING_START':
      return state.mode === 'notification' ? state : createTranscribingState();

    case 'HOVER_START':
      return isHighPriorityState(state.mode)
        ? state
        : createHoverState(action.canTranscribe);

    case 'HOVER_END':
      return state.mode === 'hover' ? createIdleState() : state;

    case 'NOTIFICATION_END':
      return state.mode === 'notification' ? createIdleState() : state;

    case 'RECORDING_END':
    case 'TRANSCRIBING_END':
      return state.mode === 'recording' || state.mode === 'transcribing'
        ? createIdleState()
        : state;

    case 'FORCE_IDLE':
      return createIdleState();

    default:
      return state;
  }
}

const initialState: GeckoBarDisplayState = {
  mode: 'idle',
  isExpanded: false,
  showTooltip: false,
  tooltipMessage: '',
};

export function useGeckoBarDisplayState(
  isHovered: boolean,
  isLoading: boolean
) {
  const [state, dispatch] = useReducer(displayReducer, initialState);

  // External state
  const notification = useGeckoBarNotificationStore(
    (notificationState) => notificationState.notification
  );
  const isRecording = useEventStore((eventState) => eventState.isRecording());
  const isTranscribing = useEventStore((eventState) =>
    eventState.isTranscribing()
  );

  // Usage status
  const { data: usageStatus } = useQuery({
    ...trpc.usage.getStatus.queryOptions(),
    refetchInterval: 30_000,
  });

  const canTranscribe = !usageStatus || usageStatus.canTranscribe;

  // Helper functions for state management
  const handleHighPriorityStates = useCallback((): boolean => {
    if (notification) {
      dispatch({ type: 'NOTIFICATION_START', message: notification.message });
      return true;
    }
    if (isRecording) {
      dispatch({ type: 'RECORDING_START' });
      return true;
    }
    if (isTranscribing) {
      dispatch({ type: 'TRANSCRIBING_START' });
      return true;
    }
    return false;
  }, [notification, isRecording, isTranscribing]);

  const handleHoverState = useCallback((): boolean => {
    if (isHovered && !isLoading) {
      dispatch({ type: 'HOVER_START', canTranscribe });
      return true;
    }
    return false;
  }, [isHovered, isLoading, canTranscribe]);

  const handleStateCleanup = useCallback((): void => {
    if (state.mode === 'notification' && !notification) {
      dispatch({ type: 'NOTIFICATION_END' });
    } else if (state.mode === 'recording' && !isRecording) {
      dispatch({ type: 'RECORDING_END' });
    } else if (state.mode === 'transcribing' && !isTranscribing) {
      dispatch({ type: 'TRANSCRIBING_END' });
    } else if (state.mode === 'hover' && !isHovered) {
      dispatch({ type: 'HOVER_END' });
    }
  }, [state.mode, notification, isRecording, isTranscribing, isHovered]);

  // Single effect to manage all state transitions
  useEffect(() => {
    // Handle high-priority states first
    if (handleHighPriorityStates()) {
      return;
    }

    // Handle hover state
    if (handleHoverState()) {
      return;
    }

    // Clean up based on previous state
    handleStateCleanup();
  }, [handleHighPriorityStates, handleHoverState, handleStateCleanup]);

  return {
    displayState: state,
    dispatch,
  };
}
