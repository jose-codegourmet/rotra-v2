# Admin App — 08 Admin User Management

## Overview

The Admin User Management module is where Super Admins provision, deactivate, and audit other **admin** accounts (the platform team). It is the **only** entry point for new admin users — there is no self-registration, no public sign-up, and no Supabase OAuth path on the Admin App.

Admin User Management is exposed at `/admin/admins` in the Admin App. Every admin can open the directory, but only **Super Admins** can mutate it. The UI is documented in [`../../views/admin_app/admins.md`](../../views/admin_app/admins.md).

### Single `profiles` table; tags, not duplicate entities

There is **no separate table for “admins” vs “players”.** Every person is represented by **one row** in [`profiles`](../../database/01_users_and_profiles.md). **Everyone is a player** in product terms; platform Admin / Super Admin is expressed by **`profiles.admin_role`** (non-null). Club owner and que master are **derived tags** from clubs / memberships (see **Roles & tags derivation** in that doc), not separate identity tables.

The Admin App exposes **two filtered lenses** over the same table:

| Lens | Filter | Doc |
|------|--------|-----|
| Player directory | `admin_role IS NULL` | [`../../views/admin_app/users.md`](../../views/admin_app/users.md) |
| Admin directory (this module) | `admin_role IS NOT NULL` | [`../../views/admin_app/admins.md`](../../views/admin_app/admins.md) |
| Tag definitions (super admin) | — | [`10_tag_definitions.md`](./10_tag_definitions.md), `/tags` |
| Testers | `is_tester_account = true`, `admin_role IS NULL` | [`11_tester_management.md`](./11_tester_management.md), `/testers` |

> The player directory at `/customers` lists and inspects **non-admin** profiles (read-oriented). Enforcement on players routes through [`./04_approvals_and_moderation.md`](./04_approvals_and_moderation.md). Granting someone platform admin access does not create a second row — it sets `admin_role` on their existing `profiles` row; they then appear under `/admin/admins` and typically **not** in the `/admin/users` directory list.

---

## Roles

| Role | DB value | Capabilities |
|------|---|---|
| Super Admin | `profiles.admin_role = 'super_admin'` | Everything below + manage other admin accounts |
| Admin | `profiles.admin_role = 'admin'` | Read-only on `/admin/admins`. Cannot invite, deactivate, change role, or force sign-out other admins. |

There is exactly one **founding Super Admin**, seeded directly in the database at deploy time. The founding Super Admin cannot be deactivated, demoted, or removed by any UI flow — it is the platform's safety floor. Every other admin (including additional Super Admins) can be created, demoted, or deactivated through this module.

`admin_role` is a Postgres enum:

```sql
CREATE TYPE admin_role_enum AS ENUM ('super_admin', 'admin');
```

A `profiles` row with a non-null `admin_role` is an admin account. A null value means the row is a regular player profile.

> The Supabase JWT claim `app_metadata.role = 'admin'` continues to be the gate that lets the Admin App pass middleware (see `requireAdminSession()` in `apps/admin/src/lib/auth/admin-session.ts`). The DB column is the source of truth for *which kind* of admin and *whether they're currently active*.

---

## Storage Model

Admins live in the same `profiles` table as players. Admin-specific state is captured in additional columns rather than a separate table — this matches the answer chosen during design review and keeps the auth-id linkage trivial (`auth.users.id = profiles.id` for both admins and players).

```sql
ALTER TABLE profiles
  ADD COLUMN admin_role            admin_role_enum,                                   -- null = player; non-null = admin
  ADD COLUMN admin_is_active       bool        NOT NULL DEFAULT false,
  ADD COLUMN admin_invited_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN admin_invited_at      timestamptz,
  ADD COLUMN admin_activated_at    timestamptz,
  ADD COLUMN admin_deactivated_at  timestamptz,
  ADD COLUMN admin_deactivated_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,

  -- An admin row must have a role and an invited_at; a non-admin row has neither.
  ADD CONSTRAINT chk_admin_consistency CHECK (
    (admin_role IS NULL AND admin_invited_at IS NULL)
    OR
    (admin_role IS NOT NULL AND admin_invited_at IS NOT NULL)
  );

CREATE INDEX idx_profiles_admin_role
  ON profiles(admin_role) WHERE admin_role IS NOT NULL;
```

### Founding Super Admin protection

The founding Super Admin's `profiles.id` is recorded in a server-side environment constant (`FOUNDING_SUPER_ADMIN_ID`). Every mutating route in this module compares the **target** id to that constant and returns 403 if they match. There is **no** UI affordance — the protection is enforced server-side regardless of the calling Super Admin.

A "last active Super Admin" guard is layered on top: any operation that would leave zero active Super Admins is rejected with 403, even if the founding Super Admin happens to be deactivated for some unforeseen reason.

### Derived: `last_active_at`

The directory shows a `Last active` timestamp. This is **not** a column — it is derived from `admin_action_log`:

```text
last_active_at = max(admin_action_log.created_at) WHERE admin_action_log.admin_id = profiles.id
```

If the admin has never written a row to `admin_action_log`, last active is shown as `Never`.

---

## Lifecycle

```text
[invited]  ─►  [active]  ─►  [inactive]
                  ▲             │
                  └─────────────┘
              (re-activated by Super Admin)
```

| State | profile shape | Login? |
|-------|---------------|--------|
| `invited` | `admin_role` set, `admin_is_active = false`, an open `admin_invitations` row exists | Password onboarding link can be sent, but `requireAdminSession` rejects with 403 because `admin_is_active = false` |
| `active` | `admin_role` set, `admin_is_active = true` | Yes |
| `inactive` | `admin_role` set, `admin_is_active = false`, no open invitation | Sign-in attempt can authenticate at Supabase but `requireAdminSession` returns 403; UI is fully gated |

Deactivate remains the default access-removal flow. Super Admins may additionally **Delete** an `admin` row (never another `super_admin`, never the founding Super Admin, never themselves): `auth.admin.deleteUser` removes the `auth.users` row; because `profiles.id` references `auth.users(id)` with `ON DELETE CASCADE`, the `profiles` row is removed as well. The directory lists only profiles that still have a matching `auth.users` row (`INNER JOIN`). Older `admin_action_log` rows that referenced the deleted profile as actor have `admin_id` set to `NULL` (`ON DELETE SET NULL`); the UI may show `[deleted admin]` for the actor.

---

## Inviting an Admin (Super Admin only)

Triggered from the directory page via `Add admin`.

1. Super Admin enters **email**, **name**, and **role** (`Admin` or `Super admin`).
2. Server validates:
   - Caller has `admin_role = 'super_admin'` and `admin_is_active = true`.
   - Email is not already an admin profile.
   - There is no open admin invitation for that email (status `pending`).
3. Server, in a single transaction:
   - Creates a Supabase `auth.users` row via the service role with `app_metadata.role = 'admin'` (this is what allows middleware/admin-session checks after sign-in — see [Login](#login-recap-from-01_admin_overviewmd)).
   - Inserts a `profiles` row with `admin_role = <chosen>`, `admin_is_active = false`, `admin_invited_by = <super admin>`, `admin_invited_at = now()`.
   - Inserts an `admin_invitations` row with status `pending` (see schema below).
   - Sends the Supabase invite email with a redirect to the Admin App `set-password` flow.
   - Writes an `admin_action_log` entry: `action = 'admin_invited'`.
4. Recipient receives the email and sets a password via the invite link callback.
5. On the first successful password setup/sign-in:
   - `admin_invitations.status` flips to `accepted`, `accepted_at = now()`, `accepted_by = <profile id>`.
   - `profiles.admin_is_active` is set to `true`, `admin_activated_at = now()`.
   - `admin_action_log` entry: `action = 'admin_activated'`.

Until step 5 happens, the invited admin cannot complete onboarding and every server action returns 403, because `admin_is_active = false`.

### `admin_invitations`

`admin_invitations` is a **process / lifecycle** table (pending token, expiry, status transitions) — same idea as [`email_invitations`](../../database/01_users_and_profiles.md) for player email flows. It does **not** duplicate a person entity: the invited user still becomes **one** `profiles` row linked to `auth.users`.

Admin invitations live in a **separate table** from `email_invitations` (which covers player invitation paths). Isolating the audit trail lets us evolve admin invites independently and keeps RLS simple.

```sql
CREATE TABLE admin_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  role          admin_role_enum NOT NULL,
  invited_by    uuid NOT NULL REFERENCES profiles(id),

  status        invitation_status_enum NOT NULL DEFAULT 'pending', -- pending | accepted | expired | revoked

  accepted_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at   timestamptz,

  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Only one open admin invite per email at a time
CREATE UNIQUE INDEX idx_admin_invitations_pending_email
  ON admin_invitations(email)
  WHERE status = 'pending';

CREATE INDEX idx_admin_invitations_email  ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status);
```

A `Resend invite` action revokes any existing `pending` row, inserts a fresh one, and re-issues the invite email.

---

## Login (recap from `01_admin_overview.md`)

The Admin App authenticates with **email + password**. There is no Facebook OAuth, no social provider, and no public sign-up. This is the canonical MVP flow.

The invitation flow creates an `auth.users` account, sets `app_metadata.role = 'admin'`, then sends an invite email that routes through `/auth/accept-invite` before password setup. Existing accounts can use email + password directly once activated.

After sign-in succeeds, the middleware in `apps/admin/src/middleware.ts` and `requireAdminSession()` enforce **all three** of the following on every authenticated request:

1. `app_metadata.role === 'admin'` (or `user_metadata.role === 'admin'`).
2. `profiles.admin_role IS NOT NULL`.
3. `profiles.admin_is_active = true`.

Any failure redirects to `/login?error=forbidden` for page requests, or returns 403 for API requests.

> OTP endpoints may remain in code as dormant fallback paths, but password-based login is the supported default for internal operations.

**Client app:** Active admins can also sign into the **player** app at `/login-admin` (gate password + same email/password) to use the client dashboard with an on-screen **Super admin** / **Admin** pill. Provisioning is unchanged: invites and role changes still happen only through this Admin module and Supabase; the client path is an additional entry point for the same `profiles` row.

---

## Operations on Existing Admins

All operations below are **Super Admin only**, except where noted, and **all** of them write to `admin_action_log` in the same transaction as the data change.

| Action | Allowed when | Effect | `admin_action_log` action |
|--------|--------------|--------|---------------------------|
| Resend invite | target has `admin_is_active = false` AND has a `pending` or `expired` `admin_invitations` row | Revoke any open pending row, insert a fresh one, send a new invite email | `admin_invite_resent` |
| Deactivate | target is currently active **and** is not the founding Super Admin **and** is not the only remaining active Super Admin | Set `admin_is_active = false`, `admin_deactivated_at = now()`, `admin_deactivated_by = <super admin>`; revoke all Supabase sessions for the target (force sign-out) | `admin_deactivated` |
| Reactivate | target has `admin_is_active = false` and no open invitation | Set `admin_is_active = true`, `admin_activated_at = now()` | `admin_reactivated` |
| Change role | target is **not** the founding Super Admin AND (when demoting Super Admin → Admin) is not the only remaining active Super Admin | Update `profiles.admin_role`; revoke all Supabase sessions for the target so the new claim is re-fetched on next login | `admin_role_changed` (with `before_value` / `after_value`) |
| Force sign-out | target is active | Revoke all Supabase sessions for that user via the service role | `admin_force_signed_out` |
| Delete | target has `admin_role = 'admin'` AND `target.id != actor.id` | Revoke any pending invite; write `admin_deleted` log; then `auth.admin.deleteUser` cascades: `profiles` row removed; `admin_action_log.admin_id` / `admin_invitations.invited_by` (and similar author FKs) for that profile become `NULL` | `admin_deleted` |
| View action log | any admin (read-only on the detail page) | Render two filtered timelines: actions **performed by** this admin (`admin_id = target.id`) and actions **performed on** this admin (`entity_type = 'admin_user' AND entity_id = target.id`) | (read; no log entry written) |

Notes:

- **Delete is fully hard.** Deleting an admin removes `auth.users` and cascades to `profiles`. The directory hides them by joining `profiles` to `auth.users`. Audit rows survive with nullified author FKs where applicable.
- The founding Super Admin guard rejects deactivate, role change, and (implicitly) anything that would lock them out, regardless of which Super Admin is calling.
- Force sign-out is its own action so a Super Admin can log a target out without changing their role or active status (e.g. after credential exposure on the recipient's email).

### Super Admin inbox alerts (`admin_notifications`)

Each mutation above also fans out an **`admin_profile_changed`** notification (severity varies by action) to **every other active Super Admin** — same DB transaction as the audit log via `broadcastNotificationInTx` in `@rotra/db`. Rows include `severity`, `broadcast_id` → `notification_broadcasts`, and `target_url` for deep links. See [`./09_notification_broadcasts.md`](./09_notification_broadcasts.md).

---

## Page Permissions

| User | `/admin/admins` directory | `/admin/admins/[id]` detail | Mutations |
|------|---------------------------|------------------------------|-----------|
| Super Admin (active) | View all | View all | All operations above (subject to founding-Super-Admin and last-Super-Admin guards) |
| Admin (active) | View all | View all (read-only) | None — `Add admin` button is hidden, and all row actions other than `Copy email` and `View details` are hidden |
| Inactive admin | Cannot reach `/admin/admins` (blocked by middleware) | — | — |

The page-level gate is enforced in three independent places, and **all three** must agree:

1. Middleware allows the request through (admin role + active).
2. Page render hides Super-Admin-only UI based on the caller's `admin_role`.
3. API routes re-check `admin_role` and the founding-/last-Super-Admin guards before mutating. The UI is never the source of truth for authorisation.

---

## API Routes (target shape)

These are not yet implemented — the Admins module today is mock-only (`apps/admin/src/constants/mock-admin-users.ts`). When wired up, the routes follow the existing admin API conventions (per-route admin actor resolution via `getAdminActorProfileId()` in `apps/admin/src/lib/admin-actor.ts`):

| Route | Method | Caller | Purpose |
|-------|--------|--------|---------|
| `/api/admin-users` | `GET` | Any active admin | List admin profiles for the directory |
| `/api/admin-users/invite` | `POST` | Super Admin | Create invitation + auth user + profile (transactional) |
| `/api/admin-users/[id]` | `GET` | Any active admin | Detail + filtered `admin_action_log` timelines |
| `/api/admin-users/[id]/resend-invite` | `POST` | Super Admin | Re-issue invitation |
| `/api/admin-users/[id]/deactivate` | `POST` | Super Admin | Deactivate + force sign-out |
| `/api/admin-users/[id]/reactivate` | `POST` | Super Admin | Reactivate |
| `/api/admin-users/[id]/role` | `PATCH` | Super Admin | Change `admin_role` |
| `/api/admin-users/[id]/force-signout` | `POST` | Super Admin | Revoke all sessions for the target |
| `/api/admin-users/[id]/delete` | `POST` | Super Admin | Write `admin_deleted` audit row in a DB transaction, then delete auth user (cascade removes profile) |

Most mutating routes write one `admin_action_log` row in the same transaction as the data change. **Delete** writes the log in a transaction first, then calls Supabase `auth.admin.deleteUser` outside that transaction; if auth delete fails, the audit row is rolled back.

---

## Audit Log

`admin_action_log` is the single source of truth for who-did-what. The User Management module both writes to it (every mutation) and reads from it (the detail-page action history panels and the derived `last_active_at`).

Two enum extensions are required to support this module — they slot into the existing types defined in [`docs/database/12_club_governance.md`](../../database/12_club_governance.md):

```sql
ALTER TYPE admin_action_enum ADD VALUE 'admin_invited';
ALTER TYPE admin_action_enum ADD VALUE 'admin_invite_resent';
ALTER TYPE admin_action_enum ADD VALUE 'admin_activated';
ALTER TYPE admin_action_enum ADD VALUE 'admin_deactivated';
ALTER TYPE admin_action_enum ADD VALUE 'admin_reactivated';
ALTER TYPE admin_action_enum ADD VALUE 'admin_role_changed';
ALTER TYPE admin_action_enum ADD VALUE 'admin_force_signed_out';
ALTER TYPE admin_action_enum ADD VALUE 'admin_deleted';

ALTER TYPE admin_action_entity_enum ADD VALUE 'admin_user';
```

| `action` | `entity_type` | `entity_id` | Notes |
|----------|---------------|-------------|-------|
| `admin_invited` | `admin_user` | invited admin's `profiles.id` | `after_value` carries `{ email, role }` |
| `admin_invite_resent` | `admin_user` | target `profiles.id` | |
| `admin_activated` | `admin_user` | target `profiles.id` | Written when invite/password onboarding completes and `activateAdminIfNeeded` runs; `admin_id` is the target themselves (they activated their own account) |
| `admin_deactivated` | `admin_user` | target `profiles.id` | |
| `admin_reactivated` | `admin_user` | target `profiles.id` | |
| `admin_role_changed` | `admin_user` | target `profiles.id` | `before_value` / `after_value` carry the role |
| `admin_force_signed_out` | `admin_user` | target `profiles.id` | |
| `admin_deleted` | `admin_user` | target `profiles.id` (at write time; profile is removed after cascade) | `before_value` captures admin profile lifecycle snapshot |

The detail page renders two panels off this single table:

- **Activity by this admin** — `WHERE admin_id = <target>.id`. This is what the target has done.
- **Activity on this admin** — `WHERE entity_type = 'admin_user' AND entity_id = <target>.id`. This is what has been done to the target.

---

## MVP Scope vs Today

The current implementation under `apps/admin/src/components/modules/users/` is **mock-only**, and is currently routed at `/users` in the codebase. The target structure renames the route to `/admin/admins` (this module) and frees `/admin/users` for the **player directory** documented in [`../../views/admin_app/users.md`](../../views/admin_app/users.md):

| Layer | Status |
|-------|--------|
| Directory UI (`AdminUsersTable`, `UsersView`) | Built, mock data; sits under `apps/admin/src/components/modules/users/` — to be moved/renamed under an `admins/` module folder when wired up for real |
| Add User dialog | Built, no API call |
| User detail page | Built, mock data |
| `admin_role` and `admin_is_active` columns | Not yet in `profiles` |
| `admin_invitations` table | Not yet in schema |
| API routes above | Not yet implemented |
| `admin_action_enum` / `admin_action_entity_enum` extensions | Not yet applied |
| Force sign-out via service role | Not yet implemented |
| `FOUNDING_SUPER_ADMIN_ID` env constant | Not yet wired |
| Player directory at `/admin/users` (separate page, `admin_role IS NULL` lens) | Not yet implemented; documented in [`../../views/admin_app/users.md`](../../views/admin_app/users.md) |

The mock distinguishes `Admin` vs `Super admin` as a free-text role string and treats `active`/`inactive` as a UI badge. This document describes the **target** shape — replace mocks with the model above when Admin User Management is implemented for real, and rename the route to `/admin/admins` at the same time.

---

## Relationship to Other Docs

- [`01_admin_overview.md`](./01_admin_overview.md) — Admin role and access summary; auth flow is described there at a glance and elaborated here.
- [`../../views/admin_app/admins.md`](../../views/admin_app/admins.md) — UI for this module (`/admin/admins`).
- [`../../views/admin_app/users.md`](../../views/admin_app/users.md) — Player directory (`/admin/users`). Same `profiles` table; UI lens `admin_role IS NULL` only.
- [`docs/database/12_club_governance.md`](../../database/12_club_governance.md) — `admin_action_log` schema and the `admin_action_enum` / `admin_action_entity_enum` definitions extended above.
- [`docs/database/08_admin.md`](../../database/08_admin.md) — Admin role JWT-claim model and platform-wide RLS pattern.
- [`docs/database/01_users_and_profiles.md`](../../database/01_users_and_profiles.md) — The `profiles` table that admin rows live in.
- [`docs/views/admin_app/login.md`](../../views/admin_app/login.md) — Login UI and invite onboarding flow.
