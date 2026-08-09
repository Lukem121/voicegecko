import { LazyStore } from '@tauri-apps/plugin-store';

const settingsStore = new LazyStore('settings.json');

export async function isAirGapMode(): Promise<boolean> {
  return (await settingsStore.get<boolean>('privacy.airGap')) ?? false;
}
