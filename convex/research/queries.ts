import { query } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const notes = await ctx.db
      .query("researchNotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()

    return notes
  },
})

export const getById = query({
  args: { noteId: v.id("researchNotes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const note = await ctx.db.get(args.noteId)
    if (!note || note.userId !== userId) return null

    return note
  },
})