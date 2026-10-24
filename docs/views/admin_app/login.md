# View: Admin Login

## Purpose

The entry point to the ROTRA Admin App. Platform team members authenticate with **email + password**. Admin accounts are provisioned only by Super Admin invitation; there is no self-registration and no social OAuth.

This screen is the only page accessible without a valid admin session. Authenticated admins are redirected to `/dashboard`.

## Route

`/login` — public, unauthenticated first.

## Flow

1. Admin enters email and password on `/login`.
2. Server calls Supabase `signInWithPassword`.
3. If auth succeeds, server validates admin access requirements:
   - JWT claim `app_metadata.role = 'admin'` (or `user_metadata.role = 'admin'`)
   - `profiles.admin_role IS NOT NULL`
   - `profiles.admin_is_active = true`
4. On success, user is redirected to `/dashboard`.

## Invite onboarding flow

1. Super Admin invites a new admin from [`/admin/admins`](./admins.md).
2. Supabase sends an invite email that links to `/auth/accept-invite`.
3. Invitee clicks **Continue** on `/auth/accept-invite`, which routes through `/auth/callback?token_hash=...&type=invite&next=/set-password`.
4. Invitee sets password on `/set-password`.
5. First successful password setup activates the admin account (`admin_is_active = true`) and marks invitation accepted.

> Player accounts are **not** created from the Admin App — players self-register on the [Client App](../client_app) via Facebook OAuth. The `/admin/users` view is read + lookup only (`admin_role IS NULL` lens). See [`./users.md`](./users.md).

## States

### Default
- Email and password fields visible.
- Submit button enabled.

### Loading
- Submit button shows spinner.
- Inputs are disabled while request is in flight.

### Invalid credentials
- Inline message: `Incorrect email or password.`

### Admin not provisioned / inactive
- Redirect back to `/login` with `error` query param (`admin_profile_missing`, `admin_role_missing`, `admin_inactive`, or `forbidden`).

### Rate limited
- Inline message from API: `Too many attempts. Please wait before retrying.`

## Security notes

- Sessions follow the Admin App policy (4 hours idle timeout target).
- Auth traffic and protected routes are still subject to middleware and `requireAdminSession()`.
- Failed login attempts are rate-limited by Supabase and app-layer handling.

## Future (optional)

Email OTP/TOTP can be reintroduced later as a second factor or alternate sign-in path, but it is not required in the current internal-tool baseline.
