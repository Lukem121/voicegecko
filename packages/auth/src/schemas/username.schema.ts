import { z } from 'zod/v4';

// List of restricted usernames by category
const restrictedUsernamesByCategory = {
  admin: ['admin', 'administrator', 'moderator', 'mod', 'staff', 'owner'],
  support: ['support', 'help', 'contact', 'service', 'customer'],
  system: ['system', 'root', 'superuser', 'sudo', 'api', 'webhook', 'bot'],
  account: ['account', 'profile', 'billing', 'payment'],
  security: ['security', 'auth', 'login', 'logout', 'signin', 'signout'],
  settings: ['settings', 'config', 'configuration', 'preferences'],
  spam: ['official', 'verify', 'verified', 'genuine'],
  company: ['smmhubx', 'hubx'],
  offensive: ['abuse', 'spam', 'scam'],
};

// Flatten for checking
const restrictedUsernames = Object.values(restrictedUsernamesByCategory).flat();

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, { error: 'Username must be at least 3 characters long' })
  .max(20, { error: 'Username must be less than 20 characters long' })
  .regex(/^[a-z0-9_]+$/, {
    error: 'Username can only contain letters, numbers, and underscores',
  })
  .check((ctx) => {
    const username = ctx.value;

    if (
      username.startsWith('_') ||
      username.startsWith('-') ||
      username.endsWith('_') ||
      username.endsWith('-')
    ) {
      ctx.issues.push({
        input: username,
        code: 'custom',
        message: 'Username cannot start or end with an underscore or hyphen',
      });
    }

    if (username.includes('__')) {
      ctx.issues.push({
        input: username,
        code: 'custom',
        message: 'Username cannot contain adjacent underscores',
      });
    }

    const repeatedCharRegex = /(.)\1{4,}/;
    if (repeatedCharRegex.test(username)) {
      ctx.issues.push({
        input: username,
        code: 'custom',
        message:
          'Username cannot contain more than 4 repeated characters in a row',
      });
    }

    if (/^\d+$/.test(username)) {
      ctx.issues.push({
        input: username,
        code: 'custom',
        message: 'Username cannot consist of only numbers',
      });
    }

    if (!/[a-z]/.test(username)) {
      ctx.issues.push({
        input: username,
        code: 'custom',
        message: 'Username must contain at least one letter',
      });
    }

    const exactMatch = restrictedUsernames.find((word) => username === word);
    if (exactMatch) {
      ctx.issues.push({
        input: username,
        code: 'custom',
        message: `Username cannot be '${exactMatch}'`,
      });
    }

    for (const [_, words] of Object.entries(restrictedUsernamesByCategory)) {
      const containedWord = words.find(
        (word) =>
          username.includes(word) ||
          username.replace(/\d+/g, '').includes(word) ||
          username.replace(/[._-]/g, '').includes(word)
      );

      if (containedWord) {
        ctx.issues.push({
          input: username,
          code: 'custom',
          message: `Username cannot contain '${containedWord}'`,
        });
      }
    }
  });

export type Username = z.infer<typeof usernameSchema>;

export const usernameValidator = (_username: string) => {
  // If no username provided or not a string, reject
  if (!_username || typeof _username !== 'string') {
    return false;
  }

  const username = _username.toLowerCase().trim();

  // Check length constraints (3-20 characters)
  if (username.length < 3 || username.length > 20) {
    return false;
  }

  // Only allow alphanumeric characters and underscores
  const validCharacterPattern = /^[a-z0-9_]+$/;
  if (!validCharacterPattern.test(username)) {
    return false;
  }

  // Check exact matches
  if (restrictedUsernames.includes(username)) {
    return false;
  }

  // Check for common variations and patterns
  const containsRestrictedPattern = restrictedUsernames.some((restricted) => {
    // Check if username contains any restricted word
    return (
      username.includes(restricted) ||
      // Check for common number substitutions (e.g., admin1, 1admin, admin123)
      username
        .replace(/\d+/g, '')
        .includes(restricted) ||
      // Check for common character substitutions
      username
        .replace(/[._-]/g, '')
        .includes(restricted)
    );
  });

  if (containsRestrictedPattern) {
    return false;
  }

  // Prevent usernames starting or ending with special characters
  if (
    username.startsWith('_') ||
    username.startsWith('-') ||
    username.endsWith('_') ||
    username.endsWith('-')
  ) {
    return false;
  }

  return true;
};
