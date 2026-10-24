# Customer detail & profile tags

## Scope

- **Who**: authenticated Admin App users (`requireAdminSession()`).
- **What**: player profiles with `profiles.admin_role IS NULL` (the “customer” / player directory lens).
- **Where**: Admin UI at `/customers/[id]` and JSON APIs under `/api/customers/[id]/…`.

## Editable fields (Admin)

| Area | Fields | HTTP |
|------|--------|------|
| Basic information | `name`, `email`, `phone` (empty string clears optional fields) | `PATCH /api/customers/[id]/identity` |
| Skills & preferences | `playing_level`, `format_preference`, `court_position`, `play_mode` (nullable) | `PATCH /api/customers/[id]/skills` |
| Tags | Add by catalog `slug`; remove by tag `id` | `POST /api/customers/[id]/tags`, `DELETE /api/customers/[id]/tags/[tagId]` |

Verification (`is_verified`, `email_verified`), onboarding completion, MMR/EXP, and similar fields stay **read-only** in this UI; they continue to be owned by Client flows, auth, and game systems.

## Tags

- **Purpose**: internal cohorts (e.g. beta testers), ops filters, and optional Client-side feature checks.
- **Catalog**: options from `GET /api/tag-definitions` (active only for regular admins; super admins see inactive for management on `/tags`).
- **Assignment**: UI sends `{ slug }`; `assignableBy` on the definition is enforced in `@rotra/db` (`super_admin_only` requires super admin).
- **Slug rule**: must exist in `tag_definitions` and be active — unique per `(profile_id, slug)`.
- **Audit**: `assigned_by` stores the admin actor’s `profiles.id` when a tag is added; FK `ON DELETE SET NULL` if that admin row disappears.
- **Client exposure**: all tags for a profile are returned on the Client App’s `GET /api/profile/[userId]` and on `getCurrentProfile()` so product code can branch on `slug` (e.g. pills or feature gates). Treat tag slugs as part of the public contract once assigned.

## Related docs

- Schema: [`../../database/01_users_and_profiles.md`](../../database/01_users_and_profiles.md) (`profile_tags`), [`../../database/13_tag_definitions.md`](../../database/13_tag_definitions.md).
- Tag catalog: [`10_tag_definitions.md`](./10_tag_definitions.md).
- UI wireframe: [`../../views/admin_app/users.md`](../../views/admin_app/users.md).
