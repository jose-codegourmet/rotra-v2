# Player sign-in takes an email only, not a phone number

Status: NEW
Date: 2026-11-08
App: player (and one line in admin)
Mockup: apps/mockup/player-app/rotra-player.html › Sign in; apps/mockup/admin-app/rotra-admin.html › Player detail › Private contact
Screen ID: P-LOGIN

## What changed
- The **Phone number or email** field is now **Email** (email keyboard, `autocomplete="email"`), hint
  "The email you registered with." plus the prototype sample. The phone mask no longer runs on it.
- A value that isn't an email gets "Enter an email address, like name@example.com."; the credential
  error reads "That email and password don't match. Check them and try again."
- The prototype only matches an account by email. Registration complete now says "Sign in from now on
  with your email and your password."
- Admin player detail: "Sign in with" now reads **Email** instead of "Phone number or email".

## Why
- Owner decision, November 8, 2026: emails are the logins, not phone numbers. This withdraws the
  November 7 phone-lookup sign-in (#244 L1/L3).

## Docs updated
- Business logic: player-information/modules/identity/README.md (Login and recovery);
  business_logic/product/open-decisions.md (identity row, claim row, L1, L3)
- Database design: player-information/modules/identity.md (account mapping); open-decisions.md
  (mapping, real-mode gap row); implementation-plan.md (step 1)
- Screen docs: player-information/access-registration.md (P-LOGIN), player-information/README.md,
  screens/product/open-decisions.md, state-matrix.md, coverage.md; architecture.md auth table

## Real app work
- SignInForm: Email field and email-only schema; the prototype hint and "Any password works"
  placeholder show only in mock mode. Mock sign-in matches by email only.
- Real mode: Player app `/api/auth/sign-in`, `/session`, `/sign-out` over Supabase email + password,
  mapped through `player_accounts`.
- PrivateContactCard (Admin): "Sign in with" shows Email.
