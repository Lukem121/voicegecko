import { check, type Update } from '@tauri-apps/plugin-updater';

/** reqwest has no default timeout; a hung endpoint would leave the UI on "Checking…" forever. */
const UPDATE_CHECK_TIMEOUT_MS = 15_000;

export async function checkForAppUpdate(): Promise<Update | null> {
  return check({ timeout: UPDATE_CHECK_TIMEOUT_MS });
}
