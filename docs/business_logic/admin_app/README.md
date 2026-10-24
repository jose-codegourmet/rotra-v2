# Admin App — Business Logic

The Admin App is an internal operations dashboard used exclusively by the platform team. It is not exposed to players, club owners, or any public user. Its primary responsibilities are platform safety, configuration, and oversight.

---

## Who Uses This App

| User | Role |
|------|------|
| **Founding Super Admin** | Platform owner; seeded directly in the database; cannot be deactivated, demoted, or removed by any UI flow |
| **Super Admin** | Senior internal team member; can manage other admins (invite, role change, deactivate) |
| **Platform Admin** | Internal team member with full platform authority but read-only on the Admins module |

All admin accounts are provisioned through the Super-Admin-driven invitation flow described in [`08_user_management.md`](./08_user_management.md). There is no self-registration, and all roles are stored on `profiles.admin_role`.

---

## Core Responsibilities

| Responsibility | Description |
|---------------|-------------|
| Kill switches | Toggle any platform feature on/off without a code deploy |
| Environment management | Switch and configure dev / staging / production environments |
| Club applications & demotions | Review club applications, demotion requests, and related complaints |
| Platform moderation | Handle flagged reviews, account suspensions, content removal |
| Platform configuration | Manage gamification parameters, skill dimensions, system constants |
| MMR & skills management | Configure MMR asymmetry, match EXP awarding behavior, and MMR calibration parameters for competitive sessions |
| Platform analytics | Monitor active clubs, session volume, player retention, and health metrics |
| Admin user management | Invite, deactivate, role-change, and audit other **admin** accounts (Super Admin only) — UI at `/admin/admins` |
| Player directory | Read + lookup of profiles with `admin_role IS NULL` — UI at **`/customers`**; customer detail supports identity/skills/tags edits; enforcement actions still route through Moderation |

---

## Document Index

| File | Description |
|------|-------------|
| [01_admin_overview.md](./01_admin_overview.md) | Admin role, access levels, account management |
| [02_kill_switches.md](./02_kill_switches.md) | Feature flags, kill switches, rollback controls |
| [03_environment_management.md](./03_environment_management.md) | Dev / staging / production environment config |
| [04_approvals_and_moderation.md](./04_approvals_and_moderation.md) | Club applications, demotions, complaints, moderation, account actions |
| [05_platform_config.md](./05_platform_config.md) | Global constants — EXP rates, tier thresholds, skill dimensions |
| [06_platform_analytics.md](./06_platform_analytics.md) | Platform health dashboard and metrics |
| [07_mmr_and_skills_management.md](./07_mmr_and_skills_management.md) | MMR and match EXP governance, guardrails, and operational workflows |
| [08_user_management.md](./08_user_management.md) | **Admin** user management (`/admin/admins`) — inviting, deactivating, role-changing, and auditing platform admin accounts. The player directory at `/admin/users` (`admin_role IS NULL` lens) is read-oriented; see [`../../views/admin_app/users.md`](../../views/admin_app/users.md). |
| [09_notification_broadcasts.md](./09_notification_broadcasts.md) | Tag/role notification fan-out, `notification_broadcasts` audit trail, Super Admin HTTP API, and automated Super Admin alerts on admin lifecycle mutations. |
| [customer-detail-and-tags.md](./customer-detail-and-tags.md) | Customer (`/customers/[id]`) edits — identity, skills, and **profile tags**; slug rules and Client API exposure. |
| [12_places_management.md](./12_places_management.md) | Places Management — custom venue CRUD at `/places`, review workflow for player submissions, and audit logging. View spec: [`../../views/admin_app/places.md`](../../views/admin_app/places.md). |

---

## Relationship to Client App

The Admin App is a management layer **on top of** the Client App. Admin actions take effect on the live Client App:

- A kill switch toggled in the Admin App immediately hides or disables the corresponding feature in the Client App
- A **club application** approved in the Admin App mints a `clubs` row and unlocks **ownership of that club** in the Client App
- Config changes to EXP rates or tier thresholds apply to future Client App calculations
- Moderation actions (suspensions, content removal) propagate instantly to the Client App

The Admin App never exposes player-facing UI — it is a tool-only interface.
