# Dashboard and sign-in deployment

The public console URL is `https://shotimer.io/?view=dashboard&auth=login`.
The production homepage must include the built `src/publicEntry.ts` module. It
loads React at the existing URL, including OAuth returns with a code or token
fragment. No query-aware nginx rewrite or navigation through `/app/` is required.

Run `npm run build`. Its postbuild step updates the application entries and
assets in the checked-in `website_coming_soon` publishing directory. Deploy those
updated HTML files and all newly generated assets together. `dist` is also a full
build for Node deployments. Keep old assets available for already-open tabs.
Run `npm run verify:static` to exercise the actual published router independently
of Vite's development routing. This checks asset references and callback-data
preservation; it does not sign in to a real account.

## Supabase and Google settings

At investigation time on 30 October 2026, the project's public auth settings
reported `external.google: false`, with email sign-in enabled. Google OAuth cannot
complete until an administrator enables that provider and supplies its Google
Web client ID and client secret in Supabase Authentication → Sign In / Providers.

Google's authorised redirect URI for this project is:
`https://yodcnmzgmjcjgxizcowm.supabase.co/auth/v1/callback`.

In Supabase Authentication → URL Configuration, set the Site URL to
`https://shotimer.io` and allow these callback URLs:

- `https://shotimer.io/?view=dashboard`
- `https://shotimer.io/?view=dashboard&auth=reset`

Verify an actual Google sign-in after enabling the provider and deploying. Check
that the return opens the rooms dashboard with the signed-in identity, and that
refreshing retains that session. Public provider checks cannot verify a user's
session or the administrator's OAuth configuration.
