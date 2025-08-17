import { log } from '@acme/observability/log';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export function getCurrentWindowLabel() {
  try {
    const window = getCurrentWebviewWindow();
    return window.label;
  } catch (error) {
    log.error('Failed to get current window label:', error);
    return 'main'; // Default fallback
  }
}

export function isGeckoBarWindow() {
  const label = getCurrentWindowLabel();
  return label === 'gecko-bar';
}

export function isMainWindow() {
  const label = getCurrentWindowLabel();
  return label === 'main';
}
