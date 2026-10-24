# 11 — Tester management (Admin)

## Overview

Platform admins invite **test players** who do not use Facebook. Testers accept the invite via email, set a password on the client app, then sign in at `/login-tester` with email + that password.

## Invite flow

1. Admin opens `/testers` → **Invite new tester** (email, display name).
2. `POST /api/testers` → `createTesterProfile` → `inviteTesterAuthUser` → Supabase `inviteUserByEmail` with:
   - `redirectTo = {CLIENT_ORIGIN}/login-tester` (no trailing path; Supabase appends its own suffix)
   - `data`: `name`, `tester_password` (generated, stored in `user_metadata` only), `is_tester: true`
3. **Do not** call `auth.admin.updateUserById({ password })` immediately after invite. That confirms the user and invalidates the invite `token_hash` before the tester clicks the link.
4. Supabase sends **Invite user** email. The link in the template typically resolves to:
   ```
   {CLIENT_ORIGIN}/login-tester/auth/accept-invite?token_hash=...&type=invite&next=/set-password
   ```
   (Built from `redirectTo` + template token placeholders; see admin `invite-user.html` source for admin vs tester branches in the dashboard.)
5. Profile: `is_tester_account = true`, `facebook_id` null; tag `tester-login-as-guest` assigned; `tester_invitations` row `pending`.

## Client completion (tester)

| Step | What happens |
|------|----------------|
| Click email link | `GET /login-tester/auth/accept-invite` → `verifyOtp` → redirect `next` (default `/set-password`) |
| Set password | `POST /api/auth/set-password` → Supabase `updateUser({ password })` with active session |
| Use app | `/home`; later sign-in at `/login-tester` |

## Directory and detail

| Route | Purpose |
|-------|---------|
| `/testers` | Paginated directory with status filter |
| `/testers/[id]` | Profile, tags, invitation history, resend/revoke |

## Resend / revoke

- **Resend** — pending or expired; revokes open pending invite, re-invites via Supabase (new token; same rules: no admin password set at send time).
- **Revoke** — pending only; marks invitation revoked; deletes auth user when no `facebook_id`.

## Notifications and audit

Mutations write `admin_action_log` and fan out `admin_notifications` (`tester_invite_sent`) to other admins.

## Distinction from Customers

Tester operations live only under `/testers`, not `/customers`.

## Environment

- `NEXT_PUBLIC_CLIENT_APP_ORIGIN` — required for invite `redirectTo` (e.g. `http://localhost:3000` in dev).
- Supabase **Redirect URLs** must include the client origin.
- Supabase **Invite user** template: for testers, optionally show `{{ index .UserMetadata "tester_password" }}` and a plain `{{ .RedirectTo }}` link; the default admin template may use `{{ .RedirectTo }}/auth/accept-invite?token_hash=...` (configure in dashboard; repo `apps/admin/src/email-templates/` is reference only).

## Related docs

- [14_tester_invitations.md](../../database/14_tester_invitations.md)
- [22_tester_login.md](../client_app/22_tester_login.md)
- [testers.md](../../views/admin_app/testers.md)
- [login-tester.md](../../views/client_app/common/login-tester.md)
