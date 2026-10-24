# Admin Auth Specification

## Purpose

Authentication for `apps/admin`. Admins sign in with email/password (or an unused OTP page), accept invites, set a password, and manage their own profile. Access requires both Supabase `role: "admin"` metadata and an active provisioned Prisma admin profile.

## Requirements

### Requirement: Middleware session and role gate
Public paths SHALL be `/login`, `/login/*`, `/set-password`, `/auth/*`, `/api/auth/*`, and `/`. Other page requests without a Supabase session SHALL redirect to `/login?next=…`. Other API requests without a session SHALL return HTTP 401. A session whose `app_metadata.role` and `user_metadata.role` are not `"admin"` SHALL receive HTTP 403 on APIs or redirect to `/login?error=forbidden` on pages. Authenticated admins on `/` or `/login` SHALL be redirected to `/dashboard`.

#### Scenario: Anonymous admin page
- GIVEN no Supabase session
- WHEN they request `/customers`
- THEN middleware redirects to `/login` with a `next` parameter

#### Scenario: Non-admin session on an API
- GIVEN a Supabase session without role `admin`
- WHEN they request a non-public `/api/*` path
- THEN the API returns HTTP 403

### Requirement: Provisioned active admin profile
Protected pages and mutating APIs that call `requireAdminSession()` MUST also require a profile with `adminRole` set, `email` present, and `adminIsActive === true`. Missing profile/role SHALL be 403. Inactive admins SHALL be blocked (layout uses `?error=admin_inactive`).

#### Scenario: Inactive admin
- GIVEN a Supabase admin-role user whose profile has `adminIsActive` false
- WHEN they hit a protected layout that requires an admin session
- THEN access is denied with `admin_inactive`

### Requirement: Password sign-in
`POST /api/auth/sign-in` SHALL authenticate with Supabase email/password. On success it SHALL call `activateAdminIfNeeded()` (activate an inactive invited admin and mark a pending invite accepted) and redirect to a safe `next` path or `/dashboard`. Safe `next` MUST start with `/` and MUST NOT start with `//`.

#### Scenario: Valid admin credentials
- GIVEN an invited or active admin
- WHEN they post valid email and password to `/api/auth/sign-in`
- THEN a session is established
- AND they are sent to `/dashboard` or a safe `next`

### Requirement: Forgot password
`POST /api/auth/reset-password` SHALL send a Supabase reset link and return a generic success message so emails cannot be enumerated.

#### Scenario: Reset request
- GIVEN any email string
- WHEN they post `/api/auth/reset-password`
- THEN the API does not reveal whether the email exists

### Requirement: Invite accept and set password
`/auth/accept-invite` SHALL accept `token_hash` with `type=invite` and continue to `/auth/callback`. Successful invite verification SHALL default to `/set-password`. `POST /api/auth/set-password` MUST require a session, require a password of at least 8 characters, update the Supabase user, call `activateAdminIfNeeded()`, and send the admin to `/dashboard`. `/set-password` is public at the middleware layer but the API requires a session.

#### Scenario: Valid invite
- GIVEN an invite URL with `token_hash` and `type=invite`
- WHEN OTP/code verification succeeds
- THEN the browser is sent to `/set-password` with a session

#### Scenario: Set password
- GIVEN a signed-in invited admin
- WHEN they post a password of 8+ characters
- THEN the auth password is updated
- AND they are redirected to `/dashboard`

### Requirement: OTP endpoints exist without a login entry point
`POST /api/auth/request-otp`, `verify-otp`, and `resend-otp` SHALL implement 6-digit OTP sign-in with `shouldCreateUser: false` and anti-enumeration on unknown emails. `/login/otp` SHALL require an `email` query param (otherwise redirect to `/login`). The `/login` form MUST NOT expose a “Sign in with OTP” CTA, so this path is only reachable by direct URL.

#### Scenario: OTP page without email
- GIVEN `/login/otp` with no `email` query
- WHEN the page loads
- THEN it redirects to `/login`

### Requirement: Self-service profile
`/profile` SHALL allow the signed-in admin to PATCH `/api/admin-users/me` (name), POST `/api/admin-users/me/change-password`, and DELETE `/api/admin-users/me/delete`. The founding super admin MUST NOT be deleted. Email change is not implemented.

#### Scenario: Admin updates own name
- GIVEN a signed-in active admin
- WHEN they PATCH `/api/admin-users/me` with a new name
- THEN their profile name is updated

### Requirement: Login error query mapping
The login page SHALL map query errors including `forbidden`, `admin_profile_missing`, `admin_role_missing`, `admin_inactive`, `invite_invalid`, and `auth_unavailable` to user-visible messages.

#### Scenario: Forbidden query
- GIVEN `/login?error=forbidden`
- WHEN the login page renders
- THEN a forbidden/access message is shown

## Documented product rules

The following rules come from `docs/business_logic/admin_app/01_admin_overview.md` and `08_user_management.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact.

### Requirement: No Facebook on Admin App
Admin App login SHALL be email + password after Super Admin invite. There SHALL be no Facebook OAuth, social provider, or public sign-up. Documented extras not in Current middleware: 4-hour inactivity expiry, IP restriction, and failed-login rate limits.

#### Scenario: Player Facebook session
- GIVEN a Player Facebook session
- WHEN they open the Admin App
- THEN they are not an admin unless the three admin checks pass

### Requirement: Three-part session check
Every authenticated Admin App request SHALL require JWT role `admin`, `profiles.admin_role IS NOT NULL`, and `admin_is_active = true`. Current middleware already enforces session + role metadata and `requireAdminSession()` for the provisioned active profile.

#### Scenario: Invited but inactive
- GIVEN `admin_role` is set and `admin_is_active` is false
- WHEN they hit a protected admin API
- THEN access is denied

## Source

- `apps/admin/src/middleware.ts`
- `apps/admin/src/lib/auth/admin-session.ts`
- `apps/admin/src/app/api/auth/**`
- `apps/admin/src/app/login/page.tsx`
- `apps/admin/src/app/login/otp/page.tsx`
- `apps/admin/src/app/set-password/page.tsx`
- `apps/admin/src/app/auth/accept-invite/page.tsx`
- `apps/admin/src/app/auth/callback/route.ts`
- `apps/admin/src/app/(protected)/profile/page.tsx`
- `packages/db/src/admin-user-service.ts`
