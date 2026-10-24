# Admin Users Specification

## Purpose

Admin directory tools in `apps/admin`: customers, testers, platform admins, tag definitions, and waitlist signups. All routes require an admin session. Super-admin-only mutations are called out below.

## Requirements

### Requirement: Customer directory
`GET /api/customers` SHALL list profiles where `adminRole` is null, with search and pagination. `/customers` and `/customers/[id]` SHALL use that data. Customer detail SHALL allow `PATCH …/identity`, `PATCH …/skills`, and tag add/remove (`POST/DELETE …/tags`). Verification and MMR/EXP stats SHALL be read-only. Customer mutations SHALL notify other admins.

#### Scenario: List customers
- GIVEN non-admin player profiles exist
- WHEN an admin GETs `/api/customers`
- THEN those profiles are returned and admin profiles are excluded

#### Scenario: Update customer identity
- GIVEN a customer id
- WHEN an admin PATCHes `/api/customers/[id]/identity` with valid fields
- THEN the profile identity fields are updated
- AND other admins can receive an inbox notification

### Requirement: Customer tag assignment rules
Assigning a tag MUST reference an active tag-definition slug. Tags marked `super_admin_only` SHALL require the caller to be `super_admin` (HTTP 403 otherwise). Duplicate assignment SHALL return HTTP 409.

#### Scenario: Regular admin assigns a super-admin-only tag
- GIVEN a tag definition with `super_admin_only` true
- AND the caller is `admin` not `super_admin`
- WHEN they POST `/api/customers/[id]/tags`
- THEN the API returns HTTP 403

### Requirement: Tester invites
Any authenticated admin MAY list testers (`GET /api/testers`) with status filter `pending|active|revoked|expired`. `POST /api/testers` SHALL send a Supabase invite, create/update the tester profile and invitation, and apply the tester tag. Invite requires `NEXT_PUBLIC_CLIENT_APP_ORIGIN`. Detail actions SHALL include resend (`POST …/resend`) and revoke (`POST …/revoke`).

#### Scenario: Invite a tester
- GIVEN `NEXT_PUBLIC_CLIENT_APP_ORIGIN` is configured
- WHEN an admin POSTs a valid tester invite
- THEN a Supabase invite is sent
- AND a tester profile/invitation exists

#### Scenario: Revoke a tester
- GIVEN an existing tester
- WHEN an admin POSTs `/api/testers/[id]/revoke`
- THEN the tester is marked revoked

### Requirement: Admin directory reads vs mutations
Any admin MAY list and view `/admins` and `/admins/[id]`. Invite, role change, deactivate, reactivate, force sign-out, resend invite, and delete SHALL be super-admin only. Role change SHALL delete the target's sessions. The UI SHALL not offer delete for `super_admin` rows. The founding super admin (`FOUNDING_SUPER_ADMIN_ID`) MUST NOT be modified or deleted. The last active super admin MUST NOT be demoted or deactivated. Mutations SHALL write `admin_action_log` and notify other super admins.

#### Scenario: Super admin invites an admin
- GIVEN the caller is `super_admin`
- WHEN they POST `/api/admin-users/invite`
- THEN a Supabase invite and admin profile are created

#### Scenario: Regular admin tries to change a role
- GIVEN the caller is `admin` not `super_admin`
- WHEN they PATCH `/api/admin-users/[id]/role`
- THEN the API rejects the mutation

#### Scenario: Protect founding super admin
- GIVEN the target id is `FOUNDING_SUPER_ADMIN_ID`
- WHEN a super admin attempts delete or role change
- THEN the service refuses the change

### Requirement: Tag definitions catalog
`GET /api/tag-definitions` SHALL be available to all admins. Super admins SHALL also see inactive definitions. `POST /api/tag-definitions` and `PATCH /api/tag-definitions/[id]` SHALL be super-admin only, write an audit log, and broadcast an admin notification. The `/tags` nav item MAY be hidden from non-super-admins, but the route SHALL still render in read-only mode for them.

#### Scenario: Super admin creates a tag
- GIVEN the caller is `super_admin`
- WHEN they POST a valid tag definition
- THEN the catalog row is created

#### Scenario: Regular admin opens /tags
- GIVEN the caller is `admin`
- WHEN they open `/tags`
- THEN they can view definitions
- AND create/update controls are not available

### Requirement: Waitlist is read-only
`GET /api/waitlist` and `GET /api/waitlist/stats` SHALL return paginated `waitlist_signups` plus totals (24h/7d/30d). `/waitlist` SHALL display that table. There is no delete or export API.

#### Scenario: Admin views waitlist
- GIVEN landing-page signups exist
- WHEN an admin opens `/waitlist`
- THEN the table and stats are shown
- AND no mutation API is called

## Documented product rules

The following rules come from `docs/business_logic/admin_app/08_user_management.md`, `10_tag_definitions.md`, `11_tester_management.md`, and `customer-detail-and-tags.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact. Current customer/tester/admin/tag/waitlist APIs are implemented.

### Requirement: Single profiles table
Admins and players SHALL share `profiles`. Platform admin is `admin_role` non-null. Testers SHALL have `is_tester_account = true` and `admin_role IS NULL`. Granting admin SHALL NOT create a second identity row. Last-active time SHALL be derived from `admin_action_log`, shown as Never when absent.

#### Scenario: Promote existing player
- GIVEN a player profile with `admin_role` null
- WHEN they are invited as Admin
- THEN the same `profiles.id` receives `admin_role`

### Requirement: Reserved tester tag
Slug `tester-login-as-guest` SHALL be seeded and MUST NOT be deactivated via API or UI.

#### Scenario: Deactivate reserved tag
- GIVEN slug `tester-login-as-guest`
- WHEN a Super Admin tries to deactivate it
- THEN the documented rule refuses

### Requirement: Tester revoke deletes password-only auth user
Revoke SHALL be pending-only. When the tester has no `facebook_id`, revoke SHALL delete the auth user. Tester operations SHALL live under `/testers`, not `/customers`. Invite `redirectTo` SHALL be `{CLIENT_ORIGIN}/login-tester` with no trailing path.

#### Scenario: Revoke email-only tester
- GIVEN a pending tester with null `facebook_id`
- WHEN an admin revokes
- THEN the invitation is revoked and the auth user is deleted

### Requirement: Customer tags are a public client contract
All assigned tags SHALL be returned on Client `GET /api/profile/[userId]` and `getCurrentProfile()`. Slugs SHALL be treated as a public contract once assigned. Verification, onboarding completion, MMR, and EXP SHALL remain read-only on customer detail.

#### Scenario: Client reads tags
- GIVEN a customer has tag `tester-login-as-guest`
- WHEN the client public profile API is called
- THEN that slug is included

## Source

- `apps/admin/src/app/(protected)/customers/**`
- `apps/admin/src/app/(protected)/testers/**`
- `apps/admin/src/app/(protected)/admins/**`
- `apps/admin/src/app/(protected)/tags/**`
- `apps/admin/src/app/(protected)/waitlist/**`
- `apps/admin/src/app/api/customers/**`
- `apps/admin/src/app/api/testers/**`
- `apps/admin/src/app/api/admin-users/**`
- `apps/admin/src/app/api/tag-definitions/**`
- `apps/admin/src/app/api/waitlist/**`
- `packages/db/src/customer-profile-service.ts`
- `packages/db/src/tester-invitation-service.ts`
- `packages/db/src/admin-user-service.ts`
- `packages/db/src/profile-tag-service.ts`
