---
name: ""
overview: ""
todos: []
isProject: false
---

# Robust Pricing-to-Checkout Flow

## Goals

- Ensure a clean ecommerce-style experience: marketing pricing page → plan selection → Stripe checkout.
- If the visitor is unauthenticated, they should be sent to sign-in/sign-up, then returned to pricing with their selected plan so checkout launches automatically.
- Keep pricing page SSR-friendly and resilient (works even with hard reloads or missing client state).
- Remove the previous sessionStorage hack.

## Key Decisions

- **Plan intent propagation**: store intent server-side (e.g., short-lived cookie) rather than sessionStorage so pricing SSR can read it.
- **Auth redirect**: when pricing detects intent and the user is unauthenticated, redirect to auth with `redirect=/pricing?plan=...&billing=...`.
- After successful auth (sign-in or sign-up/verification), auth flow redirects back to `/pricing` with plan intent cookie intact.
- Pricing auto-creates checkout once session shows an authenticated user but no active subscription.
- Stripe success redirects to `/download?sub_success=true` to start desktop flow.

## Implementation Steps

1. **Plan Intent Cookie Utility**

- Add helpers to set/read/clear a short-lived, HttpOnly cookie storing `{ planId, billing }`.
- Use secure attributes and small TTL (e.g., 15 minutes).

1. **Pricing Page (Server Component) Updates**

- On request, read plan intent cookie and SSR-props: selected plan, billing, `shouldAutoCheckout`.
- If unauthenticated & plan intent exists, rewrite response to redirect to sign-in/up with original plan query (still keep cookie).
- If authenticated & plan intent exists & no active subscription, render flags so the client component triggers checkout immediately.
- Always clear cookie once the intent is consumed server-side.

1. **Pricing Client Component**

- Accept props for `autoCheckoutPlan`, `autoCheckoutBilling`, `shouldAutoCheckout`.
- On mount, if `shouldAutoCheckout`, call existing upgrade mutation (or new API) immediately.
- Disable plan cards during in-flight checkout to avoid double submissions.

1. **Plan Selection Handlers**

- When a logged-in user clicks a plan: set cookie via new API route (POST) and immediately trigger checkout without page reload.
- When a logged-out user clicks a plan: call API to set cookie, then redirect to `/sign-in?redirect=/pricing` (no query params needed—the cookie carries intent).

1. **API Route: `POST /api/pricing/intent**`

- Accept `{ planId, billing }`, set the cookie, return success.
- Used by plan cards (logged in/out) prior to navigation.

1. **Auth Flow Adjustments**

- Ensure sign-in/sign-up/verification flows respect `redirect` query and send the user back to `/pricing` (not `/app`).
- After verification success, redirect to `redirect` (default `/pricing`).

1. **Cleanup & Removal**

- Delete legacy sessionStorage logic.
- Remove Basic/free plan references, ensure CTAs, copy, and emails reflect Pro/Team only.
- Update tests/docs if present.

## Testing Scenarios

- Unauthenticated visitor selects Pro/annual → sign-up → verify → lands on pricing → auto-checkout.
- Authenticated, unsubscribed user selects Pro/annual → immediately taken to Stripe.
- Team plan both auth states.
- Authenticated user with active subscription visits `/pricing` and ensures no auto checkout.
- Hard refresh on `/pricing` with intent cookie still triggers checkout.
- Ensure Stripe cancel returns to `/pricing` cleanly.
