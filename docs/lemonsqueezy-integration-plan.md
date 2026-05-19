# LemonSqueezy Recurring Billing Integration Plan (YouPastor)

## Goal
Integrate LemonSqueezy recurring subscriptions into YouPastor (Electron + Convex), with tier-based monthly credits:

- Free: 100 credits
- Starter: $9/mo, 400 credits
- Pro: $19/mo, 1000 credits

Also reduce expensive AI operation costs so paid tiers feel better in real usage.

---

## A) Credit Pricing Change (Do First)

Update `convex/credits/config.ts`:

- `sermon_research: 20 -> 14` (recommended)
- Optional secondary adjustments:
  - `series_plan: 15 -> 12`
  - `sermon_brainstorm: 12 -> 10`

Keep other operation costs unchanged for now. Revisit after usage analytics.

---

## B) Subscription Model + Schema

### 1) Add billing fields
In `convex/schema.ts`, add fields (either in user profile table or a dedicated `subscriptions` table):

- `planTier`: `'free' | 'starter' | 'pro'`
- `subscriptionStatus`: `'active' | 'past_due' | 'canceled' | 'trialing' | 'none'`
- `lemonsqueezyCustomerId`
- `lemonsqueezySubscriptionId`
- `lemonsqueezyVariantId`
- `currentPeriodEnd`
- `lastCreditsResetAt`

Recommended: dedicated `subscriptions` table keyed by `userId` for cleaner separation.

---

## C) Environment + Secrets

### 2) Add backend env vars (Convex env)

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_VARIANT_STARTER`
- `LEMONSQUEEZY_VARIANT_PRO`
- `APP_BASE_URL` (success/cancel URL base)

Set in both local and remote Convex environments.

---

## D) Checkout Flow

### 3) Create Convex action for checkout URL
New file: `convex/billing/actions.ts`

Action: `createCheckout`

- Input: `{ tier: 'starter' | 'pro' }`
- Resolve authenticated user
- Call LemonSqueezy API to create checkout URL for the selected variant
- Include user ID/email in metadata/custom data
- Return checkout URL

### 4) Frontend upgrade button wiring
In Settings/Upgrade UI:

- Call `createCheckout`
- Open URL in external browser:
  - Electron: `shell.openExternal(...)`
  - Web fallback: `window.open(...)`

---

## E) Webhook Handling (Source of Truth)

### 5) Build webhook receiver service
Run a small Node/Express (or serverless) webhook endpoint that:

- Receives LemonSqueezy webhook payload
- Verifies signature using `LEMONSQUEEZY_WEBHOOK_SECRET`
- Maps event payload to internal subscription model
- Calls Convex mutation/action (admin/authenticated internal path) to sync subscription + credits

Why external receiver: straightforward raw webhook signature verification and flexible retry handling.

### 6) Add Convex mutation for webhook sync
New file: `convex/billing/mutations.ts`

Mutation responsibilities:

- Upsert subscription record by `lemonsqueezySubscriptionId`
- Map variant -> `planTier`
- Update `subscriptionStatus`, `currentPeriodEnd`, and billing IDs
- On successful payment/renewal, refill credits according to plan and set `lastCreditsResetAt`

### 7) Handle these webhook events

- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`
- `subscription_payment_success`
- `subscription_payment_failed`
- Optional: `order_created`

---

## F) Credit Allocation Policy

### 8) Plan credits
- Free: 100 credits
- Starter: 400 credits/month
- Pro: 1000 credits/month

Recommended policy:

- Free = one-time signup credits (simplest anti-abuse)
- Paid = refill on successful monthly renewal webhook

---

## G) App Behavior + UI

### 9) Billing queries
Create `convex/billing/queries.ts`:

Query: `getMyPlanAndCredits`

Returns:
- `planTier`
- `subscriptionStatus`
- `currentPeriodEnd`
- `creditBalance`
- `nextRefillAt` (if computable)

### 10) Settings/Billing UI
Show:
- current plan
- credits remaining
- renewal date
- upgrade/downgrade CTA
- manage subscription CTA (customer portal link)

---

## H) Migration + Rollout

### 11) Backfill existing users
Migration script/mutation:

- If no plan set: `planTier='free'`, `subscriptionStatus='none'`
- Keep existing credit balances

### 12) Test matrix
Validate end-to-end:

- New signup receives free credits
- Starter checkout success
- Pro checkout success
- Renewal refills monthly credits
- Cancel updates status correctly (access until period end if applicable)
- Payment failed does not refill credits
- Low-credit UX still shows clean human-readable error

---

## Suggested Phase 1 Implementation Order

1. Reduce expensive AI operation credits (`convex/credits/config.ts`)
2. Add schema fields/table for subscriptions
3. Add billing queries/mutations scaffolding
4. Build checkout action + wire Upgrade button
5. Implement webhook receiver + Convex sync mutation
6. Add billing UI status + plan controls
7. Run migration and full test matrix
