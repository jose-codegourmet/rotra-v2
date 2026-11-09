# Identity, contacts, accounts, and permanent RTR IDs

**Last verified:** 2026-11-07 for player login mapping and claim-link rules (#244); 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Proposed logical schema. Player account mapping and claim-link rules are decided (2026-11-07, #244); email verification, password policy and contact-change enforcement remain unresolved.

## `players`

| Field | Type / rule |
|---|---|
| `id` | UUID PK, independent of authentication subject |
| `full_name`, `nickname`, `avatar_ref` | Public/permitted display data; nickname/avatar optional |
| `avatar_previous_ref` | Nullable; the previous uploaded photo, next to the current `avatar_ref`. Never a character or initials; only current and previous files are kept ([D-2026-11-09-10](../../mvp/decisions.md#d-2026-11-09-10)) |
| `profile_state` | Unclaimed/claimed; no login is required for unclaimed identity |
| `hide_phone_from_clubs` | Privacy preference |
| `profile_private` | Boolean, default false. True hides the profile from visitors who are not signed in ([D-2026-11-09-07](../../mvp/decisions.md#d-2026-11-09-07)) |
| `experience_months`, `experience_recorded_at` | Optional nonnegative self-reported experience snapshot; not rating credit. Playing since = `experience_recorded_at` minus `experience_months` (month precision); screens show years and months counted from it (November 8, 2026). Set by the player, or by the club for an unclaimed profile |
| `personal_details`, `details_version` | Optional validated JSONB for agreed playing-style fields; final schema pending |
| `created_at`, `updated_at`, `revision` | Common metadata |

Do not store a password, Facebook OAuth identity, MMR, or EXP by default. Social Facebook links are optional profile data. Player UUID remains stable if phone/email changes.

## Profile picture storage (#542)

Provision a public Supabase Storage bucket named `player-avatars` with the explicit allowlist
`image/webp`, `image/gif`, `image/png`, `image/heic`, `image/heif`, `image/jpeg` and a
**2,097,152-byte stored-object limit**. Do not grant browser insert, update or delete policies.
The authenticated Player server verifies the owning player and revision, detects content from bytes,
and writes `<player UUID>/<random UUID>.<png|jpg|gif|webp>` using `SUPABASE_SECRET_KEY`.
Character choices store `character:<id>` and initials store null in `avatar_ref`; no schema migration.
Existing PNG URLs continue working. Club logo processing is unchanged.

**Updated by #567, owner-approved 2026-11-08:** selecting any picture creates a local draft only.
Photo files, draggable crop and zoom stay in memory; object URLs
are revoked on replacement or dismissal. X, Escape and outside dismissal discard all choices.
Only **Done** calls `/api/me/profile`; it commits once, disables dismissal while pending and closes
with success only after persistence. A known failure keeps the draft and previous saved reference.
Ambiguous network/DB failures retain the existing conservative “check whether it saved” handling.

Input photos are limited to **4 MiB** (multipart body: 4 MiB + 16 KiB overhead), **24 million total
decoded pixels across all frames**, and **120 frames**. The finished square is at most 512 px;
output is also bounded to 24 million pixels and **2 MiB**. Limits are distinct: an input below
4 MiB can still be refused if its finalized animation exceeds 2 MiB. Each Sharp operation times out
after 7 seconds; the frame loop has a 12-second budget. Malformed images, MIME mismatches, invalid
crop coordinates and excessive resources are refused without replacing the current reference.

JPEG, PNG, GIF and WebP keep their format. Next's existing bundled Sharp coalesces animated GIF/WebP
frames to RGBA; every frame receives the same crop/rotation/resize before reassembly with original
frame delays and loop count. No canvas flattening of GIFs. The editor uses an oriented browser image
with proportional dragging and one Zoom slider; server Sharp auto-orients before crop, including EXIF mirror/rotation.
Animated PNG is refused with an actionable GIF/WebP alternative. Reduced-motion displays a static
canvas snapshot in shared avatars and the editor without changing the persisted animated object.
Review Next's private Sharp integration on Next upgrades.

**Dependency decision (owner approved in #567's implementation chat, 2026-11-08):** add pinned
`libheif-js@1.23.5` in `@rotra/data`. Lazy-loaded bundled WASM decodes HEIC/HEIF locally in a worker
(12-second deadline; terminated on cancellation) and applies container orientation. A local WebP
preview/upload draft works even in browsers without native HEIC decoding; it is not uploaded until
Done. Original HEIC/HEIF sent directly to the authenticated handler is decoded by the same library
and encoded to WebP. HEIF primary-image decoding is capped at 24 million pixels and 8 image handles;
server raw decoding uses libheif's built-in safety bounds, not a terminable worker. The bucket admits
HEIC/HEIF but the application stores browser-compatible WebP; it does not store an unusable original.

The owner’s later #567 follow-up replaces the original position/rotation controls with simple drag
and zoom. The wire decoder retains validated quarter-turn support, but the UI sends zero rotation.

Mock mode stores only an in-memory SVG presentation containing the source image and transform;
it preserves the animation without pretending to create a Storage object or perform server validation.
Mock mode resets on reload. It shares the same draft/Done contract and HEIC preparation as real mode.

Each photo uses an immutable path. Old photos are retained, and a known rejected database write
removes only its new upload; ambiguous failures retain it. Bucket configuration is deployment setup,
not application DDL. The existing club-logo pattern is documented in
[clubs and licenses](../../admin/modules/clubs-licenses.md#club-logo-persistence-374).

## Private contacts and account mapping

`player_private_contacts`: PK/FK `player_id`; required normalized phone for globally created identities; nullable normalized email until claiming; contact verification metadata and revision. Unique phone across all global players. Proposed unique non-null normalized email avoids ambiguous email login; exact canonicalization and shared-address policy need account-flow review. A claimed profile always has an email (decided 2026-11-07, #244).

`player_accounts`: PK/FK `player_id`; unique authentication provider/subject; claim time; current contact-sync version/status. The identity provider owns password hashes, sessions, and reset tokens, not application profile tables. A claimed profile must have both required contacts; enforce this transition transactionally.

**Account mapping, decided 2026-11-07 (#244):** the provider account is an **email + password** account; the provider holds the email (no phone provider, no SMS). Players sign in with **email + password only**; *changed 2026-11-08:* the phone-lookup sign-in is withdrawn, so no phone → email lookup exists. The signed-in provider subject must map through `player_accounts` to a player that is not disabled. Every failure (unknown email, unclaimed profile, wrong password) returns the same generic credential error. The player row links to the auth subject through `player_accounts`; the auth subject is never the player ID. Recovery is email-only.

Claiming is not permission to edit contact identity directly. Initial email completion and approval of later contact changes are distinct commands. No SMS requirement or Facebook login is introduced.

`player_social_links`: player FK, provider (Facebook/Instagram/YouTube/LinkedIn), URL, timestamps; unique `(player_id, provider)`. Do not treat these URLs as proof of identity or auth subjects. Public visibility remains subject to the profile-field decision.

## Registration links

`player_claim_links`: UUID PK; player FK; issuing club/account; unique opaque token digest; issued/expiry/consumed/revoked times; claim-state/version metadata. Store a digest rather than a reusable plaintext secret.

**Decided 2026-11-07 (#244):** expiry is the issued time plus **7 days**. A link is **single use**: consumed time is set once, and a consumed link never claims again. The club (Queue Master) can **reissue**; reissuing sets the revoked time on the player's current active link in the same write, so at most one active link exists per player. Expired, consumed and revoked links resolve to the existing expired/used states. If the phone or email being bound already belongs to another account (unique contact or account constraint), the claim is **blocked**, nothing is consumed or merged, and the screen shows the contact-support route.

Consume atomically once, after binding the correct identity, recording required email/phone, and completing account provisioning. Authentication-provider calls and database writes are not one transaction: use recoverable staged provisioning with idempotency, and mark claimed only after both sides are consistent. Never bind merely by matching the name in the link form.

Public RTR IDs/QRs identify a profile but do not authorize claiming or account editing; an RTR ID or name alone never claims (decided 2026-11-07, #244). A QR must not contain a reusable claim secret or hidden phone.

Forgot-password handling creates an Admin review request (#491). Admin generates a Supabase recovery link after ownership verification. The private request table holds only its SHA-256 digest and review metadata; no plaintext password or usable reset token is stored.

## Worked examples (#244)

Fictional data only. Decided 2026-11-07 unless marked open.

| Case | Given | Outcome |
|---|---|---|
| Existing phone sign-in | Claimed player, phone `+63 917 555 0101`, email `mara@example.test` | Player types `0917 555 0101` + password. Server normalizes the phone, finds the player's account email and signs in with email + password. Typing the email instead reaches the same account |
| Hidden-phone sign-in | Same player with `hide_phone_from_clubs` on | Sign-in by phone works exactly as above; clubs still cannot see or search the phone |
| Unknown or wrong credentials | Phone with no account, unclaimed profile's phone, or wrong password | The same generic credential error each time; nothing reveals whether the phone or email exists |
| Wrong-identity claim (collision) | Link for player A; the email entered already belongs to player B's account | Claim blocked; link not consumed; no merge; contact-support route shown |
| Expired link, then reissue | Link issued Nov 1, opened Nov 9 | Expired state shown. The Queue Master reissues: the old link is revoked, the new one is valid 7 days and single use; after a successful claim it shows the used state |
| RTR ID or name only | Someone has the public RTR ID or the name | Cannot claim; only a valid link plus completed provisioning claims |
| Guest invite (name-only guest) | Guest with no phone and no global profile | Registration leaves the club guest record unlinked; a separate invitation is required to link it (owner, November 8, 2026, #490). Matching phone/email prompts whether the existing account is theirs. Yes requires sign-in/Admin-reviewed recovery; No requires contact correction or contacting ROTRA. Existing contact uniqueness stays in place; answering Yes never authorizes a link |
| Simultaneous allocation | Two clubs sync the same new phone at once | **Open** beyond the existing unique-phone retry rule |
| Failed provider application | Provider account step fails or the response is lost mid-claim | **Open**; the staged, idempotent recovery above is still the rule |

## Club membership, email confirmation and registration location ([D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06))

Club membership is a row in `club_players` (the club's saved players). Add `joined_via` with `club_link | session_link | added_by_club`, shown as “Joined via club link”, “Joined via session link” or “Added by the club”. **Leave club** deletes that row; game history stays. A player can have several rows. `player_private_contacts` (or the account mapping) gains nullable `email_confirmed_at`; while null, contact-change requests are refused. Admin-link registrations store the chosen city or province (from `location_codes`) as the RTR ID location; club and session links use the club's founding location. Report a problem has no table.

## Guest registration implementation (#490)

`/register/[clubId]` creates an independent player with unique contacts and the existing RTR ID
allocation for the inviting club's founding city. It never inserts or updates `club_players`,
roster identity, game facts or history attribution. Separate guest-link invitation acceptance is
not part of registration.

The existing `player_claim_links` table stages a newly submitted registration so provider failures
and lost responses can retry. The browser retains a random retry secret and a contact fingerprint
for this tab (no password or plain contacts); the database stores only the secret's SHA-256 digest.
A retry must use the same club and contacts. Registration uses the existing seven-day expiry,
provider operation keyed by player ID, single consumption, and email/password sign-in. No schema
migration is required. Matching contacts or an existing provider email produce a generic account
confirmation prompt before a new profile is staged. Phone/email uniqueness remains the race backstop.

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
