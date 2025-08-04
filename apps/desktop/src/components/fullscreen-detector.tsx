import { log } from '@acme/observability';
import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';

import { useFullscreenDetection } from '~/hooks/use-fullscreen-detection';

interface FullscreenDetectorProps {
  enabled: boolean;
  geckoBarEnabled?: boolean;
}

export function FullscreenDetector({
  enabled,
  geckoBarEnabled = true,
}: FullscreenDetectorProps) {
  useFullscreenDetection(enabled);

  // Handle gecko bar visibility when fullscreen detection is disabled
  useEffect(() => {
    if (!enabled && geckoBarEnabled) {
      // If fullscreen detection is disabled but gecko bar is enabled,
      // ensure the gecko bar is visible
      invoke('show_gecko_bar').catch((error) => {
        log.error('Failed to show gecko bar:', error);
      });
    }
  }, [enabled, geckoBarEnabled]);

  // This component doesn't render anything, it just handles the detection
  return null;
}
