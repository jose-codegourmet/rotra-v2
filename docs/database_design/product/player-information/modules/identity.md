# Identity, contacts, accounts, and permanent RTR IDs

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Proposed logical schema. Provider configuration and contact verification flows remain unresolved.

## `players`

| Field | Type / rule |
|---|---|
| `id` | UUID PK, independent of authentication subject |
| `full_name`, `nickname`, `avatar_ref` | Public/permitted display data; nickname/avatar optional |
| `profile_state` | Unclaimed/claimed; no login is required for unclaimed identity |
| `hide_phone_from_clubs` | Privacy preference |
| `experience_months`, `experience_recorded_at` | Optional nonnegative self-reported experience snapshot; not rating credit |
| `personal_details`, `details_version` | Optional validated JSONB for agreed playing-style fields; final schema pending |
| `created_at`, `updated_at`, `revision` | Common metadata |

Do not store a password, Facebook OAuth identity, MMR, or EXP by default. Social Facebook links are optional profile data. Player UUID remains stable if phone/email changes.

## Private contacts and account mapping

`player_private_contacts`: PK/FK `player_id`; required normalized phone for globally created identities; nullable normalized email until claiming; contact verification metadata and revision. Unique phone across all global players. Proposed unique non-null normalized email avoids ambiguous email login; exact canonicalization and shared-address policy need account-flow review.

`player_accounts`: PK/FK `player_id`; unique authentication provider/subject; claim time; current contact-sync version/status. The identity provider owns password hashes, sessions, and reset tokens, not application profile tables. A claimed profile must have both required contacts; enforce this transition transactionally.

Claiming is not permission to edit contact identity directly. Initial email completion and approval of later contact changes are distinct commands. No SMS requirement or Facebook login is introduced.

`player_social_links`: player FK, provider (Facebook/Instagram/YouTube/LinkedIn), URL, timestamps; unique `(player_id, provider)`. Do not treat these URLs as proof of identity or auth subjects. Public visibility remains subject to the profile-field decision.

## Registration links

`player_claim_links`: UUID PK; player FK; issuing club/account; unique opaque token digest; issued/expiry/consumed/revoked times; claim-state/version metadata. Store a digest rather than a reusable plaintext secret. Link lifetime and reissue policy are proposals still to settle.

Consume atomically once, after binding the correct identity, recording required email/phone, and completing account provisioning. Authentication-provider calls and database writes are not one transaction: use recoverable staged provisioning with idempotency, and mark claimed only after both sides are consistent. Never bind merely by matching the name in the link form.

Public RTR IDs/QRs identify a profile but do not authorize claiming or account editing. A QR must not contain a reusable claim secret or hidden phone.

Forgot-password handling delegates to the approved email recovery flow. No application plaintext password or raw reset-token ledger is needed.

## RTR ID allocation

`location_codes`: stable ID, country/region code, city code, display name; unique `(country_code, city_code)`. Codes need a governed registry; display-name edits do not change previously assigned identifiers.

`player_id_counters`: PK `(location_code_id, sync_date)` and positive `last_sequence`. Date grouping must use an agreed server timezone. The location identity includes country so identically spelled city codes in different countries do not collide.

`player_id_allocations`: PK/FK `player_id`; unique immutable `rtr_id`; creating club FK; founding-location FK; frozen country/city strings; `sync_date`; sequence; allocation timestamp. Unique `(location_code_id, sync_date, sequence)`.

Allocation transaction:

1. Normalize/resolve the phone and lock its existing identity or safely race on the unique phone constraint.
2. Reuse an existing profile/allocation; never create another ID for the same identity.
3. For a new eligible profile, increment that founding city's counter using a single atomic database operation, then insert the allocation in the same transaction.
4. Format `RTR-PH-CEB-102926-0001` using the **sync day** and club founding city. Internal UUIDs never use this string.
5. On a uniqueness race, retry from identity resolution; do not publish a losing allocation or use `MAX(sequence)+1`.

IDs stay permanent. Later contact/address changes do not rerun allocation. Do not assume gap-free sequences or truncate values over four digits; overflow presentation is open.

**Owner decision, October 28, 2026:** resolve/create the profile and allocate its permanent RTR ID as soon as the entry successfully syncs, without waiting for Session done. Keep unresolved or conflicting input pending; never claim a permanent ID was allocated offline. Identity creation does not grant match-performance credit before valid finalization.

After a historical guest identity is confirmed, attribute earlier valid games to that profile for personal history and ranking under the existing eligibility/window rules. Keep original entry/finalization identity snapshots and permanent outcomes intact; the auditable linkage/projection mechanism, confirmation evidence, and mistaken-link handling must be designed before implementation. Use original played dates and deduplicate contributions.

Indexes: unique phone, non-null email proposal, auth subject, RTR ID, allocation city/date/sequence; name lookup can use a safe public search projection. No public phone index/query API is implied.

Business source: [identity](../../../../business_logic/product/player-information/modules/identity/README.md).
