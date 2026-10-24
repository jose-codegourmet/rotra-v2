# Player email and password authentication

## Why

Meta review is blocking public Facebook OAuth, so `apps/client` needs a complete email-and-password path for players without preserving separate tester and client-admin login systems. Supabase Auth remains the identity provider, and its configured Resend SMTP integration delivers recovery mail without an application-side Resend SDK.

This change implements the client scope of #80–#85. The standalone `apps/admin` authentication flow is unchanged.

## What changes

- Replace the public client login surface with universal email/password sign-in at `/login`.
- Add public `/sign-up` and `/forgot-password` pages.
- Add generic invite and recovery callbacks plus session-gated password setting.
- Derive additive client roles from existing profile flags: every profile is a `user`; tester and admin roles are appended when their existing columns say so.
- Remove specialized client tester/admin pages, forms, APIs, and the client admin gate, while redirecting their historical URLs to the universal flow.
- Preserve dormant Facebook OAuth implementation for a later linking/review change.
- Restore the already-applied identity migration in Prisma history and add a separate unapplied migration that installs the missing `auth.users` profile trigger.

## Impact

- Affects `apps/client` and required Prisma migration files in `packages/db`.
- Adds no Resend package, API key, or custom mail endpoint.
- Adds no OTP-entry, magic-link-login, TOTP, or MFA UI to `apps/client`.
- Requires the pending trigger migration and Supabase Auth dashboard configuration to be deployed separately.
