import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

export function VersionDisplay() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("Unknown");
      }
    };

    void fetchVersion();
  }, []);

  if (!version) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-2 bottom-1 z-50 select-none">
      <span className="text-muted-foreground font-mono text-xs opacity-50">
        beta-v{version}
      </span>
    </div>
  );
}
