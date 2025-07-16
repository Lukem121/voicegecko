import type { SafeToCollapseChecker } from "./gecko-bar-app.types";

/**
 * Determines if it's safe to collapse the gecko bar based on current state.
 * The bar should only collapse when completely idle and not being interacted with.
 */
export const isSafeToCollapse: SafeToCollapseChecker = ({
  isRecording,
  isLoading,
  isTranscribing,
  isTransitioning,
  recordingStatus,
  isHovered,
  wasRecentlyRecording,
}) => {
  return (
    !isRecording &&
    !isLoading &&
    !isTranscribing &&
    !isTransitioning &&
    recordingStatus === "idle" &&
    !isHovered &&
    !wasRecentlyRecording
  );
};

/**
 * Determines if the gecko bar should be in its expanded/active state.
 * This is used for showing buttons and controls.
 */
export const shouldShowActiveState = ({
  isRecording,
  isTranscribing,
  isTransitioning,
  recordingStatus,
  wasRecentlyRecording,
}: {
  isRecording: boolean;
  isTranscribing: boolean;
  isTransitioning: boolean;
  recordingStatus: string;
  wasRecentlyRecording: boolean;
}) => {
  return (
    isRecording ||
    isTranscribing ||
    isTransitioning ||
    recordingStatus !== "idle" ||
    wasRecentlyRecording
  );
};

/**
 * Determines if a button should be enabled based on current state.
 */
export const isButtonEnabled = (
  buttonType: "cancel" | "finish",
  {
    isRecording,
    isTranscribing,
    isTransitioning,
    isLoading,
  }: {
    isRecording: boolean;
    isTranscribing: boolean;
    isTransitioning: boolean;
    isLoading: boolean;
  },
) => {
  if (isLoading) return false;

  switch (buttonType) {
    case "cancel":
      return isRecording && !isTranscribing && !isTransitioning;
    case "finish":
      return isRecording && !isTranscribing;
    default:
      return false;
  }
};
