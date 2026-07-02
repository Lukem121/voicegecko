import { LazyStore } from '@tauri-apps/plugin-store';

const settingsStore = new LazyStore('settings.json');

export async function isRequireAuthEnabled(): Promise<boolean> {
  return (await settingsStore.get<boolean>('features.requireAuth')) ?? false;
}

export async function isLocalOnlyMode(): Promise<boolean> {
  return !(await isRequireAuthEnabled());
}
