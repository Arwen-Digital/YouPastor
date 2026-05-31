import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import { FREE_SIGNUP_CREDITS } from "../credits/config"

export const upsert = mutation({
  args: {
    churchName: v.optional(v.string()),
    pastorName: v.optional(v.string()),
    pastorFirstName: v.optional(v.string()),
    pastorLastName: v.optional(v.string()),
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

    const computedPastorName = [args.pastorFirstName ?? "", args.pastorLastName ?? ""].filter(Boolean).join(" ").trim()
    const normalizedArgs = {
      ...args,
      pastorName: computedPastorName || args.pastorName,
    }

    if (existing) {
      await ctx.db.patch(existing._id, normalizedArgs)
      return existing._id
    }

    return await ctx.db.insert("churchProfiles", {
      userId,
      churchName: normalizedArgs.churchName ?? "",
      pastorName: normalizedArgs.pastorName ?? "",
      pastorFirstName: normalizedArgs.pastorFirstName,
      pastorLastName: normalizedArgs.pastorLastName,
      denomination: normalizedArgs.denomination,
      averageAttendance: normalizedArgs.averageAttendance,
      location: normalizedArgs.location,
      bibleTranslation: normalizedArgs.bibleTranslation,
      onboardingComplete: normalizedArgs.onboardingComplete,
      creditBalance: FREE_SIGNUP_CREDITS,
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

    const fullName = (args.pastorName ?? "").trim()
    const nameParts = fullName ? fullName.split(/\s+/) : []
    const pastorFirstName = nameParts[0] ?? ""
    const pastorLastName = nameParts.slice(1).join(" ")

    return await ctx.db.insert("churchProfiles", {
      userId,
      churchName: "",
      pastorName: fullName,
      pastorFirstName,
      pastorLastName,
      creditBalance: FREE_SIGNUP_CREDITS,
    })
  },
})
