import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface AutostartConfig {
  enabled: boolean;
}

export function useAutostartSettings() {
  const [config, setConfig] = useState<AutostartConfig>({
    enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const autostartConfig = await invoke<AutostartConfig>(
          "get_autostart_config",
        );
        setConfig(autostartConfig);
      } catch (error) {
        console.error("Failed to load autostart settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadSettings();
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const newConfig = { ...config, enabled };
      setConfig(newConfig);

      try {
        await invoke("set_autostart_config", { config: newConfig });
      } catch (error) {
        console.error("Failed to update autostart settings:", error);
        // Revert the state if the update failed
        setConfig(config);
      }
    },
    [config],
  );

  return {
    config,
    isLoading,
    setEnabled,
  };
}
