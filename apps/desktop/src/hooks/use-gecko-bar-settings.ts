import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

type GeckoBarConfig = {
  enabled: boolean;
  hideOnFullscreen: boolean | undefined; // Whether to hide gecko bar when fullscreen apps are detected
};

export function useGeckoBarSettings() {
  const [config, setConfig] = useState<GeckoBarConfig>({
    enabled: true,
    hideOnFullscreen: true, // Default to hiding on fullscreen
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const geckoBarConfig = await invoke<GeckoBarConfig>(
          'get_gecko_bar_config'
        );
        // Handle migration from old config that might not have hideOnFullscreen
        const migratedConfig = {
          enabled: geckoBarConfig.enabled,
          hideOnFullscreen: geckoBarConfig.hideOnFullscreen ?? true,
        };
        setConfig(migratedConfig);
      } catch (error) {
        log.error('Failed to load gecko bar settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const newConfig = { ...config, enabled };
      setConfig(newConfig);

      try {
        await invoke('set_gecko_bar_config', { config: newConfig });

        // Show or hide the gecko bar based on the setting
        if (enabled) {
          await invoke('show_gecko_bar');
        } else {
          await invoke('hide_gecko_bar');
        }
      } catch (error) {
        log.error('Failed to update gecko bar settings:', error);
        // Revert the state if the update failed
        setConfig(config);
      }
    },
    [config]
  );

  const setHideOnFullscreen = useCallback(
    async (hideOnFullscreen: boolean) => {
      const newConfig = { ...config, hideOnFullscreen };
      setConfig(newConfig);

      try {
        await invoke('set_gecko_bar_config', { config: newConfig });
      } catch (error) {
        log.error('Failed to update gecko bar fullscreen setting:', error);
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
    setHideOnFullscreen,
  };
}
