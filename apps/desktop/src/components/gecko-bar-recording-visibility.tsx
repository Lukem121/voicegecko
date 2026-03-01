import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef } from 'react';

import { useEventStore } from '~/stores/event.store';
import { useSettingsStore } from '~/stores/settings.store';

/**
 * Shows or hides the gecko bar based on recording state when "Show while
 * recording" is enabled and "Show at all times" is off. Renders nothing.
 * Must run only in the main window (mounted in InnerApp).
 */
export function GeckoBarRecordingVisibility() {
  const showGeckoBar = useSettingsStore(
    (state) => state.settings.general.showGeckoBar
  );
  const showGeckoBarWhileRecording = useSettingsStore(
    (state) => state.settings.general.showGeckoBarWhileRecording
  );
  const recordingStatus = useEventStore((state) => state.recordingStatus);

  const showedForRecordingRef = useRef(false);

  const shouldBeVisibleForRecording =
    !showGeckoBar &&
    showGeckoBarWhileRecording &&
    (recordingStatus === 'recording' || recordingStatus === 'processing');

  useEffect(() => {
    if (shouldBeVisibleForRecording) {
      showedForRecordingRef.current = true;
      invoke('show_gecko_bar', { options: { forRecording: true } }).catch((error) => {
        log.error(error, '[GeckoBarRecordingVisibility] Failed to show gecko bar:');
      });
    } else if (showedForRecordingRef.current) {
      showedForRecordingRef.current = false;
      invoke('hide_gecko_bar').catch((error) => {
        log.error(error, '[GeckoBarRecordingVisibility] Failed to hide gecko bar:');
      });
    }
  }, [shouldBeVisibleForRecording]);

  return null;
}
