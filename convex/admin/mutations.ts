import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import { FREE_SIGNUP_CREDITS } from "../credits/config"
import { creditsForPlan, type PlanTier } from "../billing/config"

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

export const fixSubscriptionTier = mutation({
  args: {
    userId: v.id("users"),
    planTier: v.union(v.literal("free"), v.literal("starter"), v.literal("pro")),
    subscriptionStatus: v.optional(v.union(
      v.literal("active"), v.literal("past_due"), v.literal("canceled"),
      v.literal("trialing"), v.literal("none"), v.literal("paused"), v.literal("expired")
    )),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const now = Date.now()
    const planTier = args.planTier as PlanTier
    const status = args.subscriptionStatus ?? "active"

    let subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first()

    if (!subscription) {
      const subId = await ctx.db.insert("subscriptions", {
        userId: args.userId,
        planTier,
        subscriptionStatus: status,
        currentPeriodEnd: undefined,
        lastCreditsResetAt: undefined,
        createdAt: now,
        updatedAt: now,
      })
      subscription = await ctx.db.get(subId)
    } else {
      await ctx.db.patch(subscription._id, {
        planTier,
        subscriptionStatus: status,
        updatedAt: now,
      })
    }

    // Ensure credits match the plan tier
    let profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .first()

    if (profile) {
      const targetCredits = creditsForPlan(planTier)
      if (profile.creditBalance < targetCredits) {
        const grantAmount = targetCredits - profile.creditBalance
        await ctx.db.patch(profile._id, { creditBalance: targetCredits })
        await ctx.db.insert("creditLedger", {
          userId: args.userId,
          amount: grantAmount,
          type: "adjustment",
          reason: `Admin fix: set tier to ${planTier} and top up credits`,
          createdAt: now,
        })
      }
    }

    return {
      subscriptionId: subscription?._id,
      planTier: planTier,
      subscriptionStatus: status,
    }
  },
})

export const createVoucher = mutation({
  args: {
    code: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const code = args.code.trim().toUpperCase()
    if (!code) throw new Error("Voucher code is required")
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error("Voucher code must contain only letters, numbers, dashes, or underscores")
    }

    const credits = Math.floor(args.credits)
    if (credits <= 0) throw new Error("Credits must be greater than 0")

    const existing = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q: any) => q.eq("code", code))
      .first()

    if (existing) throw new Error("Voucher code already exists")

    const voucherId = await ctx.db.insert("vouchers", {
      code,
      credits,
      createdAt: Date.now(),
    })

    return { voucherId, code, credits }
  },
})

export const deleteVoucher = mutation({
  args: {
    voucherId: v.id("vouchers"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const voucher = await ctx.db.get(args.voucherId)
    if (!voucher) throw new Error("Voucher not found")

    await ctx.db.delete(args.voucherId)

    return { success: true }
  },
})
