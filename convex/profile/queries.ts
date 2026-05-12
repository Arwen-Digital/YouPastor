import { query } from "../_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    return await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()
  },
})
