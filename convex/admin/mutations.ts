import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import { FREE_SIGNUP_CREDITS } from "../credits/config"

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error("Not authenticated")

  const authUser = await ctx.db.get(userId)
  const email = (authUser?.email ?? "").toLowerCase()
  if (email !== "arnold@lifecity.ph") {
    throw new Error("Forbidden")
  }

  return { userId, authUser }
}

export const giftCredits = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const { authUser } = await requireAdmin(ctx)

    const amount = Math.floor(args.amount)
    if (amount <= 0) throw new Error("Amount must be greater than 0")
    const note = args.note.trim()
    if (!note) throw new Error("Note is required")

    let profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .first()

    if (!profile) {
      const profileId = await ctx.db.insert("churchProfiles", {
        userId: args.userId,
        churchName: "",
        pastorName: "",
        onboardingComplete: false,
        creditBalance: FREE_SIGNUP_CREDITS,
      })
      profile = await ctx.db.get(profileId)
    }

    if (!profile) throw new Error("Unable to load user profile")

    const newBalance = profile.creditBalance + amount
    await ctx.db.patch(profile._id, { creditBalance: newBalance })

    await ctx.db.insert("creditLedger", {
      userId: args.userId,
      amount,
      type: "adjustment",
      reason: `Admin gift by ${authUser?.email ?? "admin"}: ${note}`,
      createdAt: Date.now(),
    })

    return { creditBalance: newBalance }
  },
})
