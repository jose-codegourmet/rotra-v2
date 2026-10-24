# 10 — Tag definitions (Admin)

## Overview

Super Admins maintain a **tag catalog** (`tag_definitions`) that controls which internal labels admins may assign to customer (player) profiles. Assignments are stored in `profile_tags` and validated against the catalog in `@rotra/db`.

## Roles

| Role | Capabilities |
|------|----------------|
| Super Admin | Create, update, deactivate definitions on `/tags` |
| Admin | Read active definitions; assign allowed tags on customer detail |

## `assignableBy`

| Value | Meaning |
|-------|---------|
| `any_admin` | Any active admin may assign this tag |
| `super_admin_only` | Only super admins may assign |

## Reserved slug

- **`tester-login-as-guest`** — seeded in migration; required for client `/login-tester`; cannot be deactivated via API or UI.

## API routes

| Method | Route | Caller |
|--------|-------|--------|
| GET | `/api/tag-definitions` | Any admin (inactive included for super admin) |
| POST | `/api/tag-definitions` | Super admin |
| GET | `/api/tag-definitions/[id]` | Any admin |
| PATCH | `/api/tag-definitions/[id]` | Super admin |

## Relationship to `profile_tags`

- Customer tag UI sends `{ slug }` to `POST /api/customers/[id]/tags`.
- Service resolves slug → catalog row → stores definition `label` on `profile_tags.label`.

## Related docs

- [13_tag_definitions.md](../../database/13_tag_definitions.md)
- [tags.md](../../views/admin_app/tags.md)
- [customer-detail-and-tags.md](./customer-detail-and-tags.md)
