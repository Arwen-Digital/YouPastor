import { query } from "../_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const getMyBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    return {
      creditBalance: profile?.creditBalance ?? 0,
    }
  },
})

export const listMyLedger = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("creditLedger")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50)
  },
})

export const listMyAiUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("aiUsage")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50)
  },
})
