# View: Admin login (client app)

## Purpose

Allows **active platform admins** (`profiles.admin_role IS NOT NULL` and `profiles.admin_is_active = true`) to open a Supabase session in the **client** app using the same email and password as the Admin app. This is for internal testing and operations when Facebook OAuth is not appropriate.

There is **no** public link from the player `/login` page. The URL is shared out-of-band.

## Route

`/login-admin` — public when logged out; `noindex`. Authenticated users are redirected to `/dashboard` by middleware (same rule as `/login`).

## Flow

1. **Access password** — User enters a shared secret checked server-side against `CLIENT_ADMIN_LOGIN_GATE_PASSWORD`. On success, the server sets a short-lived `httpOnly` cookie (`client_admin_login_gate`) so the next step can run.
2. **Email + password** — User submits admin credentials. `POST /api/auth/admin-sign-in` requires the gate cookie, calls Supabase `signInWithPassword`, then verifies `admin_role` and `admin_is_active` on `profiles`. If the user is not an active admin, the session is cleared and the API returns `403` (`NOT_ADMIN`).
3. On success, the gate cookie is cleared and the client navigates to `/dashboard`.

If `CLIENT_ADMIN_LOGIN_GATE_PASSWORD` is unset in the environment, the gate endpoint returns `503` and the page cannot be used.

## UI

Same full-screen shell as player login (Dark Veil, wordmark, footer): see [`login.md`](./login.md) for background and layout tokens. Card title: **Admin access** / **Sign in**; fields are access password, then email and password (no “forgot password” on this screen; use the Admin app for resets).

## In-app indicator

When an admin uses the client app, the sidebar / mobile drawer user row shows a **Pill**: `Super admin` or `Admin` (see `Pill` variants `superAdmin` / `platformAdmin` in the client UI library).

## Security notes

- Gate password is server-only (never `NEXT_PUBLIC_`).
- Gate cookie is short-lived and cleared after successful sign-in.
- Non-admin accounts cannot complete sign-in on this path even with a valid gate cookie.

## Related docs

- [`03_authentication.md`](../../business_logic/client_app/03_authentication.md) — Path C, admin client sign-in.
- [`08_user_management.md`](../../business_logic/admin_app/08_user_management.md) — Admin provisioning (unchanged).
