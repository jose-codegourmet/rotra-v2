# Sign-in owned by the Go API

**Last verified:** 2026-11-13 · **Decision:** [D-2026-11-13-01](../../mvp/decisions.md#d-2026-11-13-01) (B-04, B-11)

**Status:** Proposed design, not migration SQL and not built. Credentials stay in Supabase Auth until
the Go API's sign-in area moves ([backend proposal](../../backend/decisions/2026-11-13-go-railway-backend/01-proposal.md)).
Business rules win: [architecture §8](../../architecture.md#8-auth-real-for-queue-admin-and-player),
[identity](player-information/modules/identity.md), [D-2026-11-07-01](../../mvp/decisions.md#d-2026-11-07-01).
Follows [conventions](conventions.md) and the PostgreSQL table-design rules (UUIDs, `timestamptz`,
`text` + `CHECK`, indexed FKs).

## What changes and what doesn't

The account tables already map each account to a provider through `(auth_provider, auth_subject)`:
`club_accounts`, `player_accounts`, `admin_accounts` ([physical schema](physical-schema.md)). That
stays. The Go API becomes one more provider, `auth_provider = 'rotra'`, and `auth_subject` points at
`auth_identities.id`. The auth subject is still never a `players` id.

| Today (Supabase Auth) | Go-owned |
|---|---|
| Password hash, sessions and reset tokens live in Supabase | `auth_identities`, `auth_sessions`; the Admin-reviewed reset keeps `player_password_reset_requests` |
| Club username maps to a provider login email | The username **is** the login key; no provider email |
| No device list | `auth_sessions` is the signed-in device list |
| Device registered when the server first sees a stream ([offline-sync](queue/modules/offline-sync.md)) | Also enrolled at Queue sign-in: `auth_sessions.device_id` → `devices` |
| Rate limits are Supabase's | `auth_rate_limits` (per account, IP and device) |

Unchanged: [claim links](player-information/modules/identity.md#registration-links) (24 h, single use,
digest only), Admin-reviewed player recovery, club password reset by the platform owner, host-only
cookies per app, generic credential errors, no social login.

## Tables

### `auth_identities`

One row per account that can sign in.

```sql
CREATE TABLE auth_identities (
  id                  uuid PRIMARY KEY,                -- app-generated UUIDv7 (Postgres 17 has no uuidv7())
  audience            text NOT NULL CHECK (audience IN ('club', 'player', 'admin')),
  login_key           text NOT NULL CHECK (login_key = lower(btrim(login_key)) AND login_key <> ''),
  password_hash       text NOT NULL,                   -- PHC string, e.g. $argon2id$v=19$...
  password_scheme     text NOT NULL CHECK (password_scheme IN ('argon2id', 'bcrypt')),
  password_changed_at timestamptz NOT NULL,
  disabled_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  revision            bigint NOT NULL DEFAULT 1,
  UNIQUE (audience, login_key)
);
```

- `login_key`: the club `username` for `club`, and the normalized email for `player` and `admin`.
  Normalization follows the existing rules (trim + lowercase; no provider-specific email rewriting,
  per [conventions](conventions.md)).
- A player's email lives in `player_private_contacts`. The login key copies it the same way the
  provider login copies it today, tracked by `player_accounts.contact_sync_version` /
  `contact_sync_status`. An approved contact change updates both in one transaction.
- `bcrypt` exists only for accounts imported from Supabase. A successful sign-in rehashes to
  `argon2id`. No plaintext, reversible or reusable secret is stored.
- Password policy is the decided one for players (at least 8 characters, nothing else); club and
  admin policy stays open in the [database open decisions](open-decisions.md).
- Disabling stays on the account tables (`club_accounts.disabled_at`, `player_accounts.disabled_at`,
  `admin_accounts.active`). `auth_identities.disabled_at` is only for a sign-in-level lock (e.g. a
  forced reset). Sign-in checks both, in that order.
- The unique constraint covers the login lookup; no extra index.

Link to the accounts: when an account moves to Go, its `auth_provider` becomes `rotra` and
`auth_subject` becomes `auth_identities.id`. During the move both providers coexist, so there is no
FK from `auth_subject` yet. Once every account is `rotra`, add one (`RESTRICT`).

### `auth_sessions` — the signed-in device list

One row per sign-in on one device. It is what the owner (or Admin) sees and signs out.

```sql
CREATE TABLE auth_sessions (
  id                      uuid PRIMARY KEY,            -- the session id carried in the access token
  identity_id             uuid NOT NULL REFERENCES auth_identities (id) ON DELETE RESTRICT,
  audience                text NOT NULL CHECK (audience IN ('club', 'player', 'admin')),
  club_id                 uuid,                         -- set for club sessions, for device scope
  device_id               uuid,                         -- Queue device enrolled at sign-in
  device_label            text NOT NULL CHECK (device_label <> ''),  -- e.g. "Chrome on Android"
  refresh_digest          bytea NOT NULL UNIQUE CHECK (octet_length(refresh_digest) = 32),
  previous_refresh_digest bytea UNIQUE CHECK (octet_length(previous_refresh_digest) = 32),
  created_ip              inet,
  last_ip                 inet,
  last_seen_at            timestamptz NOT NULL,
  expires_at              timestamptz NOT NULL,
  revoked_at              timestamptz,
  revoke_reason           text CHECK (revoke_reason IN ('sign_out', 'signed_out_by_owner',
                            'signed_out_by_admin', 'password_changed', 'account_disabled',
                            'device_revoked', 'refresh_reused', 'expired')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL)),
  CHECK ((audience = 'club') = (club_id IS NOT NULL)),
  CHECK (device_id IS NULL OR audience = 'club'),
  FOREIGN KEY (club_id, device_id) REFERENCES devices (club_id, id) ON DELETE RESTRICT
) WITH (fillfactor = 90);

CREATE INDEX auth_sessions_identity_active ON auth_sessions (identity_id, last_seen_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX auth_sessions_device ON auth_sessions (club_id, device_id)
  WHERE device_id IS NOT NULL;
```

- **Refresh rotation.** Only SHA-256 digests are stored. Each refresh moves `refresh_digest` to
  `previous_refresh_digest` and stores the new one. A request carrying a digest that matches
  `previous_refresh_digest` is reuse: revoke the session with `refresh_reused`.
- **Signing out a device** sets `revoked_at` + reason. Rows stay for the list and the audit trail;
  removal follows the retention rules, which are still open (#248).
- **Changing a password** revokes every other session of that identity (`password_changed`).
- **Hot row.** `last_seen_at`, `last_ip` and the digests change on refresh. `fillfactor = 90` leaves
  room for HOT updates; none of those columns is in a non-unique index. Writing `last_seen_at` at
  most once a minute keeps churn low.
- **Composite FK** `(club_id, device_id)` uses the existing unique `(club_id, id)` on `devices`, so a
  device from another club can't be attached ([tenant keys](conventions.md#tenant-keys)).

### Offline device enrollment — reuses `devices`

There is no new table. At Queue sign-in, the app sends its local device id (generated on the device
as offline-sync describes) and a label. In one transaction, the Go API:

1. inserts the `devices` row if new (`registered_at = now()`), or refuses if that id belongs to
   another club or is revoked;
2. creates the `auth_sessions` row with that `device_id`.

Revoking a device (`devices.revoked_at`) revokes its sessions (`device_revoked`) in the same
transaction. Stream registration, contiguous sequences and seals stay as designed in
[offline-sync](queue/modules/offline-sync.md). Only `registerDevice` moves earlier, to sign-in.

### `auth_rate_limits` — per account, IP and device

```sql
CREATE UNLOGGED TABLE auth_rate_limits (
  scope        text NOT NULL CHECK (scope IN ('ip', 'login', 'device')),
  subject      text NOT NULL,         -- inet text, '<audience>:<login_key digest>', or device uuid
  action       text NOT NULL CHECK (action IN ('sign_in', 'reset_request', 'claim', 'refresh')),
  window_start timestamptz NOT NULL,
  attempts     integer NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (scope, subject, action, window_start)
);
```

- `UNLOGGED`: counters are cheap to lose in a crash (worst case: a fresh window). There's no WAL
  cost and no Redis service, which matters for cost (B-09).
- One upsert per attempt: `INSERT … ON CONFLICT (scope, subject, action, window_start) DO UPDATE
  SET attempts = auth_rate_limits.attempts + 1 RETURNING attempts`.
- The login subject stores a digest of the login key, not the email or username.
- The device id comes from the client and can't be trusted alone. It is one extra dimension next to
  IP and login, never the only one.
- Old windows are deleted by the sign-in request itself (delete expired windows for the same subject
  in the same statement batch). This follows the "no scheduled jobs" decision (B-07).
- Limits and window sizes are configuration, not schema. Their values are open.

### `auth_events` — sign-in audit trail

```sql
CREATE TABLE auth_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identity_id uuid REFERENCES auth_identities (id) ON DELETE RESTRICT,  -- null when no account matched
  session_id  uuid REFERENCES auth_sessions (id) ON DELETE RESTRICT,
  audience    text NOT NULL CHECK (audience IN ('club', 'player', 'admin')),
  event       text NOT NULL CHECK (event IN ('sign_in', 'sign_in_failed', 'rate_limited',
                'refresh', 'refresh_reused', 'sign_out', 'session_revoked',
                'password_changed', 'password_reset_issued', 'password_reset_used',
                'device_enrolled', 'device_revoked')),
  ip          inet,
  device_id   uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_events_identity ON auth_events (identity_id, occurred_at DESC)
  WHERE identity_id IS NOT NULL;
CREATE INDEX auth_events_session ON auth_events (session_id) WHERE session_id IS NOT NULL;
```

- Append-only (same trigger pattern as other append-only tables in [physical schema](physical-schema.md)).
- It stores no email, username or password; a failed attempt with an unknown login records no
  identity.
- Admin actions that change an account (disable, reset, sign out a device) still go to
  `admin_audit_events` as today. `auth_events` records the sign-in side.
- Retention: open with the other retention rules (#248).

### Recovery — reuses `player_password_reset_requests`

Admin-reviewed player recovery stays as decided (D-2026-11-07-01, D-2026-11-09-14). The only
change: the Go API issues the secure, expiring, single-use link instead of Supabase.

- `token_digest` becomes the SHA-256 of the Go-issued token (today it's of the provider token).
- `auth_subject` becomes the `auth_identities.id`.
- Using the link sets `consumed_at`, writes the new hash and revokes all sessions
  (`password_changed`).

The column meanings change, but the table doesn't.

## Moving accounts from Supabase

For every `club_accounts`, `player_accounts` and `admin_accounts` row with `auth_provider = 'supabase'`:

1. create `auth_identities` with a **new** id; the login key comes from `username` or the email;
   the hash comes from Supabase's bcrypt hash with `password_scheme = 'bcrypt'`;
2. in the same transaction, set the account's `auth_provider = 'rotra'` and `auth_subject` to the
   new id;
3. record nothing in `auth_sessions`: everyone signs in once after the move.

The import is idempotent (keyed by the old Supabase subject), rehearsed on a copy first, and applied
with owner sign-off like every shared-database migration.

## Transactions

| Command | One transaction |
|---|---|
| Sign in | rate-limit upsert · identity + account checks · rehash if `bcrypt` · `devices` upsert (club) · `auth_sessions` insert · `auth_events` insert |
| Refresh | session lock (`FOR UPDATE`) · reuse check · digest rotation · `last_seen_at` · event |
| Sign out a device | session update · event (+ `admin_audit_events` when Admin does it) |
| Claim (player) | existing claim transaction + `auth_identities` insert + `player_accounts` with `auth_provider = 'rotra'`: one transaction now, since provider and database are the same system |
| Password reset used | consume reset row · new hash · revoke all sessions · event |
| Device revoked | `devices.revoked_at` · revoke its sessions · event |

The claim row simplifies the staged provisioning in [identity](player-information/modules/identity.md#registration-links):
there's no longer a separate provider call to keep consistent.

## Open

- Club and admin password policy; email verification stays as decided for claims (none).
- Rate-limit thresholds and window sizes.
- Access-token lifetime and refresh lifetime (`expires_at`).
- Retention of revoked sessions and `auth_events` (#248).
- When the `auth_subject` FKs are added (after every account is `rotra`).
