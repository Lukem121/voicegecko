import type { ShortcutCategory } from './types';

export const SHORTCUTS_STORE_KEY = 'shortcuts';
export const SHORTCUTS_SETTINGS_FILE = 'shortcuts.json';

export const DEFAULT_SHORTCUTS: ShortcutCategory[] = [
  {
    name: 'Recording Controls',
    shortcuts: [
      {
        id: 'push-to-talk',
        name: 'Push to dictate (hold to record)',
        keys: ['CommandOrControl', 'Shift', 'X'],
        global: true,
        enabled: true,
      },
      {
        id: 'toggle-recording',
        name: 'Toggle recording on/off',
        keys: ['CommandOrControl', 'Shift', 'Z'],
        global: true,
        enabled: true,
      },
    ],
  },
  {
    name: 'Navigation',
    shortcuts: [
      {
        id: 'open-last-dictation',
        name: 'Open most recent dictation',
        keys: ['CommandOrControl', 'Shift', 'L'],
        global: true,
        enabled: true,
      },
      {
        id: 'paste-last-dictation',
        name: 'Paste last dictation into active text field',
        keys: ['CommandOrControl', 'Shift', 'V'],
        global: true,
        enabled: true,
      },
    ],
  },
];
