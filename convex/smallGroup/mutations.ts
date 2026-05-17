import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    sermonId: v.optional(v.id("sermons")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    if (args.sermonId) {
      const sermon = await ctx.db.get(args.sermonId)
      if (!sermon || sermon.userId !== userId) throw new Error("Sermon not found")
    }

    const now = Date.now()
    return await ctx.db.insert("smallGroupGuides", {
      userId,
      title: args.title.trim() || "Small Group Questions",
      content: args.content,
      sermonId: args.sermonId,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    guideId: v.id("smallGroupGuides"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    sermonId: v.optional(v.union(v.id("sermons"), v.null())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.guideId)
    if (!existing || existing.userId !== userId) throw new Error("Small group guide not found")

    const patch: any = { updatedAt: Date.now() }
    if (args.title !== undefined) patch.title = args.title.trim() || "Small Group Questions"
    if (args.content !== undefined) patch.content = args.content
    if (args.sermonId !== undefined) patch.sermonId = args.sermonId === null ? undefined : args.sermonId
    if (args.status !== undefined) patch.status = args.status

    await ctx.db.patch(args.guideId, patch)
    return args.guideId
  },
})

export const remove = mutation({
  args: { guideId: v.id("smallGroupGuides") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.guideId)
    if (!existing || existing.userId !== userId) throw new Error("Small group guide not found")

    await ctx.db.delete(args.guideId)
    return args.guideId
  },
})
