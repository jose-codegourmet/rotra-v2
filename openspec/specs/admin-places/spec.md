# Admin Places Specification

## Purpose

Admin management of venue/place records. Any authenticated active admin can list, create, edit, confirm, and delete places. Admin-created places skip the unreviewed state.

## Requirements

### Requirement: List places with status tabs
`GET /api/places` SHALL require an admin session and return places newest first. An optional `status=confirmed|unreviewed` filter SHALL be applied. `/places` SHALL show All / Confirmed / Unreviewed tabs backed by that API.

#### Scenario: List unreviewed places
- GIVEN places with status `unreviewed`
- WHEN an admin GETs `/api/places?status=unreviewed`
- THEN only unreviewed places are returned

#### Scenario: Unauthenticated list
- GIVEN no admin session
- WHEN they GET `/api/places`
- THEN the API returns HTTP 401 or 403

### Requirement: Admin create is immediately confirmed
`POST /api/places` SHALL validate name, address, latitude, longitude, and optional description/phone/website. It MUST create the place with `status: confirmed`, `reviewedById` = current admin, `reviewedAt` now, and `submittedById` null. It SHALL write `admin_action_log` with action `place_created`. Invalid bodies SHALL return HTTP 400.

#### Scenario: Admin creates a place
- GIVEN a valid place body
- WHEN an admin POSTs `/api/places`
- THEN the place is stored as `confirmed`
- AND an admin action log row is written

#### Scenario: Invalid create body
- GIVEN a name shorter than 2 characters
- WHEN they POST `/api/places`
- THEN the API returns HTTP 400

### Requirement: Edit and confirm
`PATCH /api/places/[id]` SHALL update provided fields. `status` MAY only be set to `confirmed`. Confirming an unreviewed place SHALL set `reviewedById` and `reviewedAt`. Missing places SHALL return HTTP 404.

#### Scenario: Confirm an unreviewed place
- GIVEN an unreviewed place
- WHEN an admin PATCHes `{ status: "confirmed" }`
- THEN the place becomes confirmed
- AND reviewer metadata is stored

### Requirement: Delete place
`DELETE /api/places/[id]` SHALL delete the place and write an admin action log. Missing places SHALL return HTTP 404.

#### Scenario: Admin deletes a place
- GIVEN an existing place
- WHEN an admin DELETEs `/api/places/[id]`
- THEN the place row is removed
- AND an admin action log row is written

## Documented product rules

The following rules come from `docs/business_logic/admin_app/12_places_management.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact. Current list/create/edit/confirm/delete APIs are implemented.

### Requirement: Map visibility
`confirmed` places SHALL be visible on the player map. `unreviewed` player-submitted places SHALL be hidden until confirmed or deleted. Confirm action SHALL be disabled for already-confirmed rows. Delete SHALL be a hard delete. Audit actions SHALL include `place_created`, `place_updated`, `place_confirmed`, and `place_deleted` with `entityType` `place`.

#### Scenario: Unreviewed hidden from map
- GIVEN a place with status `unreviewed`
- WHEN the player dashboard map loads
- THEN that place is not shown

## Source

- `apps/admin/src/app/(protected)/places/page.tsx`
- `apps/admin/src/app/api/places/route.ts`
- `apps/admin/src/app/api/places/[id]/route.ts`
- `apps/admin/src/hooks/usePlaces/**`
- `packages/db/prisma/models_places.prisma`
