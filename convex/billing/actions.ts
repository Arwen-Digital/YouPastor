import { action } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

type LemonSqueezyCheckoutResponse = {
  data?: {
    attributes?: {
      url?: string
    }
  }
  error?: unknown
}

function requiredEnv(name: string): string {
  const value = (process.env[name] ?? "").trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function getVariantIdForTier(tier: "starter" | "pro"): string {
  if (tier === "starter") return requiredEnv("LEMONSQUEEZY_VARIANT_STARTER")
  return requiredEnv("LEMONSQUEEZY_VARIANT_PRO")
}

export const createCheckout = action({
  args: {
    tier: v.union(v.literal("starter"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const apiKey = requiredEnv("LEMONSQUEEZY_API_KEY")
    const storeId = requiredEnv("LEMONSQUEEZY_STORE_ID")
    const variantId = getVariantIdForTier(args.tier)
    const appBaseUrl = ((process.env.APP_BASE_URL ?? "https://youpastor.com").trim()).replace(/\/$/, "")

    const me: any = await ctx.runQuery("users/queries:getMe" as any, {})
    const email = me?.email ? String(me.email) : undefined

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          product_options: {
            redirect_url: `${appBaseUrl}/billing/success`,
          },
          checkout_data: {
            email,
            custom: {
              userId: String(userId),
              tier: args.tier,
            },
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: storeId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    }

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`LemonSqueezy checkout error (${response.status}): ${text.slice(0, 1000)}`)
    }

    let data: LemonSqueezyCheckoutResponse
    try {
      data = JSON.parse(text)
    } catch (err) {
      throw new Error(`LemonSqueezy response parse error: ${String(err)}`)
    }

    const checkoutUrl = data?.data?.attributes?.url
    if (!checkoutUrl) {
      throw new Error("LemonSqueezy did not return a checkout URL")
    }

    return {
      checkoutUrl,
    }
  },
})
