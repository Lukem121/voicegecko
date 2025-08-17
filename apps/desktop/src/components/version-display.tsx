import { log } from '@acme/observability/log';
import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useState } from 'react';

export function VersionDisplay() {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        log.warn('Failed to get app version', { error });
        setVersion('Unknown');
      }
    };

    fetchVersion().catch(() => setVersion('Unknown'));
  }, []);

  if (!version) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-2 bottom-1 z-50 select-none">
      <span className="font-mono text-muted-foreground text-xs opacity-50">
        beta-v{version}
      </span>
    </div>
  );
}
