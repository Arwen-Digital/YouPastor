import { query } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("brainstormBriefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

export const getById = query({
  args: { briefId: v.id("brainstormBriefs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const brief = await ctx.db.get(args.briefId)
    if (!brief || brief.userId !== userId) return null

    return brief
  },
})

export const getBySeriesId = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("brainstormBriefs")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect()
  },
})