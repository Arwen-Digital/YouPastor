import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    passage: v.string(),
    bigIdea: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    content: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const now = Date.now()
    const id = await ctx.db.insert("brainstormBriefs", {
      userId,
      passage: args.passage,
      bigIdea: args.bigIdea,
      seriesId: args.seriesId,
      content: args.content,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })

    return id
  },
})

export const update = mutation({
  args: {
    briefId: v.id("brainstormBriefs"),
    passage: v.optional(v.string()),
    bigIdea: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const { briefId, ...updates } = args
    const existing = await ctx.db.get(briefId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Brief not found or not authorized")
    }

    await ctx.db.patch(briefId, {
      ...updates,
      updatedAt: Date.now(),
    })
    return briefId
  },
})

export const remove = mutation({
  args: { briefId: v.id("brainstormBriefs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.briefId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Brief not found or not authorized")
    }

    await ctx.db.delete(args.briefId)
    return args.briefId
  },
})
