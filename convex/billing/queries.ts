import { query } from "../_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const getMyPlanAndCredits = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    return {
      planTier: subscription?.planTier ?? "free",
      subscriptionStatus: subscription?.subscriptionStatus ?? "none",
      currentPeriodEnd: subscription?.currentPeriodEnd,
      creditBalance: profile?.creditBalance ?? 0,
      nextRefillAt: subscription?.currentPeriodEnd,
    }
  },
})
