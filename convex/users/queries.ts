import { query } from "../_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const authUser = await ctx.db.get(userId)
    if (!authUser) return null

    const profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    const needsOnboarding = !profile?.onboardingComplete

    return {
      _id: userId,
      email: authUser.email,
      name: profile?.pastorName ?? authUser.name ?? "",
      creditBalance: profile?.creditBalance ?? 0,
      hasProfile: !!profile,
      needsOnboarding,
    }
  },
})

export const getBrevoContact = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    return await ctx.db
      .query("brevoContacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100)
    const profiles = await ctx.db.query("churchProfiles").take(100)
    const accounts = await ctx.db.query("authAccounts").take(100)
    const sessions = await ctx.db.query("authSessions").take(100)

    return {
      users: users.map((u: any) => ({
        _id: u._id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        image: u.image,
      })),
      profiles: profiles.map((p: any) => ({
        _id: p._id,
        userId: p.userId,
        pastorName: p.pastorName,
        churchName: p.churchName,
        creditBalance: p.creditBalance,
      })),
      accounts: accounts.map((a: any) => ({
        _id: a._id,
        userId: a.userId,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
      })),
      sessions: sessions.map((s: any) => ({
        _id: s._id,
        userId: s.userId,
        expirationTime: s.expirationTime,
      })),
    }
  },
})
