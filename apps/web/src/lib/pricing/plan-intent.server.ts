'use server';

import 'server-only';

import { cookies } from 'next/headers';

export type PlanIntentBilling = 'annual' | 'monthly';

export type PlanIntent = {
  planId: string;
  billing: PlanIntentBilling;
};

const PLAN_INTENT_COOKIE = 'vg_plan_intent';
const PLAN_INTENT_MAX_AGE_SECONDS = 60 * 15; // 15 minutes

export async function setPlanIntentCookie(intent: PlanIntent): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PLAN_INTENT_COOKIE, JSON.stringify(intent), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: PLAN_INTENT_MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function readPlanIntentCookie(): Promise<PlanIntent | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PLAN_INTENT_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlanIntent>;
    if (
      typeof parsed.planId === 'string' &&
      (parsed.billing === 'annual' || parsed.billing === 'monthly')
    ) {
      return {
        planId: parsed.planId,
        billing: parsed.billing,
      };
    }
  } catch {
    // Ignore parse errors and fall through to clearing the cookie
  }

  clearPlanIntentCookie();
  return null;
}

export async function clearPlanIntentCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PLAN_INTENT_COOKIE);
}
