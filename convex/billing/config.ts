export const PLAN_MONTHLY_CREDITS = {
  free: 100,
  starter: 400,
  pro: 1000,
} as const

export type PlanTier = keyof typeof PLAN_MONTHLY_CREDITS

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "none"
  | "paused"
  | "expired"

export function planFromVariantId(variantId?: string | null): PlanTier {
  if (!variantId) return "free"
  const starter = (process.env.LEMONSQUEEZY_VARIANT_STARTER ?? "").trim()
  const pro = (process.env.LEMONSQUEEZY_VARIANT_PRO ?? "").trim()
  if (starter && variantId === starter) return "starter"
  if (pro && variantId === pro) return "pro"
  return "free"
}

export function creditsForPlan(plan: PlanTier): number {
  return PLAN_MONTHLY_CREDITS[plan]
}

export function normalizeSubscriptionStatus(status?: string | null): SubscriptionStatus {
  const raw = (status ?? "").trim().toLowerCase()
  if (raw === "active") return "active"
  if (raw === "past_due") return "past_due"
  if (raw === "cancelled" || raw === "canceled") return "canceled"
  if (raw === "trialing") return "trialing"
  if (raw === "paused") return "paused"
  if (raw === "expired") return "expired"
  return "none"
}
