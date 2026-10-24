# View: Account Settings

## Purpose

Self-service account settings for the currently signed-in player. Players can update their display name and permanently delete their own account. Tester accounts can also change their password. Email is shown for reference but is not editable.

## Route

`/settings/account` — authenticated users only. Linked from **Settings** (`/settings`) under **Profile Information** and **Password & Security**.

## Roles

**Player**, **Que Master**, **Club Owner**, **Tester**. Each user manages only their own account.

---

## Layout

Single-column page inside the standard client shell (`DashboardLayout`). Max content width ~640px, stacked sections with a back link to `/settings`.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings                                                 │
│  Account                                                    │
├─────────────────────────────────────────────────────────────┤
│  ── Profile information ─────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Name        [ Alex Santos                        ]   │   │
│  │  Email       [ alex@example.com ]  (read-only)      │   │
│  │                              [ Save changes ]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Password (tester accounts only) ─────────────────────  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  New password     [ ••••••••••••              👁 ]  │   │
│  │  Confirm password [ ••••••••••••              👁 ]  │   │
│  │                            [ Update password ]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Account deletion ────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Danger zone                                        │   │
│  │  Permanently delete your ROTRA account...           │   │
│  │  [ Delete account ]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### Profile information

- **Name** — editable text input; required, min 1 character after trim
- **Email** — read-only disabled input; helper: `"Email cannot be changed."` or `"No email on file for this account."` when absent
- **Save changes** — submits `PATCH /api/profile/me` with `{ name }`
- Success toast: `"Profile updated."`; refreshes server layout so sidebar name updates

### Password

Shown when the user is a **tester account** or signed in with **Facebook**.

**Tester accounts** (`profiles.is_tester_account = true`):

- **New password** / **Confirm password** — masked inputs with show/hide toggle; min 8 characters; must match
- **Update password** — submits `POST /api/profile/me/change-password` with `{ password }`
- Success toast: `"Password updated."`; form resets

**Facebook OAuth** (`user.identities` includes `facebook`):

- Read-only info card: account is managed through Facebook; password cannot be changed in ROTRA
- Directs user to Facebook account settings for password changes

### Account deletion (danger zone)

- Red-bordered card with destructive **Delete account** button
- Opens confirmation dialog requiring the user to type their exact **email** (case-insensitive), or **display name** when no email is on file
- **Delete account** (confirm) — `DELETE /api/profile/me/delete`
- On success: toast, Supabase sign-out, redirect to `/login`
- Guards (server-side):
  - Active platform admins cannot self-delete from the client app (`403`)
  - Profile row delete may fail if the account is still linked to clubs or sessions (`409`)

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/profile/me` | Current player profile (name, email, isTesterAccount) |
| PATCH | `/api/profile/me` | Update name |
| POST | `/api/profile/me/change-password` | Change password (tester only) |
| DELETE | `/api/profile/me/delete` | Self-delete account |

All routes require an authenticated session (`getCurrentProfile()`).

---

## Navigation entry points

- **Settings hub** — `/settings` → Profile Information or Password & Security → `/settings/account`
- **Own profile** — **Edit account** link in page header → `/settings/account` (see [`own_profile.md`](./own_profile.md))
- **Desktop navbar** — avatar dropdown (top-right) → **Account settings** → `/settings/account` (see [`../components/navbar-player.md`](../components/navbar-player.md))
- **Desktop sidebar** — user footer ⋮ menu → **Account Settings** → `/settings/account` (see [`../components/sidebar-player.md`](../components/sidebar-player.md))
- **Mobile drawer** — gear icon in user section footer → `/settings/account`

---

## States

### Default

Form fields populated from session. Email disabled.

### Saving name / updating password

Submit buttons show spinner; inputs disabled; double-submit prevented.

### Delete confirmation

Confirm button disabled until typed value matches account email or display name (case-insensitive).

### Delete blocked

Server returns 403 or 409 — shown as error toast.

### Session expired

Standard auth middleware redirect to `/login`.

---

## Related docs

- [`./own_profile.md`](./own_profile.md) — player stats profile at `/profile` (distinct from account settings)
- [`./home.md`](./home.md) — settings gear in shell
- [`../../../business_logic/client_app/05_player_profile.md`](../../../business_logic/client_app/05_player_profile.md)
- [`../../../database/01_users_and_profiles.md`](../../../database/01_users_and_profiles.md)
