import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    title: v.string(),
    scriptureRef: v.optional(v.string()),
    content: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("archived")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    if (args.seriesId) {
      const series = await ctx.db.get(args.seriesId)
      if (!series || series.userId !== userId) throw new Error("Series not found")
    }

    const now = Date.now()
    return await ctx.db.insert("sermons", {
      userId,
      title: args.title.trim() || "Untitled sermon",
      scriptureRef: args.scriptureRef?.trim() || undefined,
      content: args.content,
      seriesId: args.seriesId,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    sermonId: v.id("sermons"),
    title: v.optional(v.string()),
    scriptureRef: v.optional(v.string()),
    content: v.optional(v.string()),
    seriesId: v.optional(v.union(v.id("series"), v.null())),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("archived")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const sermon = await ctx.db.get(args.sermonId)
    if (!sermon || sermon.userId !== userId) throw new Error("Sermon not found")

    if (args.seriesId) {
      const series = await ctx.db.get(args.seriesId)
      if (!series || series.userId !== userId) throw new Error("Series not found")
    }

    const patch: Partial<typeof sermon> = {
      updatedAt: Date.now(),
    }

    if (args.title !== undefined) patch.title = args.title.trim() || "Untitled sermon"
    if (args.scriptureRef !== undefined) patch.scriptureRef = args.scriptureRef.trim() || undefined
    if (args.content !== undefined) patch.content = args.content
    if (args.seriesId !== undefined) patch.seriesId = args.seriesId === null ? undefined : args.seriesId
    if (args.status !== undefined) patch.status = args.status

    await ctx.db.patch(args.sermonId, patch)
    return args.sermonId
  },
})
