# Clean Supabase migration

This runbook moves BumpNotes away from the abandoned Lovable-managed Supabase project and onto a new Supabase project owned directly by Lizzie.

Do not change production Cloudflare variables until the new project has been created, migrated, and tested on a preview/staging deployment.

## Current abandoned project

Treat this project as abandoned unless it is needed for reference:

```text
Old Supabase URL: https://emyajhwcynmybiimszfs.supabase.co
Old project ref: emyajhwcynmybiimszfs
```

No existing user data needs to be preserved.

## Runtime auth decision

BumpNotes production auth should use direct Supabase Auth only:

- Email and password sign-up
- Email and password sign-in
- Password reset
- Magic link sign-in for existing users

Do not enable Google, Apple, Microsoft, or Lovable/cloud auth for the beta.

## Repository audit findings

The app now uses Supabase Auth directly from `@supabase/supabase-js`.

Removed auth dependencies:

- `@lovable.dev/cloud-auth-js`
- `src/integrations/lovable/index.ts`
- Google OAuth buttons and `signInWithOAuth("google")` calls in the sign-up and sign-in routes

Remaining Lovable references are not production auth dependencies:

- `@lovable.dev/vite-tanstack-config` is a build/dev dependency.
- `src/lib/lovable-error-reporting.ts` reports runtime errors and is separate from authentication.

Runtime Supabase usage in the app:

- Client auth and database access: `src/integrations/supabase/client.ts`
- Server service-role access: `src/integrations/supabase/client.server.ts`
- SSR auth middleware: `src/integrations/supabase/auth-middleware.ts`
- User state sync: `bumpnotes_state`
- Contact form: `contact_messages`
- Feedback and tester feedback: `feedback_submissions`
- Admin bootstrap and tester mode: `TESTER_PASSWORD`

The repository contains database migrations in `supabase/migrations/` for the tables, grants, triggers, RLS policies, and helper functions needed by the app. It does not contain Supabase Edge Functions or Storage bucket definitions. If Edge Functions, Storage buckets, auth email templates, or dashboard-only secrets exist in the old project, they are remote-only and should not be treated as required unless rediscovered during preview testing.

## Create the new Supabase project

1. Sign in to the Supabase dashboard with the account that should own BumpNotes long term.
2. Create a new project in the correct organisation.
3. Suggested region: closest to the main audience, for example `West EU (Ireland)` for UK/EU users.
4. Save the database password in a password manager.
5. After creation, copy:
   - Project URL
   - Project ref
   - Publishable / anon key
   - Service role key

Use these placeholders in the rest of this document:

```text
NEW_SUPABASE_PROJECT_REF=<new-project-ref>
NEW_SUPABASE_URL=https://<new-project-ref>.supabase.co
NEW_SUPABASE_PUBLISHABLE_KEY=<new-publishable-or-anon-key>
NEW_SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
TESTER_PASSWORD=<strong-admin-and-tester-bootstrap-secret>
```

## Apply database migrations

From the repo root:

```sh
supabase login
supabase link --project-ref <new-project-ref>
supabase db push
```

`supabase/config.toml` intentionally contains `project_id = "replace-with-new-supabase-project-ref"` until the new owned project exists. Replace that value with the new ref, or let `supabase link --project-ref <new-project-ref>` update it before running `supabase db push`.

This applies everything in `supabase/migrations/` to the new project, including tables, RLS policies, grants, triggers, and helper functions.

After applying, regenerate local TypeScript types if the schema changed:

```sh
supabase gen types typescript --project-id <new-project-ref> --schema public > src/integrations/supabase/types.ts
```

The current repo does not define Supabase Edge Functions or Storage buckets.

## Supabase Auth settings

In the new Supabase project, configure Authentication > URL Configuration.

Use the real production domain when known:

```text
Site URL:
https://<production-bumpnotes-domain>
```

Add redirect URLs:

```text
https://<production-bumpnotes-domain>
https://<production-bumpnotes-domain>/
https://<production-bumpnotes-domain>/reset-password
https://<production-bumpnotes-domain>/admin
http://localhost:5173
http://localhost:5173/
http://localhost:5173/reset-password
http://localhost:5173/admin
```

If Cloudflare preview deployments are used for testing, add the preview URL before testing magic links or password reset:

```text
https://<cloudflare-preview-host>
https://<cloudflare-preview-host>/
https://<cloudflare-preview-host>/reset-password
https://<cloudflare-preview-host>/admin
```

In Authentication > Providers:

- Email provider: enabled
- Confirm email: recommended enabled for production beta
- Email/password signups: enabled
- Magic links / OTP: enabled
- Google: disabled
- Apple: disabled
- Other OAuth providers: disabled

Supabase magic links are used only for existing users by the app (`shouldCreateUser: false`).

## Cloudflare environment variables

Set these variables in Cloudflare Pages for the preview/staging environment first. Only copy them to production after preview testing passes.

```text
VITE_SUPABASE_URL=https://<new-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<new-publishable-or-anon-key>
SUPABASE_URL=https://<new-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<new-publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
TESTER_PASSWORD=<strong-admin-and-tester-bootstrap-secret>
```

`VITE_SUPABASE_PROJECT_ID` and `SUPABASE_PROJECT_ID` are not required by the runtime code. Keep them out of Cloudflare unless a future workflow explicitly needs them.

Existing analytics variables are separate:

```text
VITE_GA4_MEASUREMENT_ID=<ga4-measurement-id>
VITE_CLARITY_PROJECT_ID=<clarity-project-id>
```

## Preview test checklist

Before switching production, test the preview/staging deployment with the new Supabase project:

- Create account with email and password
- Confirm email, if confirmation is enabled
- Sign out
- Sign in with email and password
- Send magic link to an existing user and sign in from the emailed link
- Send password reset email and set a new password at `/reset-password`
- Complete onboarding and confirm app state saves to `bumpnotes_state`
- Sign out and sign back in; confirm app state syncs back down
- Submit contact form and confirm `contact_messages` insert
- Submit in-app feedback and confirm `feedback_submissions` insert
- Enter tester mode and submit tester feedback
- Claim admin access with `TESTER_PASSWORD`
- Open admin dashboard and confirm admin-only reads work
- Delete an account and confirm auth/profile/state cleanup

## Production cutover

Only after the preview checklist passes:

1. Copy the same Supabase variables into Cloudflare production.
2. Trigger a production redeploy.
3. Create a brand-new production test account.
4. Repeat the critical path:
   - sign up
   - sign in
   - reset password
   - state save/sync
   - contact/feedback insert
   - account deletion
5. Leave the old Lovable-managed Supabase project unused.

## Risks before launch

- Auth redirect URLs must exactly include the production and preview domains used during testing.
- If email confirmation is enabled, account creation will not fully sign users in until they confirm.
- If magic link is enabled in Supabase but the redirect URL is missing, links will fail or land on the wrong page.
- `TESTER_PASSWORD` grants admin bootstrap access, so it must be strong and kept server-only.
- The service role key must never be exposed as a `VITE_` variable.
