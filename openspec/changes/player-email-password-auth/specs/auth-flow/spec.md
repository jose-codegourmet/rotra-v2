## ADDED Requirements

### Requirement: Player email and password sign-up
`POST /api/auth/player-sign-up` SHALL create a Supabase Auth user from a normalized email and a password of at least 8 characters. An immediate session SHALL direct the player to `/onboarding`; a configuration that requires email confirmation SHALL return a non-error confirmation state.

#### Scenario: New player receives a session
- GIVEN email confirmation is disabled in Supabase Auth
- WHEN a visitor submits a valid unused email and password at `/sign-up`
- THEN a Supabase user and profile are created
- AND the browser is directed to `/onboarding`

#### Scenario: Confirmation is required
- GIVEN Supabase Auth requires email confirmation
- WHEN a valid sign-up succeeds without a session
- THEN the page tells the visitor to check their email
- AND it does not redirect to onboarding

### Requirement: Universal client email and password sign-in
`POST /api/auth/player-sign-in` SHALL authenticate any client profile with Supabase email/password and MUST NOT gate by tester or admin status. Credential failures MUST use the generic message `Incorrect email or password.`. A safe supplied `next` SHALL win; otherwise active admins go to `/dashboard`, testers go to `/home`, incomplete regular users go to `/onboarding`, and completed regular users go to `/dashboard`.

#### Scenario: Tester uses the universal login
- GIVEN a tester profile with valid Supabase credentials
- WHEN the tester signs in at `/login`
- THEN the session is retained without a tester-specific gate
- AND the browser is directed to `/home`

#### Scenario: New regular user signs in
- GIVEN a regular profile whose onboarding is incomplete
- WHEN the user signs in at `/login`
- THEN the browser is directed to `/onboarding`

### Requirement: Forgot password request
`POST /api/auth/forgot-password` SHALL ask Supabase Auth to send recovery mail through its configured SMTP provider. Every request, including malformed email, unknown account, rate limit, and provider failure, MUST return the same observable HTTP 200 success response.

#### Scenario: Unknown email requests a reset
- GIVEN an email that is not registered
- WHEN it is submitted at `/forgot-password`
- THEN the client receives the same confirmation shown for a registered email
- AND account existence is not disclosed

### Requirement: Password reset link acceptance
`GET /auth/reset-callback` SHALL establish a recovery session from a recovery `token_hash`, with authorization-code exchange as a fallback. Success SHALL redirect to protected `/set-password?mode=reset`; missing, invalid, or expired links SHALL redirect to `/login` with a user-safe error code.

#### Scenario: Valid recovery link
- GIVEN a recovery URL containing a valid recovery token hash
- WHEN the callback verifies the link
- THEN session cookies are attached to the redirect
- AND the browser opens `/set-password?mode=reset`

### Requirement: Specialized client auth compatibility redirects
The middleware SHALL redirect `/login-admin` and `/login-tester` to `/login`. It SHALL redirect `/login-tester/auth/accept-invite` to `/auth/accept-invite` while preserving the query string. These legacy paths SHALL NOT have their own pages or credential APIs.

#### Scenario: Previously sent tester invitation is opened
- GIVEN an invitation URL using `/login-tester/auth/accept-invite` with token query parameters
- WHEN middleware receives the request
- THEN it redirects to `/auth/accept-invite` with the same query parameters

## MODIFIED Requirements

### Requirement: Public and protected routes
The client middleware SHALL treat `/login`, `/login/*`, `/sign-up`, `/forgot-password`, `/auth/*`, `/privacy`, `/terms`, `/data-deletion`, `/api/*`, and `/` as public. `/set-password` and all other application paths MUST require a Supabase session. Unauthenticated requests to protected paths SHALL redirect to `/login` with a `next` query parameter containing the original path.

#### Scenario: Unauthenticated visitor opens sign-up
- GIVEN no Supabase session
- WHEN the visitor requests `/sign-up` or `/forgot-password`
- THEN the page is served without an auth redirect

### Requirement: Logged-in login-page redirects
When a Supabase session exists, middleware SHALL redirect `/login`, `/sign-up`, `/forgot-password`, and `/` to `/dashboard`.

#### Scenario: Signed-in user opens a public auth form
- GIVEN a valid Supabase session
- WHEN the user requests `/login`, `/sign-up`, or `/forgot-password`
- THEN middleware redirects to `/dashboard`

### Requirement: Dormant Facebook OAuth player login
The Facebook OAuth action, callback, database fields, and Storybook coverage SHALL remain available for future account linking, but the public `/login` page MUST NOT mount or link the Facebook login card while Meta review is blocked.

#### Scenario: Visitor opens login while Facebook is hidden
- GIVEN Facebook OAuth source remains in the client application
- WHEN a visitor opens `/login`
- THEN only the universal email/password form is presented
- AND no Facebook sign-in control is mounted

### Requirement: Generic invite acceptance
`GET /auth/accept-invite` SHALL verify a Supabase invite token hash, with authorization-code exchange as a fallback, and establish a session before redirecting to `/set-password?mode=invite`. Failure SHALL redirect to `/login` with `invalid_link` or `invite_expired`.

#### Scenario: Valid invite link
- GIVEN an invite callback with a valid token hash and `type=invite`
- WHEN `/auth/accept-invite` verifies it
- THEN a session is established
- AND the browser opens `/set-password?mode=invite`

### Requirement: Set password after invite or recovery
`POST /api/auth/set-password` MUST require an existing Supabase session and a password of at least 8 characters. Both invite and recovery modes SHALL update the auth password, sign out the temporary session, and direct the user to the universal `/login` with a success indicator.

#### Scenario: Recovery user sets a password
- GIVEN a recovery session on `/set-password?mode=reset`
- WHEN the user submits matching passwords of at least 8 characters
- THEN Supabase updates the password
- AND the recovery session is signed out
- AND the browser is directed to `/login?reset=1`

### Requirement: Profile bootstrap for authenticated users
When an authenticated Supabase user has no `profiles` row, the client SHALL create one from available auth metadata. Email-only users MUST store a null Facebook ID; Facebook users MAY use `provider_id`, `full_name`, and `avatar_url`. The bootstrap MUST NOT fabricate a `fallback_<uuid>` Facebook ID.

#### Scenario: First email login has no profile row
- GIVEN an authenticated email/password user without a profile row
- WHEN the server resolves the current profile
- THEN a profile is created with `facebook_id` null
- AND the derived roles contain `user`

## REMOVED Requirements

### Requirement: Client admin login gate
The client-specific shared-password admin gate and `/api/auth/admin-gate` endpoint are removed. Admin profiles authenticate through universal `/login`; standalone `apps/admin` auth is unaffected.

#### Scenario: Admin opens the historical client route
- GIVEN an admin requests `/login-admin`
- WHEN middleware handles the request
- THEN the browser is redirected to `/login`

### Requirement: Returning tester sign-in gate
The `/api/auth/tester-sign-in` endpoint and tester-only credential form are removed. Tester status remains an additive profile flag and does not determine whether valid credentials may establish a session.

#### Scenario: Tester returns to the client
- GIVEN a tester has valid email/password credentials
- WHEN they open `/login-tester`
- THEN middleware redirects them to `/login`
- AND they can authenticate through the universal form

## Source

- `apps/client/src/middleware.ts`
- `apps/client/src/app/login/page.tsx`
- `apps/client/src/app/sign-up/page.tsx`
- `apps/client/src/app/forgot-password/page.tsx`
- `apps/client/src/app/auth/accept-invite/route.ts`
- `apps/client/src/app/auth/reset-callback/route.ts`
- `apps/client/src/app/api/auth/player-sign-up/route.ts`
- `apps/client/src/app/api/auth/player-sign-in/route.ts`
- `apps/client/src/app/api/auth/forgot-password/route.ts`
- `apps/client/src/app/api/auth/set-password/route.ts`
- `apps/client/src/lib/server/current-profile.ts`
