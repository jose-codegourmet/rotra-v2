# Data conventions and integrity

**Last verified:** 2026-10-28 for money scope.

**Status:** Proposed implementation design; business outcomes remain governed by the v1 docs.

## Types and identifiers

- Internal IDs: UUIDs. Devices generate collision-resistant IDs for offline-created records and operations; validate and scope them server-side. Choose a supported UUID version during implementation.
- RTR ID: separate immutable business identifier, never a primary key or foreign key.
- Times: `timestamptz` for instants, with distinct `occurred_at` and server `received_at` on offline operations. Device timestamps are not authoritative ordering or proof of license validity.
- Sync sequence/revisions: positive `bigint`; transmit losslessly, for example as decimal strings. Do not assume JavaScript numbers represent arbitrary bigint values exactly.
- Counts/scores: nonnegative integer. Optional scores are null, not zero-by-default.
- Money: integer minor units (centavos for PHP) with an ISO 4217 `currency` column, never floating point. Unset optional amounts are null, not 0. Derived estimates (totals, break-even) are computed, not stored. V1 includes manual session payment marks and license-term evidence of payments made outside ROTRA; ROTRA never collects money. See the [calculation units](queue/modules/financials-inventory.md#calculation); no-fee marks and lifecycle rules remain gated by [#245](https://github.com/jose-codegourmet/rotra-v2/issues/245).
- Weights: integer basis points (7000/3000 initially), constrained to total 10000. Calculated rating precision and scale are undecided.
- Phone/email: normalized text in private records. Proposed phone normalization is E.164; the acceptance/country rules still need specification. Do not apply provider-specific email transformations such as stripping dots.
- JSONB: versioned sync payloads, permitted profile details, calculation evidence, and display snapshots. Identity, membership, outcomes, and FK relationships remain relational.

## Tenant keys

All club operational records carry `club_id`. Children also carry their parent scope, for example `session_id`. Define corresponding parent unique keys and **composite FKs** so a valid UUID from another club/session cannot be attached accidentally.

Example: a participation references `(club_id, session_id, session_player_id)` and `(club_id, session_id, match_id)`, not two unrelated single-column FKs. A roster entry references a club player from the same club. The global `player_id` link is cross-club by design, never a grant to read private contacts.

## Common metadata

Mutable operational records have `created_at`, `updated_at`, and `revision`. Commands specify their expected base revision; a mismatch becomes a rejected operation or explicit conflict, not last-write-wins.

Recorded operator actions identify the club account and device. V1 cannot truthfully attribute an action to a particular human using shared club credentials. Admin actions identify the platform admin account separately.

## Constraints versus commands

Use primary/unique/FK constraints for identity and relationships. Use row-local checks for values such as nonnegative scores and complementary weights. Cross-row rules, immutable transitions, team sizes, and license checks require transactional command validation and appropriately restricted database writes; some may also need constraint triggers.

A CHECK constraint is not a substitute for verifying other rows, and nullable comparisons need explicit treatment. PostgreSQL documents those limits in [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

Index lookup/FK columns used by the documented access paths. Existing PK/unique prefixes may already cover a query; do not add redundant indexes or one index per column.

## Partial indexes

Useful proposed uniqueness predicates include linked club players and active-session states. Example design, not migration SQL:

`UNIQUE (club_id, player_id) WHERE player_id IS NOT NULL`

Do not put a moving condition such as `played_at > now() - interval '3 months'` into an index predicate. Index stable columns and apply the rolling cutoff at query/recalculation time. See [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html).

## Retention and sources

Prefer restrictive deletion for clubs, canonical players, finalized sessions, and match facts. Public pages/assets can be deleted independently. Account deletion/anonymization policy is not defined by this design; it must not accidentally erase earned history via cascading auth FKs.

Checked references: PostgreSQL constraints/partial indexes and [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Live database version/settings were not inspected. New implementation must verify supported provider features rather than assume the repository's schema reflects deployment.
