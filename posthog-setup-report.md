<wizard-report>
# PostHog post-wizard report

The wizard completed a deep integration review of YouPastor and added four new PostHog events to cover critical business moments that were previously untracked. The project already had a solid foundation — `posthog-js` installed, PostHog initialized in `main.ts`, global error handling via `app.config.errorHandler`, and user identification across all auth flows (`signInWithPassword`, `signUpWithPassword`, `completeGoogleSignIn`). The wizard supplemented that with conversion and engagement events for billing success, PayRex credit pack orders, skill output saves, and per-step onboarding tracking. Environment variables `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` were written to `.env`.

## All tracked events

| Event name | Description | File |
|---|---|---|
| `user_signed_up` | A new user successfully created an account with email and password | `src/stores/auth.ts` |
| `user_signed_in` | A user successfully signed in with email and password | `src/stores/auth.ts` |
| `user_signed_in_with_google` | A user successfully completed Google OAuth sign-in | `src/stores/auth.ts` |
| `user_signed_out` | A user signed out of the application | `src/stores/auth.ts` |
| `onboarding_completed` | A user finished the church profile onboarding flow | `src/pages/OnboardingPage.vue` |
| `onboarding_step_completed` | Fired each time a user completes a step in onboarding, with `step` key and `step_number` | `src/pages/OnboardingPage.vue` |
| `subscription_checkout_started` | A user clicked to upgrade and the checkout URL opened for a subscription plan | `src/pages/UpgradePage.vue` |
| `credit_pack_checkout_started` | A user initiated a PayRex one-time credit pack purchase | `src/pages/UpgradePage.vue` |
| `voucher_redeemed` | A user successfully redeemed a promotional voucher code for credits | `src/pages/UpgradePage.vue` |
| `subscription_purchased` | A user landed on the billing success page after a completed LemonSqueezy checkout | `src/pages/BillingSuccessPage.vue` |
| `credit_pack_order_placed` | A user landed on the PayRex confirmation page after placing a credit pack order | `src/pages/PayrexConfirmationPage.vue` |
| `skill_used` | A user sent a message to an AI skill in the workspace | `src/components/SkillChat.vue` |
| `skill_output_saved` | A user saved AI-generated skill output (research, brainstorm, series, blog, etc.) to the notebook | `src/components/SkillChat.vue` |
| `sermon_saved` | A user saved a sermon document in the sermon editor | `src/pages/SermonFlowPage.vue` |
| `feedback_submitted` | A user submitted a feedback, bug report, or feature request form | `src/pages/FeedbackPage.vue` |

## Next steps

We've built a dashboard and five insights to monitor user behavior from the events instrumented across this session:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/477082/dashboard/1734179)
- [New signups (last 30 days)](https://us.posthog.com/project/477082/insights/PODNPQa5)
- [Signup → Onboarding → Subscription funnel](https://us.posthog.com/project/477082/insights/8JpEeqWs)
- [Upgrade checkout → Purchase conversion](https://us.posthog.com/project/477082/insights/NiyvsCe3)
- [Skill usage by type (last 30 days)](https://us.posthog.com/project/477082/insights/1oNLEhIZ)
- [Weekly active creators](https://us.posthog.com/project/477082/insights/HD11wxQK)

## Verify before merging

- [ ] Run a full production build and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` to `.env.example` and any onboarding/bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — `fetchUser()` runs on every app boot and authenticates returning users but does not call `posthog.identify`, so those sessions start on anonymous distinct IDs. Add `posthog.identify(user.value._id, { email: user.value.email, name: user.value.name })` inside the success branch of `fetchUser` in `src/stores/auth.ts`.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
