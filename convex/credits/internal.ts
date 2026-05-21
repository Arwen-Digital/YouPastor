import { internalMutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import { FREE_SIGNUP_CREDITS } from "./config"

async function getOrCreateProfile(ctx: any, userId: any) {
  const existing = await ctx.db
    .query("churchProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first()

  if (existing) return existing

  const profileId = await ctx.db.insert("churchProfiles", {
    userId,
    churchName: "",
    pastorName: "",
    onboardingComplete: false,
    creditBalance: FREE_SIGNUP_CREDITS,
  })

  return await ctx.db.get(profileId)
}

export const assertSufficientCredits = internalMutation({
  args: {
    requiredCredits: v.number(),
    operation: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const profile = await getOrCreateProfile(ctx, userId)
    if (!profile) throw new Error("Failed to load profile")

    if (profile.creditBalance < args.requiredCredits) {
      throw new Error(
        `INSUFFICIENT_CREDITS: Need ${args.requiredCredits} credits for ${args.operation}, but only ${profile.creditBalance} available.`
      )
    }

    return {
      profileId: profile._id,
      currentBalance: profile.creditBalance,
    }
  },
})

export const recordUsageSuccess = internalMutation({
  args: {
    operation: v.string(),
    skillSlug: v.optional(v.string()),
    modelRole: v.union(v.literal("orchestrator"), v.literal("generator"), v.literal("researcher")),
    model: v.string(),
    providerRequestId: v.optional(v.string()),
    providerCostUsdMicros: v.number(),
    creditsCharged: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const profile = await getOrCreateProfile(ctx, userId)
    if (!profile) throw new Error("Failed to load profile")

    if (profile.creditBalance < args.creditsCharged) {
      throw new Error(
        `INSUFFICIENT_CREDITS: Need ${args.creditsCharged} credits for ${args.operation}, but only ${profile.creditBalance} available.`
      )
    }

    const now = Date.now()

    const aiUsageId = await ctx.db.insert("aiUsage", {
      userId,
      operation: args.operation,
      skillSlug: args.skillSlug,
      modelRole: args.modelRole,
      model: args.model,
      provider: "openrouter",
      providerRequestId: args.providerRequestId,
      providerCostUsdMicros: args.providerCostUsdMicros,
      creditsCharged: args.creditsCharged,
      status: "succeeded",
      createdAt: now,
    })

    await ctx.db.insert("creditLedger", {
      userId,
      amount: -args.creditsCharged,
      type: "usage",
      reason: `AI usage: ${args.operation}`,
      aiUsageId,
      createdAt: now,
    })

    const newBalance = profile.creditBalance - args.creditsCharged
    await ctx.db.patch(profile._id, {
      creditBalance: newBalance,
    })

    return {
      aiUsageId,
      remainingCredits: newBalance,
    }
  },
})

export const recordUsageFailure = internalMutation({
  args: {
    operation: v.string(),
    skillSlug: v.optional(v.string()),
    modelRole: v.union(v.literal("orchestrator"), v.literal("generator"), v.literal("researcher")),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    await ctx.db.insert("aiUsage", {
      userId,
      operation: args.operation,
      skillSlug: args.skillSlug,
      modelRole: args.modelRole,
      model: args.model,
      provider: "openrouter",
      providerRequestId: undefined,
      providerCostUsdMicros: 0,
      creditsCharged: 0,
      status: "failed",
      createdAt: Date.now(),
    })

    return true
  },
})

export const refillFreeUsersMonthly = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const periodKey = new Date(now).toISOString().slice(0, 7)
    const reason = `Free monthly refill (${periodKey})`

    const profiles = await ctx.db.query("churchProfiles").collect()
    const subscriptions = await ctx.db.query("subscriptions").collect()

    const latestSubscriptionByUser = new Map<string, any>()
    for (const subscription of subscriptions) {
      const key = String(subscription.userId)
      const existing = latestSubscriptionByUser.get(key)
      if (!existing || (subscription.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
        latestSubscriptionByUser.set(key, subscription)
      }
    }

    let checked = 0
    let refilled = 0
    let skippedPaid = 0
    let skippedAlreadyRefilled = 0

    for (const profile of profiles) {
      checked += 1
      const subscription = latestSubscriptionByUser.get(String(profile.userId))
      const isActivePaid =
        subscription?.planTier !== undefined &&
        subscription.planTier !== "free" &&
        (subscription.subscriptionStatus === "active" ||
          subscription.subscriptionStatus === "trialing" ||
          subscription.subscriptionStatus === "past_due")

      if (isActivePaid) {
        skippedPaid += 1
        continue
      }

      const recentLedger = await ctx.db
        .query("creditLedger")
        .withIndex("by_user_created", (q: any) => q.eq("userId", profile.userId))
        .order("desc")
        .take(200)

      if (recentLedger.some((entry: any) => entry.reason === reason)) {
        skippedAlreadyRefilled += 1
        continue
      }

      const grantAmount = Math.max(0, FREE_SIGNUP_CREDITS - profile.creditBalance)
      if (grantAmount <= 0) continue

      await ctx.db.patch(profile._id, {
        creditBalance: profile.creditBalance + grantAmount,
      })

      await ctx.db.insert("creditLedger", {
        userId: profile.userId,
        amount: grantAmount,
        type: "grant",
        reason,
        createdAt: now,
      })

      refilled += 1
    }

    return {
      periodKey,
      checked,
      refilled,
      skippedPaid,
      skippedAlreadyRefilled,
    }
  },
})
