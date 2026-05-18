import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const upsert = mutation({
  args: {
    churchName: v.optional(v.string()),
    pastorName: v.optional(v.string()),
    denomination: v.optional(v.string()),
    averageAttendance: v.optional(v.string()),
    location: v.optional(v.string()),
    bibleTranslation: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, args)
      return existing._id
    }

    return await ctx.db.insert("churchProfiles", {
      userId,
      churchName: args.churchName ?? "",
      pastorName: args.pastorName ?? "",
      denomination: args.denomination,
      averageAttendance: args.averageAttendance,
      location: args.location,
      bibleTranslation: args.bibleTranslation,
      onboardingComplete: args.onboardingComplete,
      creditBalance: 50,
    })
  },
})

export const createMinimal = mutation({
  args: {
    pastorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (existing) return existing._id

    return await ctx.db.insert("churchProfiles", {
      userId,
      churchName: "",
      pastorName: args.pastorName ?? "",
      creditBalance: 50,
    })
  },
})
