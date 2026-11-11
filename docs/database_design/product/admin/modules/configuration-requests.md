# Configuration, contact requests, and audit

**Status:** Proposed data design for agreed Admin controls.

## `ranking_policy_versions`

Fields: UUID/version PK; effective time; assessment/performance weights in basis points; recent-standard-match threshold; algorithm-version reference; creator admin; creation time; change note.

Checks: weights each between 0 and 10000, sum 10000; match threshold a whole number from 1 to 40 (product owner, October 30, 2026). Initial values 7000, 3000, and 10.

Versions are append-only so results explain which configuration produced them. Whether changes recompute past/current ranks immediately or apply prospectively remains open. Three months and the five-prior-club-session award requirement are not automatically additional editable controls.

## `feature_flags`

Proposed minimal record: stable key PK (`^[a-z][a-z0-9_]{2,39}$`, immutable once created); unique name (up to 50 characters); description; boolean value (default false); revision; created-by/updated-by admin and times. Flags are created by the platform owner in Admin (October 27, 2026); the table starts empty. No "affects" column: the description says what a flag does. Do not add audience targeting, billing tiers, or arbitrary JSON execution rules without a feature-flag specification.

Downloaded sessions need the relevant approved settings version. How flag changes affect an already-offline session is unresolved; a DB update cannot guarantee immediate remote application.

## `admin_settings` (#540)

One Admin settings row (fixed key `id = 1`, CHECK; seeded by the migration): cost per session in
centavos ≥ 0 (default 1500, the ₱15 placeholder until the owner sets the real figure), currency
`PHP`, nullable updated-by admin FK, updated time and revision. Admin Sales reads it
([D-2026-11-08-01](../../../../mvp/decisions.md#d-2026-11-08-01)); the club Sales tab applies the
current value to every month shown. RLS on; no public-client privileges.

Sales reports are read-only views/functions over existing rows (`rotra_sales_*`, migration
`20261108000300_admin_sales_reports`), computed on read in Manila days; no totals table.

## `profile_characters` ([D-2026-11-09-13](../../../../mvp/decisions.md#d-2026-11-09-13))

The character library players pick from, managed only by the platform owner in Admin › Settings ›
Profile characters (mockup log 2026-11-09-admin-profile-characters).

**Built (tickets 408/409, branch `fix/real-mode-characters-clubs-sessions`; migration
`20261111000100_profile_characters`, not applied yet).** Fields: `id` text PK (a seeded id `''`/a–w
or a lowercase UUID the Admin client picks, CHECK); `image` text (a data: URL for seeded rows or the
public Storage URL, CHECK `data:image/%` or `https://%`); `shown` boolean (default true);
`uploaded_at` timestamptz (upload order, strictly increasing); `number` int, unique, > 0 (“Character
N”); `deleted_at` timestamptz, nullable (soft delete, so Undo works and `character:<id>` pictures
keep resolving). Index `(uploaded_at, number)`. No name, no position column (upload order is the
order), no created-by column: every change writes an `admin_audit_events` row
(`profile_character.added|shown|hidden|deleted|restored`, target `profile_character`, metadata
`{ number }`). Seeded with the 24 mock characters, same ids, images and order.

Rules on the server (`packages/db/src/admin/profile-characters.ts`, one advisory lock per write):
at least 8 rows stay shown today, to become **15** per [D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11) (hide/delete refusals use the mock's copy); restore of a row already back
is a conflict. Images are PNG/JPEG/WebP up to 1 MB, cropped square in the browser, bytes checked on
the server, stored in the public bucket `profile-characters` at `<id>.<ext>` (created by hand; see
[identity](../../player-information/modules/identity.md#profile-picture-storage-542)). The keep-two
picture rule (D-2026-11-09-10) does not apply.

RLS on; no anon/authenticated/PUBLIC privileges. The public read of shown rows is served by the
Player and Admin servers (`GET /api/profile-characters/shown`), not by client RLS.

## `profile_banners` ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11))

**Proposed; not built, migration needs sign-off.** The banner library players pick from, managed only by the platform owner in Admin › Settings › Profile banners (mockup log 2026-11-11-admin-profile-banners). Same shape and rules as `profile_characters`: `id` text PK; `image` text (a data: URL for seeded rows or the public Storage URL); `shown` boolean (default true); `uploaded_at` timestamptz (upload order); `name` text (the page shows a name under each banner; the six seeded samples are Court, Night, Dusk, Ember, Sun, Stripe; whether uploads get a generated name is for the migration ticket to confirm); `deleted_at` timestamptz, nullable (soft delete so Undo works and `banner:<id>` references keep resolving). Every change writes an `admin_audit_events` row (`profile_banner.added|shown|hidden|deleted|restored`).

Rules on the server: at least **2** rows stay shown; images are PNG/JPEG/WebP up to **2 MB**, centred-cropped to 3:1 in the browser, bytes checked on the server, stored in a public Storage bucket (D-2026-11-08-03). **Players never upload**: a player's profile stores only a reference to a banner key (`players.banner_id`, nullable), which keeps resolving after the banner is hidden or deleted. The keep-two picture rule does not apply. RLS on; the public read of shown rows is served by the Player and Admin servers, not by client RLS.

## `player_contact_change_requests`

Fields: UUID PK; player FK; requested field phone/email; protected proposed normalized value; original contact revision; requested time; status pending/approved/applying/applied/rejected/failed; reviewer admin/time; provider-operation idempotency reference; resolution note.

The exact request UI/verification requirements are open. Separate **approval** from successful application, because updating the auth provider and PostgreSQL is not one atomic transaction.

Application design:

1. Verify approval and unchanged original contact revision.
2. Check/reserve uniqueness for the proposed identifier, including provider constraints.
3. Apply provider change idempotently; coordinate a recoverable staged update of the private contact row.
4. Mark applied only when provider login and application identity agree. On failure, retain a retryable state, not a success message.
5. Keep the player's UUID/RTR ID and history unchanged.

Admin Edit profile (email only, #564) is another entry point: it inserts a request with `source = owner` and status pending, the typed reason goes to the audit event for that request (no reason column on the request), and no schema change is needed. Players cannot write contact rows directly or bypass this process through generic profile editing. Password-reset flows remain separate from contact changes.

## `admin_audit_events`

UUID PK; actor admin FK; action; target type/ID; source command ID; timestamp; redacted before/after metadata. Append-only application access. Index actor/time and target/time for review.

Do not log passwords, raw claim/reset tokens, or unnecessary contact values. **Admin-set password (MVP or beta only, [D-2026-11-09-14](../../../../mvp/decisions.md#d-2026-11-09-14)):** the edit-player save may set a registered player's password through the auth provider; record only `player.password_set_by_admin` (actor, target, time), never the value, and remove the capability after the beta. This conflicts with [D-2026-11-07-01](../../../../mvp/decisions.md#d-2026-11-07-01) and needs owner sign-off before any build. The same save records one `player.profile_updated` event listing every changed field (picture, profile fields, privacy switches, phone, email) with redacted before/after and the reason. Club actions identify club account/device elsewhere; shared credentials cannot prove the human operator's identity.

Business sources: [configuration](../../../../business_logic/product/admin/modules/configuration/README.md), [player management](../../../../business_logic/product/admin/modules/player-management/README.md).

## F07 follow-up: player management (#335)

The mock UI now supports player archive and eligibility-checked removal. Operational persistence must add archive timestamp and revision, retain audit identity/RTR ID after eligible removal, enforce all history/reference guards transactionally, and allow an Admin claim-link issuer with seven-day expiry and revocation. No schema or migration is introduced by #335. Claims across app origins require a shared server transport, not client storage.

## `player_password_reset_requests` (#491)

Private Admin-review queue: UUID PK; normalized submitted email; nullable matched player FK;
requested time; created/updated/revision; pending/issued/declined state; reviewer Admin FK/time; issued provider subject;
SHA-256 digest of the provider recovery bearer token; consumed time. Unmatched submissions are
retained for review but cannot issue a link. One pending request per normalized email (partial unique
index); re-submission does not replace an issued link. Request state/time and FK indexes support the
Admin list. RLS denies direct public-client access; server handlers authorize every operation.

Issuance checks current email/account/provider identity, records the reviewer and an append-only
audit event, and returns the secret once. No plaintext token, password or delivery record is stored.
Replacement removes the prior digest. Consumption atomically clears the digest before provider
verification; used, expired, unreviewed, replaced or mismatched links fail closed. Failed/uncertain
redemption needs a new reviewed link. Supabase's configured recovery expiry is authoritative.
Provider calls run outside database transactions, under a 60-second issuance lease (not link expiry).
Each provider request times out at 15 seconds; abandoned leases can be replaced, and an old issuance
cannot finalize over a newer one. The lease ID/time is never exposed publicly.

Migration `20261108000100_password_reset_requests` applied to ROTRA v2 ASIA on November 8, 2026 after explicit owner sign-off.
