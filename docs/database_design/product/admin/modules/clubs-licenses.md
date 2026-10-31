# Club accounts, licenses, and expiry cycles

**Last verified:** 2026-10-28 for club-name uniqueness and the free-club decision boundary.

**Status:** Proposed schema. Updated October 27, 2026: owner-added clubs and per-club prices, from the [ROTRA Admin prototype](../../../../../app/mocksups-app/admin-app/rotra-admin.html). Renewal and refund policies are still open.

## Accounts and club identity

`clubs`: UUID PK; name; logo reference; founding-location FK and founding address; created/updated timestamps and revision. Session venues are separate. Founding-location correction policy is unresolved; historical player ID allocations always retain their original codes.

Club names must be unique, as required by A-ADD-CLUB. Both creation and approved name changes must enforce that invariant under concurrency. Case/whitespace/Unicode comparison and the matching database constraint remain to be approved in [#245](https://github.com/jose-codegourmet/rotra-v2/issues/245); username normalization does not implicitly decide club-name comparison.

`club_accounts`: club ID PK/FK; normalized unique username; unique provider/subject mapping; provisioned/disabled timestamps. One dedicated credential per club in v1. Passwords stay with the selected auth provider: a club's own change-password (current password re-verified by the provider) and the platform owner's reset both go through it, and no password or hash is stored in application tables. This table does not imply Supabase natively supports the required username flow without an adapter; verify that separately.

`admin_accounts`: UUID PK; unique provider/subject; active flag; display/audit metadata. It identifies the platform owner for licensing and approval. Do not introduce a new multi-role admin-management product as a side effect.

Clubs are created only by the platform owner (Add club), in one command that inserts `clubs`, the founding location, `club_accounts` and the price, and creates the provider credential with the initial password. The command is idempotent on its `source_command_id`; a provider failure must not leave a club without a working account or a credential without a club. No application or approval table exists.

Do not require an owner `player_id`, synthetic Facebook ID, or club-membership row for club authentication. Future managers can be modeled through later account-to-club associations without rewriting historical club ownership, but are not enabled now.

## Club prices

Each club has its own price; there is no platform price list. Proposed columns on `clubs`:

| Field | Purpose |
|---|---|
| `license_pricing` | `paid` or `free` (free = tester club) |
| `license_monthly_minor`, `license_yearly_minor` | Positive integers in minor units, `PHP`. Kept when the club is made free, so switching back starts from the last paid price |

For paid pricing, validate both amounts > 0 and `license_yearly_minor < 12 * license_monthly_minor`. The agreed Add club flow also allows a new Free club without paid prices: do not invent previous prices or apply unconditional NOT NULL/positive checks to that case. Physical nullability and the transition back to paid pricing remain in #245. Retaining an existing paid price when switching to Free is distinct from requiring one for a newly Free club. Price changes write an `admin_audit_events` row with before/after values; each license term stores the amount actually recorded. Changing a price never updates existing `club_license_terms`.

## `club_license_terms`

| Field | Purpose |
|---|---|
| `id`, `club_id` | UUID PK and club FK |
| `plan` | Monthly/yearly |
| `starts_at`, `ends_at` | Required instants; start < end |
| `activated_by_admin_id`, `activated_at` | Manual activation evidence |
| `source_command_id` | Unique idempotency key for activation/renewal |
| `paid_on` | Date the club paid outside ROTRA, as recorded by the platform owner |
| `amount_minor`, `currency` | Amount recorded at activation, in minor units; evidence of an external payment, not a charge. Prefilled from the club's price for the plan and editable; `0` for a free club, with `paid_on` null |
| `payment_reference` | Short reference shown to the club (e.g. `LIC-0004`) |
| `notes` | Optional operational note |

The club's **License payments** table and CSV export read these rows, newest first. `clubs.default_players_per_court` (integer 2–20, default 8) and `clubs.default_entrance_fee_minor` (nullable integer ≥ 0, with the club's currency) prefills new sessions' misc entrance fee per head when the venue has none. `clubs.description`, `clubs.court_rules` and `clubs.post_template` (text, null = built-in default) feed the copyable Facebook post. The club may edit these, the default fee and `clubs.logo_ref` itself. `clubs.name` changes only through `club_name_change_requests` (UUID PK, club FK, requested name, requested_at, state pending/approved/rejected/cancelled, reviewed_by admin, reviewed_at; partial unique one pending request per club); approval updates `clubs.name` in the same transaction (decided October 26, 2026); founding location stays fixed.

Preserve renewal history instead of overwriting a lone expiry date. Serialise updates per club. Overlapping/stacked renewal handling needs a business policy before choosing exclusion constraints. No automatic charge, session-fee table, gateway token, or platform-wide price/discount is added.

## `club_entitlements`

One row per club: effective license term FK, effective access end, revision, refresh time, nullable current expiry-cycle ID. It is a recomputable access projection from approved terms, not an independent perpetual `is_paid` switch. Revalidate time/term at sensitive actions.

A session records the accepted start authorization/license term. Expiry permits only that already-active session's completion and sync, not ordinary access to other saved players/reports. The [session reservation](../../queue/modules/sessions-roster.md) supplies one-offline-session coordination; licensing alone cannot enforce it.

## `club_expiry_cycles`

Fields: UUID PK; club FK; expired-at; delete-public-pages-after; nullable cancelled-at and cancellation term FK; state; revision. At most one uncancelled/current cycle per club, enforced by a stable-state partial unique index.

Expiry creates a six-month countdown. Renewal cancels the exact cycle and restores retained pages. Later expiry creates a new cycle rather than reusing a stale deletion deadline.

Retention jobs refer to the cycle ID and recheck entitlement under the club lock before deleting. Index `(state, delete_public_pages_after, id)` for scheduled cleanup. Never calculate public-page expiry from the original session creation date.

Deleting a publication is not deleting a club, session, match fact, or player rank. Internal retention remains undecided.

Business source: [license rules](../../../../business_logic/product/admin/modules/clubs-licenses/README.md).
