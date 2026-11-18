# Device list contract (go-sign-in 4.2)

**Contract only. The Go endpoints below are NOT built yet, and the screens that call them follow the
mockup process first (BL-7, [mockup changes](../mockup-changes/README.md)).** Nothing in the apps calls
them today. Tables: [sign-in](../database_design/product/sign-in.md) (`auth_sessions` is the device
list). Pass and cookie rules: B-27 and B-62.

All three are served by Go behind the proxy secret, need the signed-in access pass (an expired pass is
401 `expired`, so `realRequest` refreshes and retries), and answer in the usual error envelope
`{ error: { code, message } }`. Errors never reveal whether a device of another club exists (404).

## `GET /api/auth/devices`

The sessions (one row per sign-in on one device) that may be signed out.

- **Who:** the club owner, for their own club; Admin, for any club with `?clubId=<uuid>` (required
  for Admin, ignored for a club caller). A Player account gets 403.
- **Response 200:**
  `{ devices: [{ id, deviceId, label, audience, createdAt, lastUsedAt, current, revokedAt }] }`,
  newest first. `id` is the session id, `deviceId` the Queue device id or null, `label` e.g.
  "Chrome on Android", `current` true for the session making the call, `revokedAt` null while active
  (revoked rows stay listed for the audit trail, never with a refresh digest or token).

## `POST /api/auth/devices/{id}/sign-out`

Signs out one session: sets `revoked_at` with reason `device_revoked`; its next refresh is refused and
writes check the session row (B-27).

- **Who:** the club owner for a session of their own club; Admin for any. Not another club's session
  (404).
- **Body:** `{}`. **Response 200:** `{ signedOut: true }`. Idempotent: an already revoked session is
  still 200. Signing out the current session also clears its cookies.

## `POST /api/auth/sign-out-all`

Signs out every active session of the caller's account (or, for Admin, of the club named in the body).

- **Who:** the club owner for their own club (all its devices, including this one); Admin with
  `{ clubId }` for any club.
- **Body:** `{}` for a club owner; `{ clubId }` for Admin. **Response 200:** `{ signedOut: <count> }`.

Open: whether the owner's own current session is kept by default, and the dialog copy (decided in the
mockup step, with the device screens).
