import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    scriptureRef: v.string(),
    content: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const now = Date.now()
    const id = await ctx.db.insert("devotionals", {
      userId,
      scriptureRef: args.scriptureRef,
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
    devotionalId: v.id("devotionals"),
    scriptureRef: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const { devotionalId, ...updates } = args
    const existing = await ctx.db.get(devotionalId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Devotional not found or not authorized")
    }

    await ctx.db.patch(devotionalId, {
      ...updates,
      updatedAt: Date.now(),
    })
    return devotionalId
  },
})

export const remove = mutation({
  args: { devotionalId: v.id("devotionals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.devotionalId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Devotional not found or not authorized")
    }

    await ctx.db.delete(args.devotionalId)
    return args.devotionalId
  },
})
