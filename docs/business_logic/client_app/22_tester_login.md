# 22 — Tester login (Client)

## Path D — Tester login

Complements [03_authentication.md](./03_authentication.md). Unlisted routes; `noindex`; not linked from public `/login`.

| Property | Value |
|----------|-------|
| Route | `/login-tester` |
| Credentials | Email + password chosen on `/set-password` (or from invite email if template shows `tester_password`) |
| API | `POST /api/auth/tester-sign-in` |

## Path D — Invite acceptance (first login)

When an admin invites a tester, Supabase sends an email whose link lands on the client at:

```
/login-tester/auth/accept-invite?token_hash=...&type=invite&next=/set-password
```

Supabase builds this URL by appending `/auth/accept-invite?...` to `redirectTo` (`{CLIENT_ORIGIN}/login-tester`). The invite email template may also include `next=/set-password`.

| Property | Value |
|----------|-------|
| Route handler | `GET apps/client/src/app/login-tester/auth/accept-invite/route.ts` |
| Middleware | `/login-tester` and `/login-tester/*` are public (no session required to hit the handler) |
| On success | `verifyOtp({ token_hash, type: "invite" })` → session cookies → redirect to `next` (default `/set-password`) |
| On failure | Redirect to `/login-tester?error=invite_expired` or `invalid_link` |

**Important:** Admin `inviteTesterAuthUser` must **not** call `updateUserById({ password })` immediately after `inviteUserByEmail`. Setting the auth password at invite time invalidates the invite token before the tester clicks the link.

## Path D — Set password (after invite)

| Property | Value |
|----------|-------|
| Route | `/set-password` |
| Preconditions | Active Supabase session from invite `verifyOtp` (middleware requires auth; unauthenticated users redirect to `/login`) |
| API | `POST /api/auth/set-password` → `supabase.auth.updateUser({ password })` |
| On success | Redirect to `/home` |

The tester chooses their own password (min 8 characters, confirm field). That password is used for subsequent `signInWithPassword` at `/login-tester`. A generated `tester_password` may still exist in `user_metadata` from invite time; it is not required for the happy path if the tester sets a password here.

## Preconditions (sign-in)

- `profiles.is_tester_account = true`
- `profile_tags` row with slug `tester-login-as-guest`

## Sign-in flow (returning tester)

```
1. User opens /login-tester
2. User submits email + password (set on /set-password)
3. signInWithPassword
4. validateTesterSession (tester flag + tag)
5. If invalid → signOut + 403 NOT_TESTER
6. markTesterInvitationAccepted (pending, not expired)
7. Redirect to /home
```

## First-time flow (invite link)

```
1. User clicks invite email link → /login-tester/auth/accept-invite?...
2. verifyOtp establishes session
3. Redirect to /set-password (from next param, or default)
4. User sets password → POST /api/auth/set-password
5. Redirect to /home
6. Later visits use /login-tester with email + chosen password
```

## Onboarding

Testers skip the player onboarding wizard (`is_tester_account` bypass in protected layout).

## Feature gating

Use `profileHasTag(profile.tags, TESTER_LOGIN_TAG_SLUG)` from `apps/client/src/lib/profile-tags.ts`.

## Canonical rules

| ID | Rule |
|----|------|
| RULE-007 | Tester accounts must have `is_tester_account = true` and the `tester-login-as-guest` tag to sign in via Path D. |
| RULE-008 | Tester auth passwords are set by the tester on `/set-password` after accepting the invite (or via `signInWithPassword` using a password shown in the invite email if the Supabase template surfaces `tester_password`). ROTRA does not store plaintext tester passwords in Postgres. Admin must not set Supabase auth password at invite send time. |
| RULE-009 | Tester accounts skip the player onboarding wizard. |
| RULE-010 | Tag slugs assigned to profiles must exist in `tag_definitions` and be active. |

## Related docs

- [login-tester.md](../../views/client_app/common/login-tester.md)
- [11_tester_management.md](../admin_app/11_tester_management.md)
- [14_tester_invitations.md](../../database/14_tester_invitations.md)
