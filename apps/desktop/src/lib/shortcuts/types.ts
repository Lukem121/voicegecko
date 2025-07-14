/**
 * Defines the type of action a shortcut can perform.
 * This is used to map a shortcut to a specific function.
 */
export type ShortcutAction =
  | "toggle-recording"
  | "push-to-talk"
  | "paste-last-transcription"
  | "open-last-transcription";

/**
 * Represents a keyboard shortcut configuration.
 */
export interface Shortcut {
  id: ShortcutAction;
  name: string;
  keys: string[];
  global: boolean;
  enabled: boolean;
}

/**
 * Defines the structure for a category of shortcuts.
 */
export interface ShortcutCategory {
  name: string;
  shortcuts: Shortcut[];
}
