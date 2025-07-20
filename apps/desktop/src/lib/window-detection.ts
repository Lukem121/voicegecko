import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export async function getCurrentWindowLabel(): Promise<string> {
  try {
    const window = getCurrentWebviewWindow();
    return window.label;
  } catch (error) {
    console.error("Failed to get current window label:", error);
    return "main"; // Default fallback
  }
}

export async function isGeckoBarWindow(): Promise<boolean> {
  const label = await getCurrentWindowLabel();
  return label === "gecko-bar";
}

export async function isMainWindow(): Promise<boolean> {
  const label = await getCurrentWindowLabel();
  return label === "main";
}
