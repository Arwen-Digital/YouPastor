import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    title: v.string(),
    tagline: v.optional(v.string()),
    scopeAssessment: v.optional(v.string()),
    seriesArc: v.optional(v.string()),
    durationCheck: v.optional(v.string()),
    specialAttention: v.optional(v.string()),
    launchRecommendation: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    weeks: v.optional(
      v.array(
        v.object({
          weekNumber: v.number(),
          sermonTitle: v.optional(v.string()),
          scriptureRef: v.optional(v.string()),
          bigIdea: v.optional(v.string()),
          connectiveThread: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const { weeks, ...seriesFields } = args

    const now = Date.now()
    const seriesId = await ctx.db.insert("series", {
      userId,
      ...seriesFields,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })

    if (weeks && weeks.length > 0) {
      for (const week of weeks) {
        await ctx.db.insert("seriesWeeks", {
          seriesId,
          userId,
          ...week,
        })
      }
    }

    return seriesId
  },
})

export const update = mutation({
  args: {
    seriesId: v.id("series"),
    title: v.optional(v.string()),
    tagline: v.optional(v.string()),
    scopeAssessment: v.optional(v.string()),
    seriesArc: v.optional(v.string()),
    durationCheck: v.optional(v.string()),
    specialAttention: v.optional(v.string()),
    launchRecommendation: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const { seriesId, ...updates } = args
    const existing = await ctx.db.get(seriesId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Series not found or not authorized")
    }

    await ctx.db.patch(seriesId, {
      ...updates,
      updatedAt: Date.now(),
    })
    return seriesId
  },
})

export const remove = mutation({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.seriesId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Series not found or not authorized")
    }

    // Delete all associated weeks
    const weeks = await ctx.db
      .query("seriesWeeks")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect()

    for (const week of weeks) {
      await ctx.db.delete(week._id)
    }

    await ctx.db.delete(args.seriesId)
    return args.seriesId
  },
})