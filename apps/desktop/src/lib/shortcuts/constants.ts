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
      {
        id: 'flow-stream',
        name: 'Flow — live streaming dictation',
        keys: ['CommandOrControl', 'Shift', 'Space'],
        global: true,
        enabled: true,
      },
      {
        id: 'hands-free',
        name: 'Hands-free VAD dictation',
        keys: ['CommandOrControl', 'Shift', 'Alt', 'Z'],
        global: true,
        enabled: true,
      },
      {
        id: 'capsule-compose',
        name: 'Capsule compose mode',
        keys: ['CommandOrControl', 'Shift', 'G'],
        global: true,
        enabled: true,
      },
      {
        id: 'cancel-recording',
        name: 'Cancel recording',
        keys: ['Escape'],
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
      {
        id: 'undo-dictation',
        name: 'Undo last dictation',
        keys: ['CommandOrControl', 'Shift', 'U'],
        global: true,
        enabled: true,
      },
      {
        id: 'open-engine-lab',
        name: 'Open Engine Lab',
        keys: ['CommandOrControl', 'Shift', 'E'],
        global: true,
        enabled: true,
      },
    ],
  },
];
