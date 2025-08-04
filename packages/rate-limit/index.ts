import type { RatelimitConfig } from '@upstash/ratelimit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { env } from './env';

export const redis = new Redis({
  url: env().UPSTASH_REDIS_REST_URL,
  token: env().UPSTASH_REDIS_REST_TOKEN,
});

export const createRateLimiter = (props: Omit<RatelimitConfig, 'redis'>) =>
  new Ratelimit({
    redis,
    limiter: props.limiter ?? Ratelimit.slidingWindow(10, '10 s'),
    prefix: props.prefix ?? 'voicegecko',
  });

export const { slidingWindow, fixedWindow } = Ratelimit;
