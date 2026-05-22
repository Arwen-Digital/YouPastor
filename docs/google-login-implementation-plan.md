# Google Login Implementation Plan — YouPastor

## Goal

Add **Continue with Google** authentication to the YouPastor Electron app using the existing Convex Auth setup, while preserving the current password login flow and custom token storage.

---

## Current State

### Auth backend

File: `convex/auth.ts`

Current provider setup:

```ts
providers: [Password]
```

Only email/password login is enabled.

### Frontend auth

Files:

- `src/pages/LoginPage.vue`
- `src/stores/auth.ts`
- `src/lib/convex.ts`

Current flow:

1. Login page calls `auth.signInWithPassword(...)`
2. Store calls Convex action `auth:signIn`
3. Convex returns `{ token, refreshToken }`
4. App stores tokens in localStorage using:
   - `__convexAuthJWT`
   - `__convexAuthRefreshToken`
5. `ConvexClient.setAuth(...)` uses those tokens

### Electron deep links

Files:

- `electron/main.ts`
- `src/main.ts`

Current deep-link scheme:

```txt
youpastor://
```

Already handles billing routes like:

```txt
youpastor://billing/success
```

Google OAuth should add:

```txt
youpastor://auth/callback?code=...
```

---

## Required Google / Convex Setup

### Google Cloud Console

Create or update an OAuth Client.

Authorized redirect URI must include:

```txt
https://dutiful-barracuda-583.convex.site/api/auth/callback/google
```

### Convex environment variables

Add to Convex deployment:

```txt
AUTH_GOOGLE_ID=<Google OAuth client id>
AUTH_GOOGLE_SECRET=<Google OAuth client secret>
```

Current Convex env has:

```txt
SITE_URL=http://localhost:5173
```

For Electron OAuth, do **not** rely only on `SITE_URL`. Add a Convex Auth redirect callback that explicitly allows `youpastor://auth/callback`.

---

## Backend Code Changes

### 1. Add Google provider

File: `convex/auth.ts`

Add import:

```ts
import Google from "@auth/core/providers/google"
```

Update providers:

```ts
providers: [Password, Google]
```

### 2. Allow Electron redirect URL

In `convexAuth(...)`, add `callbacks.redirect`:

```ts
callbacks: {
  async redirect({ redirectTo }) {
    if (redirectTo.startsWith("youpastor://auth/callback")) {
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
}
```

### 3. Add direct dependency

Although `@auth/core` exists transitively, add it directly:

```bash
npm install @auth/core
```

---

## Frontend Auth Store Changes

File: `src/stores/auth.ts`

Add a Google OAuth flow.

### Required constants

Convex Auth React client uses this verifier key:

```ts
const CONVEX_AUTH_OAUTH_VERIFIER_KEY = "__convexAuthOAuthVerifier"
```

### Add `signInWithGoogle()`

Flow:

1. Call `auth:signIn` with provider `google`
2. Pass redirect target:

```ts
redirectTo: "youpastor://auth/callback"
```

3. Convex returns:

```ts
{
  redirect: string,
  verifier: string
}
```

4. Store verifier in localStorage:

```ts
localStorage.setItem(CONVEX_AUTH_OAUTH_VERIFIER_KEY, verifier)
```

5. Open `redirect` externally using Electron bridge:

```ts
window.appLinks?.openExternal(redirect)
```

Fallback to `window.open(...)` if needed.

### Add `completeGoogleSignIn(code: string)`

Flow:

1. Read verifier from localStorage
2. Call:

```ts
client.action('auth:signIn' as any, {
  params: { code },
  verifier,
})
```

3. Expect tokens:

```ts
result.tokens.token
result.tokens.refreshToken
```

4. Store tokens using existing:

```ts
setConvexAuthToken(token, refreshToken)
```

5. Call `fetchUser()`
6. Remove verifier from localStorage
7. Route user:
   - if onboarding needed → `/onboarding`
   - otherwise → `/`

---

## Login Page Changes

File: `src/pages/LoginPage.vue`

Add a button above or below the password form:

```txt
Continue with Google
```

Button behavior:

```ts
await auth.signInWithGoogle()
```

UI notes:

- Disable while `auth.isLoading`
- Show current auth error banner if OAuth start fails
- Keep existing password sign-in/sign-up intact

---

## Deep Link Handling Changes

### Electron main process

File: `electron/main.ts`

Ensure `youpastor://auth/callback?code=...` is passed to renderer.

Current direct route navigation is billing-specific. For auth callback, do **not** route directly in Electron unless we encode the query correctly. Simpler path:

- If route is billing success/cancel → direct navigation
- Else send IPC `deep-link` event to renderer

This should already work if `getDeepLinkRoute(...)` returns `null` for `/auth/callback`.

### Renderer deep link handling

File: `src/main.ts`

Extend deep-link handler:

```ts
if (path === "/auth/callback") {
  const code = parsed.searchParams.get("code")
  if (code) {
    await auth.completeGoogleSignIn(code)
  }
}
```

Need helper that parses both forms:

```txt
youpastor://auth/callback?code=...
youpastor:///auth/callback?code=...
```

Current `getDeepLinkPath(...)` already normalizes host-based custom protocol URLs.

---

## Account/Profile Considerations

Google OAuth can create a Convex user without a church profile.

After successful Google login:

- `fetchUser()` should return `needsOnboarding: true` if no profile exists
- Router should send the user to `/onboarding`

This matches existing onboarding guard behavior.

Potential follow-up: if Google profile includes a name, make sure onboarding can pre-fill pastor name. Current onboarding already watches `auth.user?.name`.

---

## Testing Plan

### Backend/env checks

1. Confirm Convex env vars:

```bash
npx convex env list --deployment dutiful-barracuda-583
```

Verify:

```txt
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
```

2. Confirm Google callback URL:

```txt
https://dutiful-barracuda-583.convex.site/api/auth/callback/google
```

### Local app flow

1. Start app:

```bash
npm run dev
```

2. Click **Continue with Google**
3. Browser opens Google OAuth
4. Complete Google login
5. Browser asks to open YouPastor
6. Click Open
7. Electron receives:

```txt
youpastor://auth/callback?code=...
```

8. App exchanges code for tokens
9. User lands in:
   - `/onboarding` if new
   - `/` if existing

### Existing account tests

- Existing password user with same email logs in via Google
- Confirm whether account links correctly or creates separate account
- If account linking behavior is not desired, adjust Convex Auth callbacks

### Regression tests

- Password sign-in still works
- Password sign-up still works
- Token refresh still works after reload
- Logout still works
- Billing deep links still route to thank-you page

---

## Main Risks / Unknowns

1. **OAuth account linking**
   - Need to verify whether Google login with the same email links to existing password account.
   - Convex Auth generally links verified OAuth emails, but confirm in testing.

2. **Electron installed app vs dev Electron**
   - Browser prompt may say “Electron” in dev mode.
   - Packaged app should say “YouPastor” after protocol registration changes.

3. **SITE_URL mismatch**
   - Current `SITE_URL` is localhost.
   - Redirect callback should explicitly allow `youpastor://auth/callback` to avoid being blocked.

4. **OAuth verifier storage**
   - Must store and retrieve `__convexAuthOAuthVerifier` correctly.
   - If lost, callback code exchange will fail.

---

## Recommended Implementation Order

1. Install `@auth/core` direct dependency
2. Update `convex/auth.ts` with Google + redirect callback
3. Add auth store methods:
   - `signInWithGoogle`
   - `completeGoogleSignIn`
4. Extend `src/main.ts` deep-link handling for `/auth/callback`
5. Add Google button to `LoginPage.vue`
6. Typecheck
7. Push Convex functions
8. Test in dev
9. Package/reinstall app for final protocol prompt verification

---

## Success Criteria

Google login is complete when:

- Clicking **Continue with Google** opens Google OAuth in browser
- Google redirects back to YouPastor app
- App stores Convex JWT + refresh token
- `auth.fetchUser()` succeeds
- Existing users land on dashboard
- New users land on onboarding
- Password auth remains unaffected
