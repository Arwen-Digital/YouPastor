import { query } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const getBySermonId = query({
  args: { sermonId: v.id("sermons") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const sermon = await ctx.db.get(args.sermonId)
    if (!sermon || sermon.userId !== userId) return null

    return await ctx.db
      .query("sermonAssistSessions")
      .withIndex("by_sermon", (q) => q.eq("sermonId", args.sermonId))
      .unique()
  },
})
