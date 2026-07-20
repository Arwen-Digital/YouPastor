import { convexAuth } from "@convex-dev/auth/server"
import { Password } from "@convex-dev/auth/providers/Password"
import { Email } from "@convex-dev/auth/providers/Email"
import Google from "@auth/core/providers/google"

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: Email({
        id: "password-reset",
        name: "Password Reset",
        from: `${process.env.BREVO_FROM_NAME ?? "YouPastor"} <${process.env.BREVO_FROM_EMAIL ?? "arnold@arwendigital.net"}>`,
        maxAge: 60 * 15,
        async generateVerificationToken() {
          const values = new Uint32Array(1)
          crypto.getRandomValues(values)
          return String(values[0] % 1000000).padStart(6, "0")
        },
        async sendVerificationRequest({ identifier, token }) {
          const brevoApiKey = process.env.BREVO_API_KEY
          if (!brevoApiKey) {
            throw new Error("BREVO_API_KEY is not configured")
          }

          const senderEmail = process.env.BREVO_FROM_EMAIL ?? "arnold@arwendigital.net"
          const senderName = process.env.BREVO_FROM_NAME ?? "YouPastor"
          const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "content-type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({
              sender: { email: senderEmail, name: senderName },
              to: [{ email: identifier }],
              subject: "Reset your YouPastor password",
              htmlContent: `
                <p>You requested a password reset for YouPastor.</p>
                <p>Your reset code is:</p>
                <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px;">${token}</p>
                <p>This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>
              `,
              textContent: `Your YouPastor password reset code is: ${token}\n\nThis code expires in 15 minutes. If you did not request this, you can ignore this email.`,
            }),
          })

          if (!response.ok) {
            const err = await response.text()
            console.error("[auth] Failed to send password reset email", response.status, err.slice(0, 500))
            throw new Error(`Failed to send password reset email: ${err.slice(0, 500)}`)
          }

          console.log("[auth] Password reset email accepted by Brevo", response.status)
        },
      }),
    }),
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
      if (redirectTo.startsWith("youpastor://reset-password")) {
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