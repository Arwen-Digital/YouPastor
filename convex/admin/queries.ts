import { query } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

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

export const listRecentUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const users = await ctx.db.query("users").order("desc").take(10)
    const profiles = await ctx.db.query("churchProfiles").take(500)
    const profileByUserId = new Map(profiles.map((p: any) => [String(p.userId), p]))

    return users.map((u: any) => {
      const profile = profileByUserId.get(String(u._id))
      return {
        _id: u._id,
        email: u.email ?? "",
        name: profile?.pastorName ?? u.name ?? "",
        churchName: profile?.churchName ?? "",
        creditBalance: profile?.creditBalance ?? 0,
      }
    })
  },
})

export const searchUsers = query({
  args: { term: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const term = args.term.trim().toLowerCase()
    if (!term) return []

    const users = await ctx.db.query("users").take(500)
    const profiles = await ctx.db.query("churchProfiles").take(500)
    const profileByUserId = new Map(profiles.map((p: any) => [String(p.userId), p]))

    return users
      .filter((u: any) => {
        const email = (u.email ?? "").toLowerCase()
        const name = (u.name ?? "").toLowerCase()
        const profile = profileByUserId.get(String(u._id))
        const pastorName = (profile?.pastorName ?? "").toLowerCase()
        return email.includes(term) || name.includes(term) || pastorName.includes(term)
      })
      .slice(0, 20)
      .map((u: any) => {
        const profile = profileByUserId.get(String(u._id))
        return {
          _id: u._id,
          email: u.email ?? "",
          name: profile?.pastorName ?? u.name ?? "",
          churchName: profile?.churchName ?? "",
          creditBalance: profile?.creditBalance ?? 0,
        }
      })
  },
})

export const getUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const authUser = await ctx.db.get(args.userId)
    if (!authUser) return null

    const profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .first()

    return {
      _id: authUser._id,
      email: authUser.email ?? "",
      name: profile?.pastorName ?? authUser.name ?? "",
      churchName: profile?.churchName ?? "",
      denomination: profile?.denomination ?? "",
      creditBalance: profile?.creditBalance ?? 0,
      createdAt: authUser._creationTime,
    }
  },
})

export const getUserTransactions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const ledger = await ctx.db
      .query("creditLedger")
      .withIndex("by_user_created", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .take(150)

    const legacy = await ctx.db
      .query("creditTransactions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .take(150)

    const normalizedLedger = ledger
      .filter((row: any) => row.amount > 0)
      .filter((row: any) => row.type === "grant" || row.type === "adjustment" || row.type === "subscription_grant")
      .map((row: any) => ({
        _id: row._id,
        source: "ledger",
        amount: row.amount,
        type: row.type,
        description: row.reason,
        createdAt: row.createdAt,
      }))

    const normalizedLegacy = legacy
      .filter((row: any) => row.amount > 0)
      .filter((row: any) => row.type === "purchase")
      .map((row: any) => ({
        _id: row._id,
        source: "legacy",
        amount: row.amount,
        type: row.type,
        description: row.description,
        createdAt: row.createdAt,
      }))

    return [...normalizedLedger, ...normalizedLegacy]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 150)
  },
})

export const getBillingDebug = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .take(20)

    const webhookEvents = await ctx.db
      .query("billingWebhookEvents")
      .order("desc")
      .take(50)

    const profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .first()

    return {
      profile: profile
        ? {
            userId: profile.userId,
            creditBalance: profile.creditBalance,
          }
        : null,
      subscriptions: subscriptions.map((s: any) => ({
        _id: s._id,
        userId: s.userId,
        planTier: s.planTier,
        subscriptionStatus: s.subscriptionStatus,
        lemonsqueezyCustomerId: s.lemonsqueezyCustomerId,
        lemonsqueezySubscriptionId: s.lemonsqueezySubscriptionId,
        lemonsqueezyVariantId: s.lemonsqueezyVariantId,
        currentPeriodEnd: s.currentPeriodEnd,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        _creationTime: s._creationTime,
      })),
      webhookEvents,
    }
  },
})

export const listVouchers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const vouchers = await ctx.db
      .query("vouchers")
      .order("desc")
      .collect()

    return vouchers
  },
})
