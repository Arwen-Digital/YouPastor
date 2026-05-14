import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    scriptureRef: v.string(),
    topicOrAngle: v.optional(v.string()),
    content: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const now = Date.now()
    const noteId = await ctx.db.insert("researchNotes", {
      userId,
      scriptureRef: args.scriptureRef,
      topicOrAngle: args.topicOrAngle,
      content: args.content,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })

    return noteId
  },
})

export const update = mutation({
  args: {
    noteId: v.id("researchNotes"),
    scriptureRef: v.optional(v.string()),
    topicOrAngle: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const { noteId, ...updates } = args
    const existing = await ctx.db.get(noteId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Research note not found or not authorized")
    }

    await ctx.db.patch(noteId, {
      ...updates,
      updatedAt: Date.now(),
    })
    return noteId
  },
})

export const remove = mutation({
  args: { noteId: v.id("researchNotes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.noteId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Research note not found or not authorized")
    }

    await ctx.db.delete(args.noteId)
    return args.noteId
  },
})
