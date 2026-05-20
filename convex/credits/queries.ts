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

export const listMyCreditAdditions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const ledger = await ctx.db
      .query("creditLedger")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100)

    const legacy = await ctx.db
      .query("creditTransactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100)

    const normalizedLedger = ledger
      .filter((row: any) => row.amount > 0)
      .filter((row: any) => row.type === "grant" || row.type === "adjustment" || row.type === "subscription_grant")
      .map((row: any) => ({
        _id: row._id,
        source: "ledger",
        amount: row.amount,
        type: row.type,
        description: row.reason,
        createdAt: row.createdAt,
      }))

    const normalizedLegacy = legacy
      .filter((row: any) => row.amount > 0)
      .filter((row: any) => row.type === "purchase")
      .map((row: any) => ({
        _id: row._id,
        source: "legacy",
        amount: row.amount,
        type: row.type,
        description: row.description,
        createdAt: row.createdAt,
      }))

    return [...normalizedLedger, ...normalizedLegacy]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100)
  },
})
