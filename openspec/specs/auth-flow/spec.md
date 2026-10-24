# Auth Flow Specification

## Purpose

Client-app authentication for `apps/client`. Players sign in with Facebook OAuth. Platform admins sign in through a gated email/password path. Testers sign in with email/password or an invite link. Sessions are Supabase JWTs stored in cookies and refreshed on each matched request.

This spec covers login, invite acceptance, set-password, session gates, and logout. Onboarding after first Facebook login is specified in `onboarding`.

## Requirements

### Requirement: Public and protected routes
The client middleware SHALL treat `/login`, `/login/*`, `/login-admin`, `/login-tester`, `/login-tester/*`, `/auth/*`, `/privacy`, `/terms`, `/data-deletion`, `/api/*`, and `/` as public. All other paths MUST require a Supabase session. Unauthenticated requests to protected paths SHALL redirect to `/login` with a `next` query parameter set to the original path.

#### Scenario: Unauthenticated visitor hits a protected page
- GIVEN no Supabase session
- WHEN the visitor requests `/dashboard`
- THEN the middleware redirects to `/login?next=/dashboard`

#### Scenario: Unauthenticated visitor hits a public page
- GIVEN no Supabase session
- WHEN the visitor requests `/login` or `/privacy`
- THEN the page is served without an auth redirect

### Requirement: Logged-in login-page redirects
When a Supabase session exists, the middleware SHALL redirect `/login` and `/login-admin` to `/dashboard`, `/login-tester` to `/home`, and `/` to `/dashboard`.

#### Scenario: Signed-in player opens /login
- GIVEN a valid Supabase session
- WHEN the player requests `/login`
- THEN the middleware redirects to `/dashboard`

#### Scenario: Signed-in tester opens /login-tester
- GIVEN a valid Supabase session
- WHEN the tester requests `/login-tester`
- THEN the middleware redirects to `/home`

### Requirement: Facebook OAuth player login
The system SHALL start Facebook OAuth with scopes `public_profile email` and redirect back to `/auth/callback?next=/dashboard`. On success the callback MUST exchange the code for a session and redirect to a safe `next` path (must start with `/` and must not start with `//`; otherwise `/dashboard`). On OAuth or exchange failure the callback SHALL redirect to `/login` with `error=oauth` or `error=auth`.

#### Scenario: Successful Facebook sign-in
- GIVEN a visitor on `/login`
- WHEN they continue with Facebook and the provider returns a valid `code`
- THEN `/auth/callback` exchanges the code for a session
- AND the browser is redirected to `/dashboard`

#### Scenario: OAuth provider error
- GIVEN Facebook returns an OAuth `error` query parameter
- WHEN `/auth/callback` handles the request
- THEN the browser is redirected to `/login?error=oauth`
- AND no session is established

#### Scenario: Missing or invalid code
- GIVEN `/auth/callback` is hit without a usable `code`
- WHEN the handler runs
- THEN the browser is redirected to `/login?error=auth`

### Requirement: OAuth code fallback on site root
If Supabase returns the OAuth `code` to `/` instead of `/auth/callback`, the middleware SHALL redirect to `/auth/callback` with that `code` and a safe `next` (default `/dashboard`).

#### Scenario: Provider lands on / with code
- GIVEN an unauthenticated request to `/?code=<oauth-code>`
- WHEN middleware runs
- THEN the request is redirected to `/auth/callback?code=<oauth-code>&next=/dashboard`

### Requirement: Admin login gate
`POST /api/auth/admin-gate` SHALL compare the submitted password to `CLIENT_ADMIN_LOGIN_GATE_PASSWORD` using a timing-safe SHA-256 comparison. On success it MUST set an httpOnly cookie `client_admin_login_gate=ok` (30-minute max age, `SameSite=Lax`, `Secure` in production). A missing env password SHALL return `503 GATE_UNAVAILABLE`. A wrong password SHALL return `401 INVALID_GATE`.

#### Scenario: Correct gate password
- GIVEN `CLIENT_ADMIN_LOGIN_GATE_PASSWORD` is configured
- WHEN a visitor posts the correct password to `/api/auth/admin-gate`
- THEN the response succeeds
- AND cookie `client_admin_login_gate` is set to `ok`

#### Scenario: Gate password is not configured
- GIVEN the env password is unset
- WHEN a visitor posts any password to `/api/auth/admin-gate`
- THEN the API returns HTTP 503 with code `GATE_UNAVAILABLE`

### Requirement: Admin email/password sign-in
`POST /api/auth/admin-sign-in` MUST require a valid gate cookie. It SHALL sign in with Supabase email/password, then allow the session only when the profile has an `adminRole` and `adminIsActive === true`. Otherwise it MUST sign the user out and return `403 NOT_ADMIN`. Success SHALL clear the gate cookie and return `{ redirectTo: "/dashboard" }`. Admins skip the onboarding redirect in the protected layout.

#### Scenario: Active admin signs in after passing the gate
- GIVEN a valid `client_admin_login_gate` cookie
- AND a profile with an admin role and `adminIsActive` true
- WHEN they post valid email and password to `/api/auth/admin-sign-in`
- THEN a Supabase session is established
- AND the gate cookie is cleared
- AND the client is directed to `/dashboard`

#### Scenario: Credentials belong to a non-admin
- GIVEN a valid gate cookie
- WHEN they sign in with a non-admin or inactive-admin profile
- THEN the API signs the session out
- AND returns HTTP 403 with code `NOT_ADMIN`

#### Scenario: Sign-in without the gate cookie
- GIVEN no `client_admin_login_gate` cookie
- WHEN they post credentials to `/api/auth/admin-sign-in`
- THEN the API returns HTTP 401 with code `GATE_REQUIRED`

### Requirement: Tester invite acceptance
`GET /login-tester/auth/accept-invite` SHALL verify a Supabase invite OTP (`token_hash` and `type=invite`). Invalid or missing invite parameters MUST redirect to `/login-tester?error=invalid_link`. A failed verify MUST redirect to `/login-tester?error=invite_expired`. Success SHALL redirect to a safe `next` path (default `/set-password`) with session cookies set.

#### Scenario: Valid invite link
- GIVEN a tester invite URL with `token_hash` and `type=invite`
- WHEN the accept-invite route verifies the OTP
- THEN a session is established
- AND the browser is redirected to `/set-password`

#### Scenario: Expired invite
- GIVEN an invite token that fails OTP verification
- WHEN the accept-invite route runs
- THEN the browser is redirected to `/login-tester?error=invite_expired`

### Requirement: Set password after invite
`POST /api/auth/set-password` MUST require an existing Supabase session. The new password SHALL be at least 8 characters. Success updates the Supabase user password. The set-password page is not public; without a session, middleware redirects to `/login`.

#### Scenario: Invited tester sets a password
- GIVEN a signed-in user on `/set-password`
- WHEN they submit a password of 8 or more characters
- THEN `/api/auth/set-password` updates the auth user
- AND the client navigates to `/home`

#### Scenario: Set password without a session
- GIVEN no Supabase session
- WHEN `/api/auth/set-password` is called
- THEN the API returns HTTP 401

### Requirement: Returning tester sign-in
`POST /api/auth/tester-sign-in` SHALL sign in with email/password, then keep the session only when `validateTesterSession` succeeds (`is_tester_account = true` and profile tag slug `tester-login-as-guest`). Failure MUST sign the user out and return `403 NOT_TESTER`. Success MAY mark a pending non-expired tester invitation as accepted. Testers skip the onboarding redirect.

#### Scenario: Authorized tester signs in
- GIVEN a profile with `is_tester_account` true and tag `tester-login-as-guest`
- WHEN they post valid credentials to `/api/auth/tester-sign-in`
- THEN a session is established
- AND the client navigates to `/home`

#### Scenario: Non-tester uses the tester form
- GIVEN credentials that authenticate in Supabase but fail tester validation
- WHEN they post to `/api/auth/tester-sign-in`
- THEN the API signs the session out
- AND returns HTTP 403 with code `NOT_TESTER`

### Requirement: Profile bootstrap for new Facebook users
When a signed-in user has no `profiles` row, `getCurrentProfile()` SHALL create one from Facebook metadata (`provider_id`, `full_name`, `avatar_url`) via `ensureProfileRow`.

#### Scenario: First Facebook login has no profile row
- GIVEN a new Supabase Facebook user with no `profiles` row
- WHEN the server resolves the current profile
- THEN a profile row is created from Facebook metadata

### Requirement: Session refresh and logout
On every matched request the middleware SHALL call Supabase `getUser()` so session cookies can be refreshed. Client `AuthSync` SHALL mirror the session user into Redux. Confirmed logout MUST call `supabase.auth.signOut()` and send the browser to `/login`.

#### Scenario: Logout from the shell
- GIVEN a signed-in user
- WHEN they confirm logout
- THEN the Supabase session is cleared
- AND the browser is sent to `/login`

### Requirement: Safe next-path handling
OAuth callback and invite-accept redirects SHALL accept `next` only when it starts with `/` and does not start with `//`. Otherwise they MUST use their default destination (`/dashboard` for OAuth, `/set-password` for invite accept).

#### Scenario: Open-redirect attempt
- GIVEN an OAuth callback with `next=https://evil.example`
- WHEN the callback succeeds
- THEN the browser is redirected to `/dashboard` instead of the external URL

## Documented product rules

The following rules come from `docs/business_logic/client_app/03_authentication.md` and `22_tester_login.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact.

### Requirement: Facebook is the player identity anchor
Documented player registration SHALL use Facebook OAuth (scopes `public_profile` and optional `email`) and/or Email Invitation that then links Facebook. One Facebook account SHALL map to exactly one Player (`facebook_id` unique). Duplicate Facebook login SHALL return the existing account. There SHALL be no merge-accounts flow. Name and avatar SHALL be seeded from Facebook and then read from `profiles`, not stale Auth metadata.

#### Scenario: Second Facebook login
- GIVEN an existing `facebook_id`
- WHEN the same Facebook user signs in
- THEN the existing Player session is used

### Requirement: Email invitation path
An admin or Club Owner MAY send a tokenized email invite with TTL 7 days, stored as `email_invitations` status `pending`. The token SHALL be single-use. Linking email alone SHALL NOT set `email_verified`. A user with a linked and verified email SHALL NOT have it replaced by a new invitation unless the current email is unverified. Expired tokens SHALL show an error and prompt to request a new invite.

#### Scenario: Reuse accepted invite
- GIVEN `email_invitations.status` is `accepted`
- WHEN the same token is opened again
- THEN it cannot be reused

### Requirement: Composite verification
A player SHALL be unverified by default. `is_verified` SHALL be server-computed true only when Facebook is linked, email is verified, and onboarding is completed. Clients MUST NOT compute verification independently. Documented unverified restrictions: cannot join a queue session, submit match reviews, appear on leaderboards, or create a club; they MAY view/explore. Restricted actions SHALL show which conditions are unsatisfied.

> Current implemented session join remains mock (`queue-session`). This verification gate is documented intent.

#### Scenario: Unverified cannot join (documented)
- GIVEN `is_verified` is false
- WHEN the player tries to join a queue session
- THEN the documented rule refuses the join and lists missing conditions

### Requirement: Tester invite must not set password at send time
Admin tester invite SHALL NOT call `updateUserById({ password })` immediately after `inviteUserByEmail` (that invalidates `token_hash`). ROTRA SHALL NOT store plaintext passwords in Postgres. Tag slugs assigned to profiles MUST exist in `tag_definitions` and be active. Tester routes SHALL be unlisted / `noindex` and not linked from public `/login`.

#### Scenario: Invite password anti-pattern
- GIVEN an admin sends a tester invite
- WHEN the invite email is generated
- THEN the auth password is not set at send time

### Requirement: Session lifetimes (documented)
Documented JWT access-token expiry is 1 hour and refresh-token expiry is 7 days. Flagged/suspended accounts SHALL NOT log in. Fake Facebook accounts are out of scope for MVP. Phase 2+ MAY add Google/Apple and multi-provider linking.

#### Scenario: Suspended account
- GIVEN Admin flagged the account
- WHEN the player attempts Facebook login
- THEN login is refused

## Source

- `apps/client/src/middleware.ts`
- `apps/client/src/lib/supabase/middleware.ts`
- `apps/client/src/app/login/page.tsx`
- `apps/client/src/app/login-admin/page.tsx`
- `apps/client/src/app/login-tester/page.tsx`
- `apps/client/src/app/set-password/page.tsx`
- `apps/client/src/app/auth/callback/route.ts`
- `apps/client/src/app/login-tester/auth/accept-invite/route.ts`
- `apps/client/src/app/api/auth/admin-gate/route.ts`
- `apps/client/src/app/api/auth/admin-sign-in/route.ts`
- `apps/client/src/app/api/auth/tester-sign-in/route.ts`
- `apps/client/src/app/api/auth/set-password/route.ts`
- `apps/client/src/lib/auth/server.ts`
- `apps/client/src/lib/auth/login-actions.ts`
- `apps/client/src/lib/server/current-profile.ts`
- `apps/client/src/app/(protected)/layout.tsx`
- `apps/client/src/providers/AuthSync.tsx`
- `apps/client/src/hooks/useLogoutDialog/client.tsx`
- `packages/db/src/tester-invitation-service.ts`
- `packages/db/prisma/models_profile.prisma`
