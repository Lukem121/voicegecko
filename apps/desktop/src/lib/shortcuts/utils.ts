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

const FUNCTION_KEY_REGEX = /^f(\d{1,2})$/;

const MODIFIER_SYNONYMS: Record<string, string> = {
  commandorcontrol: 'CommandOrControl',
  cmdorctrl: 'CommandOrControl',
  cmdorcontrol: 'CommandOrControl',
  controlorcommand: 'CommandOrControl',
  ctrl: 'CommandOrControl',
  control: 'CommandOrControl',
  cmd: 'CommandOrControl',
  command: 'CommandOrControl',
  option: 'Alt',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Meta',
  win: 'Meta',
  windows: 'Meta',
};

const CANONICAL_MODIFIER_ORDER = ['CommandOrControl', 'Meta', 'Alt', 'Shift'];

function normalizeSingleKey(rawKey: string): string {
  const key = String(rawKey).trim();
  const lower = key.toLowerCase();

  if (MODIFIER_SYNONYMS[lower]) {
    return MODIFIER_SYNONYMS[lower];
  }

  // Common special keys
  const SPECIAL: Record<string, string> = {
    ' ': 'Space',
    space: 'Space',
    enter: 'Enter',
    return: 'Enter',
    escape: 'Escape',
    esc: 'Escape',
    tab: 'Tab',
    backspace: 'Backspace',
    arrowup: 'ArrowUp',
    arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft',
    arrowright: 'ArrowRight',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    home: 'Home',
    end: 'End',
  };
  if (SPECIAL[lower]) {
    return SPECIAL[lower];
  }

  // Function keys F1..F24
  const fMatch = lower.match(FUNCTION_KEY_REGEX);
  if (fMatch) {
    const n = Number(fMatch[1]);
    if (n >= 1 && n <= 24) {
      return `F${n}`;
    }
  }

  // Single character keys (letters/numbers)
  if (key.length === 1) {
    return key.toUpperCase();
  }

  // Default: preserve original casing
  return key;
}

function canonicalizeKeysOrder(keys: string[]): string[] {
  const modifiers: string[] = [];
  const others: string[] = [];

  for (const key of keys) {
    if (CANONICAL_MODIFIER_ORDER.includes(key)) {
      modifiers.push(key);
    } else {
      others.push(key);
    }
  }

  // Sort modifiers by defined order, keep others as-is (main key usually last)
  modifiers.sort(
    (a, b) =>
      CANONICAL_MODIFIER_ORDER.indexOf(a) - CANONICAL_MODIFIER_ORDER.indexOf(b)
  );

  return [...modifiers, ...others];
}

export function acceleratorFromKeys(keys: string[]): string {
  // Ensure we produce a stable, canonical accelerator string
  const normalized = normalizeKeys(keys);
  const deduped = Array.from(new Set(normalized));
  const ordered = canonicalizeKeysOrder(deduped);
  return ordered.join('+');
}

/**
 * Validates that a shortcut has at least one modifier key and one regular key
 */
export function isValidShortcut(keys: string[]): boolean {
  if (keys.length < 2) {
    return false;
  }

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
// Remove duplicate declarations from earlier refactor

export function normalizeKeys(keys: string[]): string[] {
  return keys.map(normalizeSingleKey);
}
