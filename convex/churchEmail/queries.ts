import { query } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("churchEmails")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

export const getById = query({
  args: { emailId: v.id("churchEmails") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const email = await ctx.db.get(args.emailId)
    if (!email || email.userId !== userId) return null

    return email
  },
})
