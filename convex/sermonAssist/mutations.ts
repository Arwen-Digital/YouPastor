import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

const messageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
  model: v.optional(v.string()),
  citations: v.optional(v.array(v.string())),
})

export const save = mutation({
  args: {
    sermonId: v.id("sermons"),
    messages: v.array(messageValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const sermon = await ctx.db.get(args.sermonId)
    if (!sermon || sermon.userId !== userId) throw new Error("Sermon not found")

    const messages = args.messages.slice(-50)
    const existing = await ctx.db
      .query("sermonAssistSessions")
      .withIndex("by_sermon", (q) => q.eq("sermonId", args.sermonId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages,
        updatedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert("sermonAssistSessions", {
      userId,
      sermonId: args.sermonId,
      messages,
      updatedAt: Date.now(),
    })
  },
})

export const clear = mutation({
  args: { sermonId: v.id("sermons") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const sermon = await ctx.db.get(args.sermonId)
    if (!sermon || sermon.userId !== userId) throw new Error("Sermon not found")

    const existing = await ctx.db
      .query("sermonAssistSessions")
      .withIndex("by_sermon", (q) => q.eq("sermonId", args.sermonId))
      .unique()

    if (existing) await ctx.db.delete(existing._id)
    return true
  },
})
