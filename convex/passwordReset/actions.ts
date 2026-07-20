import { action } from "../_generated/server"
import { v } from "convex/values"

export const sendCode = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase()

    await ctx.runAction("auth:signIn" as any, {
      provider: "password",
      params: {
        email,
        flow: "reset",
        redirectTo: "youpastor://reset-password",
      },
    })

    return { ok: true }
  },
})
