# Admin — Places (`/places`)

## Overview

The Places module lets platform admins view and manage custom venue locations — both admin-created (confirmed) and player-submitted (unreviewed).

**Access:** `admin` and `super_admin` roles (behind the `(protected)` layout).

**Navigation:** Sidebar → **Places** (`MapPin` icon), positioned after **Customers**.

---

## List page (`/places`)

### Header

- Title: **Places**
- **Add Place** button — opens `CreatePlaceDialog`

### Tabs

Client-side filters over the loaded list:

| Tab | Shows |
|-----|-------|
| All | Every place |
| Confirmed | `status = confirmed` |
| Unreviewed | `status = unreviewed` (badge shows pending count) |

### Table columns

| Column | Notes |
|--------|-------|
| Name | Truncated at 60 characters |
| Address | Truncated at 80 characters |
| Status | Badge — confirmed (accent) / unreviewed (warning) |
| Submitted by | Player display name, or **Admin** when `submittedBy` is null |
| Created at | `dd MMM yyyy` format |
| Actions | Edit (pencil), Confirm (check — unreviewed only), Delete (trash) |

---

## Create dialog (`CreatePlaceDialog`)

Opened from **Add Place**.

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | 2–120 characters |
| Location | Yes | `AddressPinField` — search, map pin, drag marker |
| Description | No | Max 500 characters |
| Phone | No | Max 30 characters |
| Website | No | Valid URL or empty |

Submit creates a `confirmed` place via `POST /api/places`. Success toast: **Place created successfully**.

---

## Edit dialog (`EditPlaceDialog`)

Opened from the pencil action on any row. Same fields as create, pre-populated from the selected `PlaceRow`.

Submit updates via `PATCH /api/places/[id]`. Success toast: **Place updated successfully**.

---

## Review dialog (`ReviewPlaceDialog`)

Opened from the check action on **unreviewed** rows only.

Displays read-only submission details (name, address, coordinates, description, submitter, date).

| Action | API | Toast |
|--------|-----|-------|
| Confirm | `PATCH` with `status: "confirmed"` | Place confirmed |
| Delete | `DELETE` | Place deleted |

---

## Delete confirmation

Opened from the trash action on any row. Confirms permanent deletion before `DELETE /api/places/[id]`.

---

## Data flow

1. **Server prefetch** — `page.tsx` calls Prisma directly (`db.place.findMany`) and hydrates TanStack Query via `HydrationBoundary`.
2. **Client refetch** — `usePlacesQuery` calls `GET /api/places`; mutation hooks invalidate `placesQueryKey()` after create, edit, confirm, or delete.

---

## API

### `GET /api/places`

- Requires admin session
- Optional query: `?status=confirmed` or `?status=unreviewed`
- Returns `{ places: PlaceRow[] }`

### `POST /api/places`

- Body: `{ name, address, latitude, longitude, description?, phone?, website? }`
- Creates `confirmed` place; writes `place_created` audit log
- Returns `{ place: PlaceRow }`

### `PATCH /api/places/[id]`

- Body: place fields and/or `{ status: "confirmed" }` for review
- Writes `place_updated` or `place_confirmed` audit log
- Returns `{ place: PlaceRow }`

### `DELETE /api/places/[id]`

- Hard delete; writes `place_deleted` audit log
- Returns `{ ok: true }`

Business logic: [`../../business_logic/admin_app/12_places_management.md`](../../business_logic/admin_app/12_places_management.md).
