import { log } from '@acme/observability/log';

type ForceUpdateHandler = () => Promise<void>;

let forceUpdateHandler: ForceUpdateHandler | null = null;

export function registerForceUpdateHandler(handler: ForceUpdateHandler): void {
  forceUpdateHandler = handler;
}

export async function triggerForceUpdate(): Promise<void> {
  if (forceUpdateHandler) {
    await forceUpdateHandler();
    return;
  }
  log.warn('[UpdateController] No force update handler registered');
}
