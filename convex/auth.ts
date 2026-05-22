import { convexAuth } from "@convex-dev/auth/server"
import { Password } from "@convex-dev/auth/providers/Password"
import Google from "@auth/core/providers/google"

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Google({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      if (redirectTo.startsWith("youpastor://auth/callback")) {
        return redirectTo
      }
      if (redirectTo.startsWith("http://127.0.0.1:")) {
        return redirectTo
      }

      const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "")
      if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
        return `${siteUrl}${redirectTo}`
      }
      if (siteUrl && redirectTo.startsWith(siteUrl)) {
        return redirectTo
      }

      throw new Error(`Invalid redirectTo: ${redirectTo}`)
    },
  },
  session: {
    totalDurationMs: THIRTY_DAYS_MS,
    inactiveDurationMs: THIRTY_DAYS_MS,
  },
  jwt: {
    durationMs: ONE_WEEK_MS,
  },
})