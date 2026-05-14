import { query } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const seriesList = await ctx.db
      .query("series")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()

    return seriesList
  },
})

export const getWithWeeks = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const series = await ctx.db.get(args.seriesId)
    if (!series || series.userId !== userId) return null

    const weeks = await ctx.db
      .query("seriesWeeks")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .order("asc")
      .collect()

    return { series, weeks }
  },
})