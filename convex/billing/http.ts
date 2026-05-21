import { httpAction } from "../_generated/server"

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function verifySignature(rawBody: string, signingSecret: string, signatureHeader: string): Promise<boolean> {
  if (!signingSecret || !signatureHeader) return false
  const normalizedSignature = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const expected = bytesToHex(new Uint8Array(signature))

  return safeEqual(expected, normalizedSignature)
}

function parseDateToMillis(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  const time = Date.parse(value)
  if (Number.isNaN(time)) return undefined
  return time
}

export const lemonsqueezyWebhook = httpAction(async (ctx, request) => {
  const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "").trim()
  const signature = request.headers.get("x-signature") ?? request.headers.get("X-Signature") ?? ""
  const bodyText = await request.text()

  if (!(await verifySignature(bodyText, secret, signature))) {
    return new Response("Invalid signature", { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const eventName = String(payload?.meta?.event_name ?? "")
  if (!eventName) {
    return new Response("Missing event_name", { status: 400 })
  }

  const attrs = payload?.data?.attributes ?? {}
  const customData = payload?.meta?.custom_data ?? attrs?.custom_data ?? {}

  const userId = customData?.userId ? String(customData.userId) : undefined
  const userEmail = attrs?.user_email ? String(attrs.user_email) : undefined
  const lemonsqueezyCustomerId = attrs?.customer_id ? String(attrs.customer_id) : undefined
  const lemonsqueezySubscriptionId = attrs?.subscription_id
    ? String(attrs.subscription_id)
    : payload?.data?.id
      ? String(payload.data.id)
      : undefined
  const lemonsqueezyVariantId = attrs?.variant_id ? String(attrs.variant_id) : undefined
  const subscriptionStatus = attrs?.status ? String(attrs.status) : undefined
  const currentPeriodEnd =
    parseDateToMillis(attrs?.renews_at) ??
    parseDateToMillis(attrs?.ends_at) ??
    parseDateToMillis(attrs?.trial_ends_at)

  const webhookEventId = payload?.meta?.webhook_event_id
    ? String(payload.meta.webhook_event_id)
    : `${eventName}:${lemonsqueezySubscriptionId ?? "none"}:${attrs?.updated_at ?? attrs?.created_at ?? ""}`

  const grantCredits =
    eventName === "subscription_payment_success" ||
    eventName === "subscription_payment_recovered" ||
    eventName === "subscription_created"

  await ctx.runMutation("billing/internal:syncSubscriptionFromWebhook" as any, {
    eventId: webhookEventId,
    eventName,
    userId,
    userEmail,
    lemonsqueezyCustomerId,
    lemonsqueezySubscriptionId,
    lemonsqueezyVariantId,
    subscriptionStatus,
    currentPeriodEnd,
    grantCredits,
  })

  return new Response("ok", { status: 200 })
})
