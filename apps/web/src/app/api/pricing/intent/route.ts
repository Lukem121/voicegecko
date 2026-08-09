import { NextResponse } from 'next/server';

import {
  PlanIntent,
  PlanIntentBilling,
  setPlanIntentCookie,
} from '~/lib/pricing/plan-intent.server';

const ALLOWED_PLAN_IDS = new Set<PlanIntent['planId']>(['voice gecko pro']);

export async function POST(request: Request) {
  let payload: Partial<PlanIntent> = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { planId, billing } = payload;

  if (!planId || !ALLOWED_PLAN_IDS.has(planId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid planId' },
      { status: 400 }
    );
  }

  if (billing !== 'annual' && billing !== 'monthly') {
    return NextResponse.json(
      { success: false, error: 'Invalid billing interval' },
      { status: 400 }
    );
  }

  setPlanIntentCookie({ planId, billing: billing as PlanIntentBilling });

  return NextResponse.json({ success: true });
}

