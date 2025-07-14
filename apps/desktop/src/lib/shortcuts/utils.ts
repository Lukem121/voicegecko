import { platform } from "@tauri-apps/plugin-os";

export type Platform =
  | "linux"
  | "macos"
  | "ios"
  | "android"
  | "windows"
  | "web"
  | "freebsd"
  | "dragonfly"
  | "netbsd"
  | "openbsd"
  | "solaris";

export function getOS() {
  return platform();
}

export function formatKeysForDisplay(
  keys: string[],
  osName: Platform,
): string[] {
  if (osName === "macos") {
    return keys.map((key) => {
      switch (key.toLowerCase()) {
        case "control":
        case "ctrl":
          return "⌃";
        case "commandorcontrol":
        case "command":
        case "cmd":
          return "⌘";
        case "alt":
        case "option":
          return "⌥";
        case "shift":
          return "⇧";
        case "backspace":
          return "⌫";
        case "tab":
          return "⇥";
        case "enter":
        case "return":
          return "↩";
        case "escape":
          return "⎋";
        case "arrowup":
          return "↑";
        case "arrowdown":
          return "↓";
        case "arrowleft":
          return "←";
        case "arrowright":
          return "→";
        default:
          return key.toUpperCase();
      }
    });
  }

  return keys.map((key) => {
    switch (key.toLowerCase()) {
      case "commandorcontrol":
        return "Ctrl";
      default:
        return key.charAt(0).toUpperCase() + key.slice(1);
    }
  });
}

export function acceleratorFromKeys(keys: string[]): string {
  return keys.join("+");
}
