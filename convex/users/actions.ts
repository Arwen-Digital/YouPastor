import { action } from "../_generated/server"
import { v } from "convex/values"
import { api } from "../_generated/api"
import { getAuthUserId } from "@convex-dev/auth/server"

const BREVO_LIST_ID = 11

export const syncBrevoContact = action({
  args: {
    name: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.runQuery(api.users.queries.getBrevoContact, {})
    if (existing && !args.force) {
      return { ok: true, skipped: true, reason: "already_synced" }
    }

    const me = await ctx.runQuery(api.users.queries.getMe, {})
    const profile = await ctx.runQuery(api.profile.queries.getMine, {})

    const email = String(me?.email ?? "").trim().toLowerCase()
    if (!email) {
      return { ok: false, skipped: true, reason: "missing_email" }
    }

    const fallbackName = String(args.name ?? me?.name ?? "").trim()
    const nameParts = fallbackName ? fallbackName.split(/\s+/) : []
    const firstName = String(profile?.pastorFirstName || nameParts[0] || "").trim()
    const lastName = String(profile?.pastorLastName || nameParts.slice(1).join(" ") || "").trim()

    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      console.warn("[brevo] BREVO_API_KEY is not configured")
      return { ok: false, skipped: true, reason: "missing_api_key" }
    }

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [BREVO_LIST_ID],
        updateEnabled: true,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.warn("[brevo] contact sync failed:", errText.slice(0, 300))
      return { ok: false, skipped: false }
    }

    await ctx.runMutation(api.users.mutations.upsertBrevoContact, {
      email,
      listId: BREVO_LIST_ID,
    })

    return { ok: true, skipped: false }
  },
})
