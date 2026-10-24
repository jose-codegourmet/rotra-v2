# Places Management

Custom venue locations power the player dashboard map when Mapbox POI data is incomplete. Admins manage the catalog at `/places`.

---

## Access

| Role | Access |
|------|--------|
| `admin` | Full CRUD + review |
| `super_admin` | Full CRUD + review |

All routes require an authenticated admin session (`requireAdminSession()`).

---

## Place statuses

| Status | Meaning |
|--------|---------|
| `confirmed` | Visible on the player map; may be admin-created or player-submitted and approved |
| `unreviewed` | Player-submitted; hidden from the map until an admin confirms or deletes |

Admin-created places are inserted as `confirmed` immediately with `submittedById = null`.

---

## Create flow

1. Admin opens **Add Place** on `/places`.
2. `CreatePlaceDialog` collects name, map pin (address + coordinates), and optional description / phone / website.
3. `POST /api/places` creates the row with `status = confirmed`, `reviewedById` and `reviewedAt` set to the acting admin.
4. `admin_action_log` records `place_created`.
5. Client shows toast **"Place created successfully"** and invalidates the places query.

---

## Edit flow

1. Admin clicks the pencil action on any row.
2. `EditPlaceDialog` pre-populates from `PlaceRow`.
3. `PATCH /api/places/[id]` updates fields.
4. `admin_action_log` records `place_updated` with before/after snapshots.
5. Client shows toast **"Place updated successfully"**.

---

## Review flow (unreviewed submissions)

1. Admin clicks the check action on an unreviewed row (disabled for confirmed rows).
2. `ReviewPlaceDialog` shows submission details: name, address, coordinates, description, submitter, and date.
3. **Confirm** → `PATCH /api/places/[id]` with `{ status: "confirmed" }`, sets `reviewedById` / `reviewedAt`, logs `place_confirmed`, toast **"Place confirmed"**.
4. **Delete** → `DELETE /api/places/[id]`, logs `place_deleted`, toast **"Place deleted"**.

---

## Delete flow (confirmed or from table trash icon)

1. Admin clicks the trash action on any row.
2. A confirmation dialog asks to permanently delete the place.
3. `DELETE /api/places/[id]` hard-deletes the row.
4. `admin_action_log` records `place_deleted` with `before_value: { name, status }`.
5. Client shows toast **"Place deleted"**.

---

## Audit log entries

| `AdminAction` | Trigger | `before_value` | `after_value` |
|---------------|---------|----------------|---------------|
| `place_created` | Admin create | `null` | `{ name, address, latitude, longitude }` |
| `place_updated` | Admin edit | prior field snapshot | updated field snapshot |
| `place_confirmed` | Review confirm | `{ status: "unreviewed" }` | `{ status: "confirmed" }` |
| `place_deleted` | Any delete | `{ name, status }` | `null` |

`entityType` is always `place`; `entityId` is the place UUID.

---

## Toast requirements

All four mutation hooks (`useCreatePlace`, `useEditPlace`, `useConfirmPlace`, `useDeletePlace`) show success and error toasts via Sonner. Form dialogs also expose `onSuccess` / `onError` callbacks for parent wiring.

---

## API summary

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/places` | List places (optional `?status=`) |
| `POST` | `/api/places` | Create confirmed place |
| `PATCH` | `/api/places/[id]` | Edit fields or confirm (`status: "confirmed"`) |
| `DELETE` | `/api/places/[id]` | Hard delete |

View spec: [`../../views/admin_app/places.md`](../../views/admin_app/places.md).
