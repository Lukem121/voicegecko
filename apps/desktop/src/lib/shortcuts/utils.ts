import { platform } from '@tauri-apps/plugin-os';

export type Platform =
  | 'linux'
  | 'macos'
  | 'ios'
  | 'android'
  | 'windows'
  | 'web'
  | 'freebsd'
  | 'dragonfly'
  | 'netbsd'
  | 'openbsd'
  | 'solaris';

export function getOS() {
  return platform();
}

export function formatKeysForDisplay(
  keys: string[],
  osName: Platform
): string[] {
  if (osName === 'macos') {
    return keys.map((key) => {
      switch (key.toLowerCase()) {
        case 'control':
        case 'ctrl':
          return '⌃';
        case 'commandorcontrol':
        case 'command':
        case 'cmd':
          return '⌘';
        case 'alt':
        case 'option':
          return '⌥';
        case 'shift':
          return '⇧';
        case 'backspace':
          return '⌫';
        case 'tab':
          return '⇥';
        case 'enter':
        case 'return':
          return '↩';
        case 'escape':
          return '⎋';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        default:
          return key.toUpperCase();
      }
    });
  }

  return keys.map((key) => {
    switch (key.toLowerCase()) {
      case 'commandorcontrol':
        return 'Ctrl';
      default:
        return key.charAt(0).toUpperCase() + key.slice(1);
    }
  });
}

export function acceleratorFromKeys(keys: string[]): string {
  return keys.join('+');
}

/**
 * Validates that a shortcut has at least one modifier key and one regular key
 */
export function isValidShortcut(keys: string[]): boolean {
  if (keys.length < 2) return false;

  const modifiers = [
    'command',
    'control',
    'alt',
    'shift',
    'commandorcontrol',
    'meta',
  ];
  const hasModifier = keys.some((key) => modifiers.includes(key.toLowerCase()));

  const hasRegularKey = keys.some(
    (key) => !modifiers.includes(key.toLowerCase())
  );

  return hasModifier && hasRegularKey;
}

/**
 * Normalizes shortcut keys for consistent storage
 */
export function normalizeKeys(keys: string[]): string[] {
  return keys.map((key) => {
    const lower = key.toLowerCase();
    // Normalize common variations
    if (lower === 'ctrl') return 'Control';
    if (lower === 'cmd') return 'Command';
    if (lower === 'meta') return 'Command';
    if (lower === 'win' || lower === 'windows') return 'Meta';
    if (lower === ' ' || lower === 'space') return 'Space';

    // Capitalize first letter for consistency
    return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  });
}
