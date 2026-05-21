import { mutation } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"
import { FREE_SIGNUP_CREDITS } from "../credits/config"

export const redeemVoucher = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const code = args.code.trim().toUpperCase()
    if (!code) return { success: false, message: "Voucher code is required" }

    // Find the voucher
    const voucher = await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q: any) => q.eq("code", code))
      .first()

    if (!voucher) {
      return { success: false, message: "Invalid voucher code" }
    }

    // Check if already redeemed by this user
    const alreadyRedeemed = await ctx.db
      .query("voucherRedemptions")
      .withIndex("by_user_voucher", (q: any) => q.eq("userId", userId).eq("voucherId", voucher._id))
      .first()

    if (alreadyRedeemed) {
      return { success: false, message: "You have already redeemed this voucher code" }
    }

    // Get or create church profile
    let profile = await ctx.db
      .query("churchProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first()

    if (!profile) {
      const profileId = await ctx.db.insert("churchProfiles", {
        userId,
        churchName: "",
        pastorName: "",
        onboardingComplete: false,
        creditBalance: FREE_SIGNUP_CREDITS,
      })
      profile = await ctx.db.get(profileId)
    }

    if (!profile) {
      throw new Error("Failed to load your church profile")
    }

    const now = Date.now()
    const newBalance = profile.creditBalance + voucher.credits

    // Update balance
    await ctx.db.patch(profile._id, {
      creditBalance: newBalance,
    })

    // Log to ledger
    await ctx.db.insert("creditLedger", {
      userId,
      amount: voucher.credits,
      type: "grant",
      reason: `Redeemed voucher code: ${voucher.code}`,
      createdAt: now,
    })

    // Record the redemption
    await ctx.db.insert("voucherRedemptions", {
      userId,
      voucherId: voucher._id,
      redeemedAt: now,
    })

    return {
      success: true,
      creditsAdded: voucher.credits,
      newBalance,
    }
  },
})
