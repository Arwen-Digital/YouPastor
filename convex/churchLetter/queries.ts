import { query } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("churchLetters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

export const getById = query({
  args: { letterId: v.id("churchLetters") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const letter = await ctx.db.get(args.letterId)
    if (!letter || letter.userId !== userId) return null

    return letter
  },
})
