import type { NextRequest } from 'next/server';

export const getClientIp = (
  headers: Headers,
  req?: NextRequest
): string | null => {
  // 1. Check Cloudflare's cf-connecting-ip header
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (typeof cfConnectingIp === 'string') {
    return cfConnectingIp;
  }

  // 2. Check x-forwarded-for header
  const xForwardedFor = headers.get('x-forwarded-for');
  if (typeof xForwardedFor === 'string') {
    // Split it by comma and take the first IP
    const ip = xForwardedFor.split(',')[0]?.trim();
    if (ip) {
      return ip;
    }
  }

  // 3. Fallback to req.ip
  const ip = req?.ip;
  if (typeof ip === 'string') {
    return ip;
  }

  // 4. If all else fails, return null
  return null;
};
