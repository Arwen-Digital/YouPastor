import { action } from "../_generated/server"
import { api } from "../_generated/api"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

const FEEDBACK_TO_EMAIL = "arnold.gamboa@gmail.com"

export const send = action({
  args: {
    overallExperience: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("okay"),
      v.literal("poor")
    ),
    mostHelpfulUse: v.union(
      v.literal("sermon_prep"),
      v.literal("sermon_writing"),
      v.literal("repurposing"),
      v.literal("pastoral_tools"),
      v.literal("other")
    ),
    easeOfUse: v.union(
      v.literal("very_easy"),
      v.literal("easy"),
      v.literal("neutral"),
      v.literal("hard")
    ),
    wouldRecommend: v.union(v.literal("yes"), v.literal("maybe"), v.literal("no")),
    feedbackText: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const me = await ctx.runQuery(api.users.queries.getMe, {})
    const profile = await ctx.runQuery(api.profile.queries.getMine, {})

    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY is not configured on the backend")
    }

    const feedbackText = args.feedbackText.trim()
    const textBlock = feedbackText || "(No additional comments)"

    const emailHtml = `
      <h2>YouPastor Feedback Submission</h2>
      <p><strong>User email:</strong> ${me?.email ?? "unknown"}</p>
      <p><strong>User name:</strong> ${profile?.pastorName ?? me?.name ?? "unknown"}</p>
      <p><strong>Church:</strong> ${profile?.churchName ?? "not provided"}</p>
      <hr />
      <p><strong>Overall experience:</strong> ${args.overallExperience}</p>
      <p><strong>Most helpful use:</strong> ${args.mostHelpfulUse}</p>
      <p><strong>Ease of use:</strong> ${args.easeOfUse}</p>
      <p><strong>Would recommend:</strong> ${args.wouldRecommend}</p>
      <hr />
      <p><strong>General feedback:</strong></p>
      <p>${textBlock.replace(/\n/g, "<br />")}</p>
    `

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "YouPastor Feedback",
          email: "arnold@arwendigital.net",
        },
        to: [{ email: FEEDBACK_TO_EMAIL }],
        replyTo: {
          email: me?.email ?? "noreply@youpastor.com",
          name: profile?.pastorName ?? me?.name ?? "YouPastor User",
        },
        subject: `YouPastor Feedback from ${me?.email ?? "unknown user"}`,
        htmlContent: emailHtml,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Failed to send feedback email: ${err.slice(0, 500)}`)
    }

    return { ok: true }
  },
})
