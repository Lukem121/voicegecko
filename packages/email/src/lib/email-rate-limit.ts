import { createRateLimiter, slidingWindow } from '@acme/rate-limit';

export async function assertEmailRateLimit(
  kind: 'verification' | 'reset-password',
  email: string
): Promise<void> {
  const limiter = createRateLimiter({
    limiter: slidingWindow(3, '15m'),
    prefix: `auth-email-${kind}`,
  });

  const key = email.trim().toLowerCase();
  const { success } = await limiter.limit(key);

  if (!success) {
    throw new Error(
      'Too many email requests. Please wait a few minutes and try again.'
    );
  }
}
