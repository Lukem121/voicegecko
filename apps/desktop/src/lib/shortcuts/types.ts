/**
 * Defines the type of action a shortcut can perform.
 * This is used to map a shortcut to a specific function.
 */
export type ShortcutAction =
  | 'toggle-recording'
  | 'paste-last-dictation'
  | 'open-last-dictation'
  | 'hands-free'
  | 'capsule-compose'
  | 'undo-dictation'
  | 'open-engine-lab'
  | 'cancel-recording';

/**
 * Special shortcuts that need custom handling beyond simple key press
 */
export type SpecialShortcut = 'push-to-talk' | 'flow-stream';

/**
 * All possible shortcut identifiers
 */
export type ShortcutId = ShortcutAction | SpecialShortcut;

/**
 * Represents a keyboard shortcut configuration.
 */
export type Shortcut = {
  id: ShortcutId;
  name: string;
  keys: string[];
  global: boolean;
  enabled: boolean;
};

/**
 * Defines the structure for a category of shortcuts.
 */
export type ShortcutCategory = {
  name: string;
  shortcuts: Shortcut[];
};
