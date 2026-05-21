import { internalMutation } from "../_generated/server"
import { v } from "convex/values"
import { FREE_SIGNUP_CREDITS } from "../credits/config"
import {
  creditsForPlan,
  normalizeSubscriptionStatus,
  planFromVariantId,
  type PlanTier,
  type SubscriptionStatus,
} from "./config"

export const syncSubscriptionFromWebhook = internalMutation({
  args: {
    eventId: v.optional(v.string()),
    eventName: v.string(),
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    lemonsqueezyCustomerId: v.optional(v.string()),
    lemonsqueezySubscriptionId: v.optional(v.string()),
    lemonsqueezyVariantId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    grantCredits: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    if (args.eventId) {
      const already = await ctx.db
        .query("billingWebhookEvents")
        .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId!))
        .first()
      if (already) {
        return { ok: true, duplicate: true }
      }
    }

    let resolvedUserId: any = null

    if (args.userId) {
      const maybeUser = await ctx.db.get(args.userId as any)
      if (maybeUser) resolvedUserId = args.userId as any
    }

    let existingSubscriptionByLookup: any = null

    if (!resolvedUserId && args.lemonsqueezySubscriptionId) {
      existingSubscriptionByLookup = await ctx.db
        .query("subscriptions")
        .withIndex("by_lsq_subscription", (q) => q.eq("lemonsqueezySubscriptionId", args.lemonsqueezySubscriptionId!))
        .first()
      if (existingSubscriptionByLookup?.userId) {
        resolvedUserId = existingSubscriptionByLookup.userId
      }
    }

    if (!resolvedUserId && args.lemonsqueezyCustomerId) {
      existingSubscriptionByLookup = await ctx.db
        .query("subscriptions")
        .withIndex("by_lsq_customer", (q) => q.eq("lemonsqueezyCustomerId", args.lemonsqueezyCustomerId!))
        .first()
      if (existingSubscriptionByLookup?.userId) {
        resolvedUserId = existingSubscriptionByLookup.userId
      }
    }

    if (!resolvedUserId && args.userEmail) {
      const users = await ctx.db.query("users").collect()
      const match = users.find((u: any) => String(u.email ?? "").toLowerCase() === args.userEmail!.toLowerCase())
      if (match?._id) {
        resolvedUserId = match._id
      }
    }

    if (!resolvedUserId) {
      if (args.eventId) {
        await ctx.db.insert("billingWebhookEvents", {
          eventId: args.eventId,
          eventName: args.eventName,
          processedAt: now,
        })
      }
      return { ok: true, ignored: "user_not_found" }
    }

    let profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q) => q.eq("userId", resolvedUserId))
      .first()

    if (!profile) {
      const profileId = await ctx.db.insert("churchProfiles", {
        userId: resolvedUserId,
        churchName: "",
        pastorName: "",
        onboardingComplete: false,
        creditBalance: FREE_SIGNUP_CREDITS,
      })
      profile = await ctx.db.get(profileId)
    }

    if (!profile) throw new Error("Failed to load profile")

    const incomingSubscriptionStatus: SubscriptionStatus = normalizeSubscriptionStatus(args.subscriptionStatus)

    let subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", resolvedUserId))
      .order("desc")
      .first()

    const subscriptionStatus: SubscriptionStatus = incomingSubscriptionStatus !== "none"
      ? incomingSubscriptionStatus
      : (args.eventName === "subscription_payment_success" || args.eventName === "subscription_payment_recovered")
        ? "active"
        : (subscription?.subscriptionStatus ?? "none")

    const mappedPlanTier: PlanTier = planFromVariantId(args.lemonsqueezyVariantId ?? undefined)
    const planTier: PlanTier = args.lemonsqueezyVariantId
      ? (mappedPlanTier === "free" && subscription?.planTier && subscription.planTier !== "free"
        ? subscription.planTier
        : mappedPlanTier)
      : (subscription?.planTier ?? "free")

    console.log("[billing] webhook", args.eventName, {
      resolvedUserId,
      variantId: args.lemonsqueezyVariantId,
      mappedPlanTier,
      existingPlanTier: subscription?.planTier,
      finalPlanTier: planTier,
      status: subscriptionStatus,
      grantCredits: args.grantCredits,
    })

    if (!subscription) {
      const subId = await ctx.db.insert("subscriptions", {
        userId: resolvedUserId,
        planTier,
        subscriptionStatus,
        lemonsqueezyCustomerId: args.lemonsqueezyCustomerId,
        lemonsqueezySubscriptionId: args.lemonsqueezySubscriptionId,
        lemonsqueezyVariantId: args.lemonsqueezyVariantId,
        currentPeriodEnd: args.currentPeriodEnd,
        lastCreditsResetAt: undefined,
        createdAt: now,
        updatedAt: now,
      })
      subscription = await ctx.db.get(subId)
    } else {
      await ctx.db.patch(subscription._id, {
        planTier,
        subscriptionStatus,
        lemonsqueezyCustomerId: args.lemonsqueezyCustomerId ?? subscription.lemonsqueezyCustomerId,
        lemonsqueezySubscriptionId: args.lemonsqueezySubscriptionId ?? subscription.lemonsqueezySubscriptionId,
        lemonsqueezyVariantId: args.lemonsqueezyVariantId ?? subscription.lemonsqueezyVariantId,
        currentPeriodEnd: args.currentPeriodEnd ?? subscription.currentPeriodEnd,
        updatedAt: now,
      })
    }

    if (args.grantCredits) {
      const targetCredits = creditsForPlan(planTier)
      const grantAmount = Math.max(0, targetCredits - profile.creditBalance)
      console.log("[billing] grantCredits", { planTier, targetCredits, currentBalance: profile.creditBalance, grantAmount })
      if (grantAmount > 0) {
        await ctx.db.patch(profile._id, {
          creditBalance: profile.creditBalance + grantAmount,
        })

        await ctx.db.insert("creditLedger", {
          userId: resolvedUserId,
          amount: grantAmount,
          type: "subscription_grant",
          reason: `Subscription refill (${planTier}) via ${args.eventName}`,
          createdAt: now,
        })
      }

      const latestSubscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", resolvedUserId))
        .order("desc")
        .first()
      if (latestSubscription) {
        await ctx.db.patch(latestSubscription._id, {
          lastCreditsResetAt: now,
          updatedAt: now,
        })
      }
    }

    if (args.eventId) {
      await ctx.db.insert("billingWebhookEvents", {
        eventId: args.eventId,
        eventName: args.eventName,
        processedAt: now,
      })
    }

    return { ok: true, userId: resolvedUserId }
  },
})
