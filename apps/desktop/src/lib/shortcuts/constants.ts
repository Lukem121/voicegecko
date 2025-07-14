import type { ShortcutCategory } from "./types";

export const SHORTCUTS_STORE_KEY = "shortcuts";
export const SHORTCUTS_SETTINGS_FILE = "shortcuts.json";

export const DEFAULT_SHORTCUTS: ShortcutCategory[] = [
  {
    name: "Recording Controls",
    shortcuts: [
      {
        id: "push-to-talk",
        name: "Push to dictate (hold to record)",
        keys: ["CommandOrControl", "Shift", "X"],
        global: true,
        enabled: true,
      },
      {
        id: "toggle-recording",
        name: "Toggle recording on/off",
        keys: ["CommandOrControl", "Shift", "R"],
        global: true,
        enabled: true,
      },
    ],
  },
  {
    name: "Navigation",
    shortcuts: [
      {
        id: "open-last-transcription",
        name: "Open most recent transcription",
        keys: ["CommandOrControl", "Shift", "L"],
        global: true,
        enabled: true,
      },
      {
        id: "paste-last-transcription",
        name: "Paste last transcription into active text field",
        keys: ["CommandOrControl", "Shift", "V"],
        global: true,
        enabled: true,
      },
    ],
  },
];
