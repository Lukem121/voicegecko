import { db } from '@acme/db/client';
import {
  adjectives,
  nouns,
  generateFromEmail,
  generateUniqueAsync,
  uniqueUsernameGenerator,
} from 'unique-username-generator';
import { usernameValidator } from '../schemas/username.schema';

const MAX_USERNAME_LENGTH = 20;
const MIN_USERNAME_LENGTH = 3;

function sanitizeUsername(input: string): string {
  const lower = input.toLowerCase();
  // Replace invalid characters with underscore
  const replaced = lower.replace(/[^a-z0-9_]/g, '_');
  // Collapse multiple underscores
  const collapsed = replaced.replace(/_+/g, '_');
  // Trim leading/trailing underscores
  const trimmed = collapsed.replace(/^_+|_+$/g, '');
  return trimmed.slice(0, MAX_USERNAME_LENGTH);
}

async function isTakenOrInvalid(candidate: string): Promise<boolean> {
  if (!usernameValidator(candidate)) return true;
  const existing = await db.query.user.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.username, candidate),
  });
  return Boolean(existing);
}

async function tryEmailBased(email: string): Promise<string | null> {
  const digitAttempts = [0, 2, 3, 4, 5, 6];
  for (const digits of digitAttempts) {
    const base = generateFromEmail(email, {
      randomDigits: digits,
      stripLeadingDigits: true,
      leadingFallback: 'member',
    });
    const candidate = sanitizeUsername(base);
    if (candidate.length < MIN_USERNAME_LENGTH) continue;
    if (!(await isTakenOrInvalid(candidate))) {
      return candidate;
    }
  }
  return null;
}

export async function generateUniqueUsernameFromEmail(
  email: string | null | undefined
): Promise<string> {
  if (email) {
    const fromEmail = await tryEmailBased(email);
    if (fromEmail) return fromEmail;
  }

  // Fallback: use dictionaries, underscore separator, lower case, with digits
  const unique = await generateUniqueAsync(
    {
      dictionaries: [adjectives, nouns],
      separator: '_',
      style: 'lowerCase',
      randomDigits: 2,
      length: MAX_USERNAME_LENGTH,
    },
    isTakenOrInvalid
  );

  // As a final guard, sanitize and ensure it passes
  let candidate = sanitizeUsername(unique);
  if (!usernameValidator(candidate) || (await isTakenOrInvalid(candidate))) {
    // Try once more with a different config emphasizing shorter words
    const fallback = uniqueUsernameGenerator({
      dictionaries: [adjectives, nouns],
      separator: '_',
      style: 'lowerCase',
      randomDigits: 3,
      length: MAX_USERNAME_LENGTH,
    });
    candidate = sanitizeUsername(fallback);
  }

  return candidate.slice(0, MAX_USERNAME_LENGTH);
}


