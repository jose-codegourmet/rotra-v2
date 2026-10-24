# Admin App — 01 Admin Overview

## What the Admin App Is

The Admin App is an internal-only web dashboard for the platform team. It provides a single place to control, monitor, and configure the entire badminton platform without touching code or running deployments.

The Admin App is intentionally separate from the Client App to:
- Prevent accidental exposure of platform controls to end users
- Allow internal operations to continue even if the Client App has an incident
- Keep audit trails for all admin actions isolated and tamper-proof

---

## Admin User

Admin accounts are created **only** through the invitation flow run by a Super Admin from the Admin App's **Admins** module at `/admin/admins` — there is no public registration or self-service flow. See [`08_user_management.md`](./08_user_management.md) for the full lifecycle (invite → activation → deactivation → role change → audit) and the underlying schema, and [`../../views/admin_app/admins.md`](../../views/admin_app/admins.md) for the UI.

> The Admin App also exposes a **Users** directory at `/admin/users` for inspecting **player** profiles that do not have platform admin access (`admin_role IS NULL`) — see [`../../views/admin_app/users.md`](../../views/admin_app/users.md). Players are not provisioned from the Admin App; they self-register on the Client App via Facebook OAuth. The **Admins** and **Users** directories are two lenses over the same `profiles` table: `admin_role IS NOT NULL` vs `IS NULL`.

### Capabilities

| Action | Details |
|--------|---------|
| Approve / reject **club applications**; manage **demotion requests** and **complaints** | Structured queues; see [`../../database/12_club_governance.md`](../../database/12_club_governance.md) |
| Manage all kill switches | Toggle any feature flag on/off across the platform |
| Switch and configure environments | Manage dev, staging, and production configs |
| Platform-wide moderation | Flagged reviews, account suspensions, content removal |
| Manage global rankings | Featured leaderboards, cross-club standings |
| Configure gamification parameters | EXP rates, tier thresholds, badge criteria |
| Manage skill dimensions | Add/edit/retire skill dimensions without a deploy |
| View platform analytics | Active clubs, sessions per week, player retention, revenue signals |

### What Admin Cannot Do

- Admins do not interact with live sessions — session management is the Que Master's domain
- Admins do not override match scores directly — that is scoped to the Que Master
- Admins do not appear in any player-facing view, leaderboard, or club roster

---

## Access Model

| Level | DB value | Who | How |
|-------|----------|-----|-----|
| Founding Super Admin | `profiles.admin_role = 'super_admin'`, id matches `FOUNDING_SUPER_ADMIN_ID` | Platform owner | Seeded directly in the database; cannot be deactivated, demoted, or removed by any UI flow |
| Super Admin | `profiles.admin_role = 'super_admin'` | Senior internal team member | Invited by another Super Admin; can be deactivated or demoted |
| Admin | `profiles.admin_role = 'admin'` | Internal team member | Invited by a Super Admin; can be deactivated, reactivated, or promoted |

Inviting, deactivating, role-changing, and force-signing-out other admins is **Super Admin only**. Regular Admins have read-only access to the Admins module. Full lifecycle and guards (founding-Super-Admin protection, last-active-Super-Admin guard) are documented in [`08_user_management.md`](./08_user_management.md).

All admin actions are logged in **`admin_action_log`** with:
- Timestamp
- Admin account that performed the action
- `action`, `entity_type`, `entity_id`
- `before_value` / `after_value` JSON (uncapped) and optional `note`

Logs are append-only — no admin can edit or delete rows (future cron may prune very old rows).

---

## Auth & Security

- Admin App is hosted at a separate URL (not the same domain as the Client App).
- Login is **email + password**. Admin users are created through invitation by a Super Admin and complete onboarding by setting their password from a Supabase invite link.
- There is no Facebook OAuth, no social provider, and no public sign-up.
- Every authenticated request must satisfy all three of: JWT claim `app_metadata.role = 'admin'`, `profiles.admin_role IS NOT NULL`, and `profiles.admin_is_active = true`.
- Sessions expire after 4 hours of inactivity.
- All Admin App traffic is IP-restricted to the internal team by default (configurable).
- Failed login attempts are rate-limited and logged.

> OTP/TOTP remains optional future work. The MVP path is password-based sign-in to avoid dependency on OTP email quotas for daily internal operations.

### One-time migration note (existing admin accounts)

Admins created during the OTP-only phase may not have a password yet. For those accounts, set a password once via Supabase dashboard (Auth -> Users -> Reset password / update user) or via admin API before first password login. Example known case: `b5890af7-2c66-4f9b-8ecf-8bd65b34e2c1`.

---

## MVP Phase

The Admin App is the canonical surface for **club applications**, **demotions**, **complaints**, **`admin_notifications`**, and **`admin_action_log`**. See [`../client_app/16_mvp_plan.md`](../client_app/16_mvp_plan.md) — Phase 3, Admin Role section.

In-app **admin notifications** (dropdown + `/admin/notifications`) are fetched when opened; full **Realtime** is optional and not required for MVP on the Admin app.
