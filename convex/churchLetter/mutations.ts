import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const now = Date.now()
    return await ctx.db.insert("churchLetters", {
      userId,
      title: args.title.trim() || "Church Letter",
      content: args.content,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    letterId: v.id("churchLetters"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.letterId)
    if (!existing || existing.userId !== userId) throw new Error("Church letter not found")

    const patch: any = { updatedAt: Date.now() }
    if (args.title !== undefined) patch.title = args.title.trim() || "Church Letter"
    if (args.content !== undefined) patch.content = args.content
    if (args.status !== undefined) patch.status = args.status

    await ctx.db.patch(args.letterId, patch)
    return args.letterId
  },
})

export const remove = mutation({
  args: { letterId: v.id("churchLetters") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.letterId)
    if (!existing || existing.userId !== userId) throw new Error("Church letter not found")

    await ctx.db.delete(args.letterId)
    return args.letterId
  },
})
