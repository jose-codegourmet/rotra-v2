# Design

## Authentication boundary

All client identities authenticate through Supabase Auth. `/api/auth/player-sign-in` intentionally applies no tester or admin gate. After authentication it bootstraps the profile, reads the existing `is_tester_account`, `admin_role`, and `admin_is_active` columns, and chooses the normal destination. A supplied `next` is accepted only when it is an internal absolute path.

The in-memory role representation is additive: `user` is always present, `tester` follows `isTesterAccount`, and `admin` or `super_admin` follows `adminRole`. No new role table or profile column is introduced.

## Database reconciliation

The live Prisma migration record `20260830120000_player_email_password_identity` existed without its repository file. The restored SQL is byte-for-byte identical to the live checksum. It drops the obsolete identity constraint and makes `handle_new_user()` safe for email-only users.

Live inspection also showed that `on_auth_user_created` was absent. A later migration installs that trigger and restricts direct execution of the security-definer function. Application bootstrap remains a safety net and now writes `facebookId: null` rather than a synthetic `fallback_<uuid>`.

The migration files are authored but not applied by this implementation.

## Recovery email

The forgot-password API calls `supabase.auth.resetPasswordForEmail`. Supabase Auth sends the email through the already-connected Resend SMTP provider. The repository therefore needs no Resend dependency or secret.

The user never enters an OTP. Reset and invite links are verified invisibly by route handlers with `verifyOtp(token_hash)`; a PKCE/code exchange remains as a template-compatible fallback. The short-lived recovery session is signed out after the password is updated.

## UI and compatibility

The new cards reuse the existing client authentication shell and ROTRA tokens. Password visibility is implemented once with the existing shadcn `InputGroup` composition. Facebook OAuth source and its Storybook story remain available but `/login` no longer mounts them.

Historical `/login-admin` and `/login-tester` requests redirect to `/login`. Historical tester invite callbacks redirect to `/auth/accept-invite` with the original query string intact, allowing already-sent invitations to continue working.

## Security notes

- Sign-in credential errors do not reveal whether an email exists.
- Forgot-password always returns the same success response, including malformed and provider-error cases.
- `/set-password` remains protected and requires the session established by an invite or recovery callback.
- External and protocol-relative `next` destinations are rejected.
