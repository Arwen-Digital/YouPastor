import { action } from "../_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

type PayrexPack = "php_400" | "php_800"

type PayrexCheckoutResponse = {
  id?: string
  url?: string
  data?: {
    id?: string
    attributes?: {
      url?: string
    }
  }
}

const PAYREX_PACKS: Record<PayrexPack, { name: string; amount: number; credits: number }> = {
  php_400: {
    name: "YouPastor 400 Credits",
    amount: 40000,
    credits: 400,
  },
  php_800: {
    name: "YouPastor 1000 Credits",
    amount: 80000,
    credits: 1000,
  },
}

function requiredEnv(name: string): string {
  const value = (process.env[name] ?? "").trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function extractCountry(location?: string): string {
  if (!location) return ""
  const parts = location.split(",")
  return (parts[parts.length - 1] ?? "").trim()
}

function appendCheckoutParams(params: URLSearchParams, pack: { name: string; amount: number; credits: number }, email: string) {
  params.append("currency", "PHP")
  params.append("line_items[][name]", pack.name)
  params.append("line_items[][amount]", String(pack.amount))
  params.append("line_items[][quantity]", "1")
  params.append("line_items[][description]", `${pack.credits} YouPastor credits`)
  params.append("payment_methods[]", "gcash")
  params.append("payment_methods[]", "card")
  params.append("payment_methods[]", "maya")
  params.append("payment_methods[]", "qrph")
  params.append("billing_details_collection", "auto")
  params.append("submit_type", "pay")
  params.append("description", email ? `${pack.name} - ${email} - manual credit confirmation` : `${pack.name} - manual credit confirmation`)
}

export const createCheckout = action({
  args: {
    pack: v.union(v.literal("php_400"), v.literal("php_800")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const profile: any = await ctx.runQuery("profile/queries:getMine" as any, {})
    const me: any = await ctx.runQuery("users/queries:getMe" as any, {})
    const email = me?.email ? String(me.email) : ""
    const country = extractCountry(profile?.location)
    if (country.toLowerCase() !== "philippines") {
      throw new Error("PayRex credit purchases are available for Philippines accounts only.")
    }

    const apiKey = requiredEnv("PAYREX_SECRET_API_KEY")
    const payrexRedirectBaseUrl = requiredEnv("PAYREX_REDIRECT_BASE_URL").replace(/\/$/, "")
    const pack = PAYREX_PACKS[args.pack]
    const referenceId = `yp_${String(userId)}_${args.pack}_${Date.now()}`

    const params = new URLSearchParams()
    appendCheckoutParams(params, pack, email)
    params.append("customer_reference_id", referenceId)
    params.append("success_url", `${payrexRedirectBaseUrl}/payrex-confirmation`)
    params.append("cancel_url", `${payrexRedirectBaseUrl}/cancel`)
    params.append("metadata[userId]", String(userId))
    if (email) params.append("metadata[registeredEmail]", email)
    params.append("metadata[pack]", args.pack)
    params.append("metadata[credits]", String(pack.credits))

    const response = await fetch("https://api.payrexhq.com/checkout_sessions", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
      },
      body: params.toString(),
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`PayRex checkout error (${response.status}): ${text.slice(0, 1000)}`)
    }

    let data: PayrexCheckoutResponse
    try {
      data = JSON.parse(text)
    } catch (err) {
      throw new Error(`PayRex response parse error: ${String(err)}`)
    }

    const checkoutUrl = data?.url ?? data?.data?.attributes?.url
    if (!checkoutUrl) {
      throw new Error("PayRex did not return a checkout URL")
    }

    return {
      checkoutUrl,
      referenceId,
    }
  },
})
