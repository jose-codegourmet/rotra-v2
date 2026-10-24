# View: Admin Profile

## Purpose

Self-service account settings for the currently signed-in admin. Admins can update their display name, change their password, and permanently delete their own account. Email is shown for reference but is not editable.

## Route

`/profile` — authenticated admins only. Linked from the navbar account dropdown (**My profile**) and the mobile sidebar.

## Roles

Platform Admin, Super Admin. Each admin manages only their own account.

---

## Layout

Single-column page inside the standard Admin Shell. Max content width ~640px, three stacked sections separated by vertical spacing.

```
┌─────────────────────────────────────────────────────────────┐
│  My profile                                                 │
├─────────────────────────────────────────────────────────────┤
│  Role: Super Admin                                          │
│                                                             │
│  ── Profile information ─────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Name        [ Jose B.                          ]   │   │
│  │  Email       [ jose@rotra.app ]  (read-only)        │   │
│  │  Email cannot be changed.                           │   │
│  │                              [ Save changes ]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Password ────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  New password     [ ••••••••••••              👁 ]  │   │
│  │  Confirm password [ ••••••••••••              👁 ]  │   │
│  │                            [ Update password ]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Account deletion ────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Danger zone                                        │   │
│  │  Permanently delete your admin account...           │   │
│  │  [ Delete account ]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### Profile information

- **Name** — editable text input; required, min 1 character after trim
- **Email** — read-only disabled input; helper text: `"Email cannot be changed."`
- **Save changes** — submits `PATCH /api/admin-users/me` with `{ name }`
- Success toast: `"Profile updated."`; refreshes server layout so navbar name updates

### Password

- **New password** / **Confirm password** — masked inputs with show/hide toggle; min 8 characters; must match
- **Update password** — submits `POST /api/admin-users/me/change-password` with `{ password }`
- Success toast: `"Password updated."`; form resets

### Account deletion (danger zone)

- Red-bordered card with destructive **Delete account** button
- Opens confirmation dialog requiring the admin to type their exact email address
- **Delete account** (confirm) — `DELETE /api/admin-users/me/delete`
- On success: toast, Supabase sign-out, redirect to `/login`
- Guards (server-side):
  - Cannot delete if you are the last active Super Admin
  - Founding Super Admin (when `FOUNDING_SUPER_ADMIN_ID` is set) cannot self-delete

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin-users/me` | Current admin profile |
| PATCH | `/api/admin-users/me` | Update name |
| POST | `/api/admin-users/me/change-password` | Change password |
| DELETE | `/api/admin-users/me/delete` | Self-delete account |

All routes require `requireAdminSession()`.

---

## Navigation entry points

- **Desktop navbar** — account dropdown: avatar + name → **My profile**, **Sign out**
- **Mobile sidebar** — bottom section: admin name, **My profile** link, **Sign out**

---

## States

### Default

Form fields populated from session. Email disabled.

### Saving name / updating password

Submit buttons show spinner; inputs disabled; double-submit prevented.

### Delete confirmation

Confirm button disabled until typed email matches account email exactly (case-insensitive).

### Delete blocked

Server returns 403 with message when last Super Admin or founding Super Admin — shown as error toast.

### Session expired

Standard auth middleware redirect to `/login`.

---

## Related docs

- [`./dashboard.md`](./dashboard.md) — environment bar account menu spec
- [`./admins.md`](./admins.md) — Super Admin management of other admins (distinct from self-service profile)
