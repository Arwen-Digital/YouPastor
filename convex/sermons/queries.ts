import { query } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("sermons")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("sermons")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 4)
  },
})

export const getById = query({
  args: { sermonId: v.optional(v.id("sermons")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !args.sermonId) return null

    const sermon = await ctx.db.get(args.sermonId)
    if (!sermon || sermon.userId !== userId) return null

    return sermon
  },
})

export const getBySeriesId = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const series = await ctx.db.get(args.seriesId)
    if (!series || series.userId !== userId) return []

    const sermons = await ctx.db
      .query("sermons")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect()

    return sermons
      .filter((sermon) => sermon.userId === userId)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  },
})
