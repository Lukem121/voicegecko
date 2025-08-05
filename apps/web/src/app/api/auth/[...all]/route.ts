import { serverAuth } from '@acme/auth';
import { toNextJsHandler } from 'better-auth/next-js';

/**
 * Create auth handlers
 */
export const { POST, GET } = toNextJsHandler(serverAuth);
