import { flags } from './flag-iso';

export const hasFlag = (code: string) => flags.includes(code);

// Flag file path
// public\assets\images\flags\AD.svg

export const getFlag = (code: string): string | null => {
  if (hasFlag(code)) {
    return `/assets/images/flags/${code.toUpperCase()}.svg`;
  }
  return null;
};
