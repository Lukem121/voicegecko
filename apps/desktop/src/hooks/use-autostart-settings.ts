import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

import { analytics } from '~/lib/analytics/posthog-analytics';

type AutostartConfig = {
  enabled: boolean;
};

export function useAutostartSettings() {
  const [config, setConfig] = useState<AutostartConfig>({
    enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const autostartConfig = await invoke<AutostartConfig>(
          'get_autostart_config'
        );
        setConfig(autostartConfig);
      } catch (error) {
        log.error(error, 'Failed to load autostart settings:');
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const oldEnabled = config.enabled;
      const newConfig = { ...config, enabled };
      setConfig(newConfig);

      // Track autostart setting change
      analytics.track('settings_changed', {
        category: 'general',
        setting_key: 'launchOnStartup',
        old_value: oldEnabled,
        new_value: enabled,
      });

      try {
        await invoke('set_autostart_config', { config: newConfig });
      } catch (error) {
        log.error(error, 'Failed to update autostart settings:');
        // Revert the state if the update failed
        setConfig(config);
      }
    },
    [config]
  );

  return {
    config,
    isLoading,
    setEnabled,
  };
}
