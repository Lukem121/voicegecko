---
name: Revert Free Tier Removal - Restore Basic Plan
overview: Systematically revert the free-tier-removal changes while keeping improvements (plan intent cookie flow, admin features, pricing-to-checkout flow). Restore Basic plan, landing Download CTAs, and free-tier messaging across web and desktop.
todos: []
isProject: false
---

# Revert Free Tier Removal — Restore Basic Plan

## Context

You decided to keep the free tier (2,000 words/week). The codebase has uncommitted changes that removed the Basic plan, changed landing CTAs to "View Pricing," and updated copy/emails to reflect paid-only. We must revert only those free-tier-removal changes while **keeping** the improvements: plan intent cookie flow, admin dashboard (All Time filter), and robust Pro/Team checkout flow.

---

## What to KEEP (do not revert)

| Change | Reason |
|--------|--------|
| `apps/web/src/app/api/pricing/intent/route.ts` | Plan intent API — improves checkout flow |
| `apps/web/src/lib/pricing/plan-intent.server.ts` | Server-side plan intent helpers |
| `apps/web/.../pricing/page.tsx` plan intent logic | Auto-checkout after auth — keep for Pro/Team |
| `apps/web/.../admin/users/page.tsx` | All Time filter, totalWords/totalDictations |
| `packages/api/.../user-management.repository.ts` | Supports admin All Time stats |
| `apps/desktop/src/components/app-sidebar.tsx` | Likely unrelated — verify before reverting |
| `apps/web/.../app/layout.tsx` | Verify — may be unrelated |
| `apps/web/.../app/plans` (plans.tsx, plan-comparison, plan-card) | Plans page — verify scope of changes |

**Note:** The usage service (`packages/api/src/services/usage/usage.service.ts`) was **never changed** — it still has `FREE_TIER_WEEKLY_WORD_LIMIT = 2000` and free-tier logic. No revert needed there.

---

## What to REVERT (free-tier restoration)

### 1. Pricing component — restore Basic plan and copy

**File:** [apps/web/src/app/_components/pricing.tsx](apps/web/src/app/_components/pricing.tsx)

**Reverts:**
- Add Basic plan `PriceCard` back (between or before Pro/Team; original order: Basic order-2 md:order-1, Pro order-1 md:order-2, Team order-3).
- Restore subtitle: "Start free with 2,000 words per week. Upgrade for unlimited dictation whenever you're ready."
- Restore grid: `md:grid-cols-3` and `md:h-[33rem]`.
- Restore footer: "No credit card required" instead of "Unlimited words from your first dictation".
- **Keep** `autoCheckoutPlan`, `autoCheckoutBilling`, `shouldAutoCheckout` props and the auto-checkout `useEffect` — those are for Pro/Team when returning from auth.
- Restore Basic card features: 2,000 words/week, Reset every Monday, etc.

---

### 2. PriceCard and UpgradeButton — restore Basic support

**File:** [apps/web/src/components/pricing/price-card.tsx](apps/web/src/components/pricing/price-card.tsx)

- Add `'basic'` back to `planType`: `planType: 'basic' | 'pro' | 'team'`.

**File:** [apps/web/src/components/pricing/upgrade-button.tsx](apps/web/src/components/pricing/upgrade-button.tsx)

- Add `'basic'` back to `planType`.
- **Restore Basic handling** at start of `handleClick`:
  ```typescript
  if (planType === 'basic') {
    router.push('/download');
    return;
  }
  ```
- **Adjust Pro/Team flow:** For Basic, do NOT call `/api/pricing/intent`. For Pro/Team when unauthenticated, keep the current flow (intent API → sign-up with redirect). For Pro when unauthenticated, original went to `/download`; with plan intent flow we can keep sign-up → pricing → auto-checkout. Confirm desired behavior: unauthenticated Pro click → intent → sign-up → verify → pricing → auto-checkout. **Keep that.**
- Only call intent API when `planType === 'pro' || planType === 'team'`.

---

### 3. Landing page CTAs — revert to Download

| File | Revert To |
|------|-----------|
| [apps/web/src/app/_landing/hero-section.tsx](apps/web/src/app/_landing/hero-section.tsx) | "Download for Windows" button, `useStartDownload`, `startDownload({ source: 'landing_page' })`, tracking `cta_text: 'Download for Windows'` |
| [apps/web/src/app/_landing/download-button.tsx](apps/web/src/app/_landing/download-button.tsx) | Links to `APP_ROUTES.MARKETING.DOWNLOAD`, "Download" / "Let's go!" text, `handleDownloadClick`, `download_initiated` event, `FaWindows` icon |
| [apps/web/src/app/_landing/final-cta.tsx](apps/web/src/app/_landing/final-cta.tsx) | "Download for Windows" (or similar) CTA, link to `/download`, tracking `cta_text: 'Download for Windows'` |
| [apps/web/src/app/_landing/sticky-cta.tsx](apps/web/src/app/_landing/sticky-cta.tsx) | "Download" or "Try free" CTA, `router.push('/download')`, matching tracking |
| [apps/web/src/app/_landing/speed-comparison-section.tsx](apps/web/src/app/_landing/speed-comparison-section.tsx) | "Download for Windows" button, `APP_ROUTES.MARKETING.DOWNLOAD`, `FaWindows` icon |

---

### 4. Email templates — restore free-tier copy

**File:** [packages/email/src/templates/subscription-cancelled.tsx](packages/email/src/templates/subscription-cancelled.tsx)

- Revert: "Voice Gecko access will pause until you resubscribe" → "your account will automatically switch to our free tier."
- Revert: "dictation features will be paused until you subscribe again" → "you'll have access to our free tier features".

---

### 5. Payment handler comment

**File:** [packages/payment/src/subscription-handlers/on-subscription-deleted.ts](packages/payment/src/subscription-handlers/on-subscription-deleted.ts)

- Revert comment: "require an upgrade for future dictations" → "enforce the free tier limits (2,000 words/week)".

---

### 6. Web app usage page — restore Weekly Usage Limit UI

**File:** [apps/web/src/app/(authenticated)/app/usage/page.tsx](apps/web/src/app/(authenticated)/app/usage/page.tsx)

- Revert to "Weekly Usage Limit" section with:
  - Words Used / Words Limit display
  - Progress bar
  - "Approaching usage limit" when >= 90%
  - "Usage limit reached. Upgrade to Pro for unlimited words." when >= 100%
  - Upgrade button when >= 90%

---

### 7. Desktop app — restore free-tier messaging

| File | Revert |
|------|--------|
| [apps/desktop/src/stores/event.store.ts](apps/desktop/src/stores/event.store.ts) | Toast: "Voice Gecko Pro required" → "Weekly usage limit reached"; description → "Future dictations may be limited. Upgrade to Pro for unlimited access." |
| [apps/desktop/src/lib/gecko-bar-notifications.ts](apps/desktop/src/lib/gecko-bar-notifications.ts) | "Voice Gecko Pro required to continue dictating" → "Usage limit reached" |
| [apps/desktop/src/hooks/use-gecko-bar-display-state.ts](apps/desktop/src/hooks/use-gecko-bar-display-state.ts) | Tooltip: "Voice Gecko Pro required to dictate" → "Usage limit reached" |
| [apps/desktop/src/routes/_authenticated/usage.tsx](apps/desktop/src/routes/_authenticated/usage.tsx) | At 100%: "Voice Gecko Pro is required..." → "Usage limit reached. Upgrade to Pro for unlimited words."; at 90%: "Approaching upgrade requirement" → "Approaching usage limit" |

---

### 8. Pricing page metadata

**File:** [apps/web/src/app/(unauthenticated)/(marketing)/pricing/page.tsx](apps/web/src/app/(unauthenticated)/(marketing)/pricing/page.tsx)

- Metadata description: change from "Pro or Team to unlock unlimited dictation... from day one" to include free tier, e.g. "Start free with 2,000 words per week. Upgrade to Pro or Team for unlimited dictation."
- **Keep** plan intent and auto-checkout logic — only adjust metadata/copy if needed.

---

### 9. Auth default redirect (optional)

**Files:** [sign-in/page.tsx](apps/web/src/app/(unauthenticated)/(auth_flow)/(polling_session_check)/sign-in/page.tsx), [sign-up/page.tsx](apps/web/src/app/(unauthenticated)/(auth_flow)/(polling_session_check)/sign-up/page.tsx)

- Current default `redirect` is `APP_ROUTES.MARKETING.PRICING`.
- For free tier, consider reverting to `APP_ROUTES.APP.ROOT` (`/app`) so users land in the app to try the product. **Verify** original defaults via `git show HEAD` before changing.

---

## Systematic verification

- After each revert, run the app and confirm: Basic plan visible, landing CTAs go to Download, free users see usage limit UI.
- Test plan intent flow: unauthenticated user clicks Pro → sign-up → verify → lands on pricing → auto-checkout still works.
- Test Basic: click "Get Started" on Basic → goes to `/download`.
- Search codebase for any remaining "Voice Gecko Pro required", "subscription required", or "unlock unlimited from day one" that should mention free tier.
- Check desktop: free user at limit sees "Usage limit reached" in toast and gecko bar.

---

## Summary: files to modify

| File | Action |
|------|--------|
| `apps/web/src/app/_components/pricing.tsx` | Restore Basic card, copy, footer, grid; keep autoCheckout |
| `apps/web/src/components/pricing/price-card.tsx` | Add `basic` to `planType` |
| `apps/web/src/components/pricing/upgrade-button.tsx` | Add `basic`; Basic → `/download`; intent only for Pro/Team |
| `apps/web/src/app/_landing/hero-section.tsx` | Revert to Download CTA |
| `apps/web/src/app/_landing/download-button.tsx` | Revert to Download links |
| `apps/web/src/app/_landing/final-cta.tsx` | Revert to Download CTA |
| `apps/web/src/app/_landing/sticky-cta.tsx` | Revert to Download CTA |
| `apps/web/src/app/_landing/speed-comparison-section.tsx` | Revert to Download button |
| `packages/email/src/templates/subscription-cancelled.tsx` | Restore free-tier copy |
| `packages/payment/.../on-subscription-deleted.ts` | Restore free-tier comment |
| `apps/web/src/app/(authenticated)/app/usage/page.tsx` | Restore Weekly Usage Limit UI |
| `apps/desktop/src/stores/event.store.ts` | Restore "Weekly usage limit reached" toast |
| `apps/desktop/src/lib/gecko-bar-notifications.ts` | Restore "Usage limit reached" |
| `apps/desktop/src/hooks/use-gecko-bar-display-state.ts` | Restore "Usage limit reached" tooltip |
| `apps/desktop/src/routes/_authenticated/usage.tsx` | Restore limit messaging |
| `apps/web/.../pricing/page.tsx` | Metadata only (if needed) |
| Auth pages (sign-in, sign-up) | Default redirect (optional) |

---

## Testing checklist

- [ ] Pricing page shows Basic, Pro, Team (3 cards)
- [ ] Basic "Get Started" → `/download`
- [ ] Pro/Team unauthenticated → intent → sign-up → verify → pricing → auto-checkout
- [ ] Hero CTA → Download for Windows
- [ ] Header/download button → Download
- [ ] Final CTA, sticky CTA, speed comparison → Download
- [ ] Web usage page: Weekly Usage Limit with progress bar
- [ ] Desktop: at limit, "Usage limit reached" toast and gecko bar tooltip
- [ ] Subscription cancelled email mentions "free tier"
- [ ] Admin All Time filter still works
