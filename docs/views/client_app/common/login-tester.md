# Client — Tester login (`/login-tester`)

## Shell

Same visual shell as `login-admin`: DarkVeil background, centered logo, card.

## Invite entry (email link)

Testers do not land on `/login-tester` first. The invite email opens:

```
/login-tester/auth/accept-invite?token_hash=...&type=invite&next=/set-password
```

Server handler exchanges the token for a session, then redirects to `/set-password` (or the safe `next` param). Errors redirect to `/login-tester?error=invite_expired` or `invalid_link`.

## Card — `/login-tester`

- Title: **Sign in**
- Subtitle: Use email and password from your invite setup (password chosen on `/set-password`)
- Fields: Email, Password (masked, show/hide)
- Submit → `POST /api/auth/tester-sign-in` → `/home`

## Errors (`/login-tester`)

| Condition | Message |
|-----------|---------|
| Invalid credentials | Generic incorrect email/password (401) |
| Not tester | "This account is not authorized for tester access." (403 NOT_TESTER) |
| Query `error=invite_expired` | Shown after failed or reused invite link |
| Query `error=invalid_link` | Missing or wrong `token_hash` / `type` on accept-invite |

## `/set-password` (first login after invite)

Same shell as `/login-tester` (DarkVeil, logo, footer).

| Element | Detail |
|---------|--------|
| Title | **Set your password** |
| Fields | Password (min 8), Confirm password |
| Submit | `POST /api/auth/set-password` → `/home` |
| Auth | Requires session from invite `verifyOtp`; unauthenticated users hit middleware → `/login` |

## Security

- `robots: noindex` on `/login-tester` and `/set-password`
- No link from public `/login`
- URLs shared out-of-band only
- `/login-tester/*` public in middleware for accept-invite only; `/set-password` requires session

## Related

- [22_tester_login.md](../../../business_logic/client_app/22_tester_login.md)
- [11_tester_management.md](../../../business_logic/admin_app/11_tester_management.md)
