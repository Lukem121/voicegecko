import { getSessionCookie as getSessionCookieFromBetterAuth } from 'better-auth/cookies';
import type { NextRequest } from 'next/server';

export const getSessionCookie = (request: NextRequest) => {
  const sessionCookie = getSessionCookieFromBetterAuth(request);
  return sessionCookie;
};
