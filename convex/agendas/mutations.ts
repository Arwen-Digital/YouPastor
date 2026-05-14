import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const create = mutation({
  args: {
    meetingType: v.string(),
    content: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const now = Date.now()
    const id = await ctx.db.insert("meetingAgendas", {
      userId,
      meetingType: args.meetingType,
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
    agendaId: v.id("meetingAgendas"),
    meetingType: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const { agendaId, ...updates } = args
    const existing = await ctx.db.get(agendaId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Agenda not found or not authorized")
    }

    await ctx.db.patch(agendaId, {
      ...updates,
      updatedAt: Date.now(),
    })
    return agendaId
  },
})

export const remove = mutation({
  args: { agendaId: v.id("meetingAgendas") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.agendaId)
    if (!existing || existing.userId !== userId) {
      throw new Error("Agenda not found or not authorized")
    }

    await ctx.db.delete(args.agendaId)
    return args.agendaId
  },
})
