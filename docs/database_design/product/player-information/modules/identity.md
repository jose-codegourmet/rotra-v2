# Identity, contacts, accounts, and RTR IDs

**Last verified:** 2026-11-18 for unclaimed players with an email and an RTR ID ([D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04); built in P15.8, migration `20261118000500_shared_player_entries`, not yet applied to the shared database); 2026-11-12 for visibility, hide-from-directory, banner and club-only unclaimed profiles (migrations `20261112000100_round2_profiles_banners_invites`, P08.1, and `20261112000200_club_player_claim_links`, P08.9); 2026-11-07 for player login mapping and claim-link rules (#244); 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Proposed logical schema. Player account mapping and claim-link rules are decided (2026-11-07, #244); email verification, password policy and contact-change enforcement remain unresolved.

## `players`

| Field | Type / rule |
|---|---|
| `id` | UUID PK, independent of authentication subject |
| `full_name`, `nickname`, `avatar_ref` | Public/permitted display data; nickname/avatar optional |
| `avatar_previous_ref` | Nullable; stores the previous picture reference for an Admin edit, including a character. The previous initials remain unrepresented (the known Admin mockup gap); superseded uploaded photos are removed after a successful save ([D-2026-11-09-14](../../../../mvp/decisions.md#d-2026-11-09-14)). The Player picker retains its separate current-and-previous-photo rule |
| `profile_state` | Unclaimed/claimed; no login is required for unclaimed identity |
| `hide_phone_from_clubs` | Privacy preference |
| `profile_visibility` | **Built** (`20261112000100_round2_profiles_banners_invites`). Enum `profile_visibility`: `public` · `private` · `always_private`, not null, **default `private`** for new rows (Prisma `Player.profileVisibility`). `private` hides the profile from visitors who are not signed in; `always_private` hides name, level and games from everyone but the player (and the Queue Master of a session they join), while `avatar_ref` and `banner_id` stay public ([D-2026-11-09-07](../../../../mvp/decisions.md#d-2026-11-09-07), [D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)). There was no stored `profile_private` boolean before (the Private switch was mock-only), so the migration backfilled every existing row to `public` and dropped nothing |
| `show_profile_stats`, `show_weekly_performance` | **Built** (`20261114000200_player_stats_visibility`, P11.6 #828; Prisma `Player.showProfileStats`, `Player.showWeeklyPerformance`; owner artifact comment, November 13, 2026; [log](../../../../mockup-changes/2026-11-13-player-stats-visibility.md)). Booleans, not null, **default true**. False hides Latest stats on the profile card, or the Weekly performance chart on the profile and Games page, from everyone but the player. No effect on the leaderboard or rank. Every public and own profile read returns both flags; the Player app hides the item for other viewers, as in mock mode. Saved by `POST /api/me/stats-visibility` under the account revision |
| `hidden_from_directory` | **Built** (`20261112000100_round2_profiles_banners_invites`; Prisma `Player.hiddenFromDirectory`). Boolean, not null, default false. True leaves the player out of Queue's Add player › Player Information search and RTR ID search and out of public club page member lists; Saved players, Admin and the public session page are unaffected ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)) |
| `banner_id` | **Built** (`20261112000100_round2_profiles_banners_invites`; Prisma `Player.bannerId`). Nullable text FK to the Admin-managed banner library `profile_banners(id)` (ON DELETE RESTRICT; rows there are soft-deleted), indexed; null means the default banner. A hidden or deleted banner still resolves for players who already use it. Public like `avatar_ref`. Players cannot upload banners, so **no storage, bucket or file field** belongs to the player for it ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11); see [configuration requests](../../admin/modules/configuration-requests.md#profile_banners-d-2026-11-11-11)) |
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
The `<id>` points at the Admin-managed character library (`profile_characters`, see
[configuration-requests](../../admin/modules/configuration-requests.md#profile_characters-d-2026-11-09-13), D-2026-11-09-13); a hidden
or deleted character still resolves for players who already use it.

**Character library in real mode (tickets 408/409, branch `fix/real-mode-characters-clubs-sessions`,
migration `20261111000100_profile_characters` not applied yet).** The server accepts a character
choice only when the id exists in `profile_characters`, is shown and is not deleted (it no longer
uses a fixed `''`/a–g list). The 24 seeded rows keep the mock ids `''` and a–w and their data: URL
images. Uploaded images live in a separate public Storage bucket `profile-characters` at
`<id>.<png|jpg|webp>`, written only by the Admin server with `SUPABASE_SECRET_KEY`. **Create it by
hand** in the Supabase dashboard, as `player-avatars` was: public, allowlist `image/png`,
`image/jpeg`, `image/webp`, a **1,048,576-byte** object limit, and no browser insert, update or
delete policies. Screens resolve `character:<id>` from the loaded list, else from
`GET /api/profile-characters/<id>/image` in their own app (Queue, Player, Admin), which redirects to
the stored URL or serves a seeded data: image, for hidden and deleted rows too.
Existing PNG URLs continue working. Club logo processing is unchanged.

**Club-set pictures (owner request, November 9, 2026):** a club can set the picture of its own guests and unclaimed profiles; it follows the same current-and-previous rule (`avatar_ref` + `avatar_previous_ref`, [D-2026-11-09-10](../../../../mvp/decisions.md#d-2026-11-09-10)). Where a guest's picture is stored (guests have no `players` row) is not yet designed. Since [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04) each club keeps its own picture for an unclaimed player too, so the picture belongs with the club record.

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

## Unclaimed players with an email and an RTR ID ([D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04)) — built (P15.8)

Decided behaviour (owner, November 16, 2026; storage choices answered November 18, 2026): an unclaimed player is a person a club saved with a **required email**; they get an RTR ID when saved; one email is one person and one RTR ID across clubs; each club keeps its own name, nickname, picture, level and optional phone; a guest is a name only. **Built in P15.8 (#927), migration `20261118000500_shared_player_entries`: written and applied to a local disposable database (rebuild, drift, seed and checks pass); not yet applied to the shared database.** The mock store (`packages/data`, #923) mirrors the same contract.

- **`shared_player_entries`** (Prisma `SharedPlayerEntry`, `player/shared-entry.prisma`): one thin entry per unclaimed person. Columns: `id` UUID PK; `email` (trimmed and lowercased by a CHECK, unique; set while the entry is open, cleared when it is claimed or retired); `rtr_id` (unique, same format CHECK as `player_id_allocations`); `creating_club_id` → `clubs`; `location_code_id` → `location_codes` and `(location_code_id, sync_date)` → `player_id_counters`; frozen `country_code`, `city_code`; `sync_date`; `sequence` (unique per place and day); `allocated_at`; `claimed_player_id` (unique, → `players`) with `claimed_at`; `retired_at`; `created_at`, `updated_at`, `revision`. A state CHECK keeps claimed and retired apart and ties the email to the open state. RLS on, no grants to `anon`/`authenticated`. Nothing a club typed is here, so no club sees another club's details.
- **Club records point to it:** `club_players.shared_entry_id` (unique per club; see [sessions and roster](../../queue/modules/sessions-roster.md)). Each club's row keeps its own `display_name`, `nickname`, level (assessments) and optional private phone; its own playing style, experience and links go in `club_player_private_inputs.preset_fields`. A row with no email and no link is a guest; a row with a private phone and no entry reads as **Details required**.
- **Saving an email** (Saved players › New player, Add player › New player, Edit details on a guest or a Details required record; one transaction, an advisory lock per email): a registered player whose ROTRA email or connected Google email is it links the row (`player_id`); else the open entry for it is reused (same RTR ID); else a new entry is created and its RTR ID allocated from the creating club's founding location and that day, through the same counter as registered players (`rotra_next_player_sequence`), so the two never share a number. An email this club already has for another saved player is refused on New player and answers **Same person** in Edit details.
- **Same person move:** `club_players.linked_to_club_player_id` (see sessions and roster).
- **Deleting** a record whose entry has no other current record retires the entry (`retired_at`, email cleared). The RTR ID is never reused; counters are not rewound.
- **Lookup:** exact RTR ID or exact normalized email over open entries and registered players (not hidden from the directory); an entry hit returns the RTR ID and status only, with the entry id as what the add commands take; the name search projection is removed. No phone lookup; QR codes unchanged.
- **Registration** (club or session invite with a password or Google, and a club record's invite link): the staging step copies an open entry's allocation into `player_id_allocations` when the registering email matches (the person keeps the RTR ID); once the account exists the entry is claimed (`claimed_player_id`) when the ROTRA email or the Google email equals it, and every current club row pointing to it links to the account (one per club; a club that already lists the account keeps that row). The picked identity card only seeded the form (name, nickname); club pictures are not stored, so nothing else is copied. The phone linking of D-2026-11-11-03 still runs beside it. No history attribution row is written (still open).
- **Admin edits:** an open entry's email (unique check against entries and registered contacts) and the registration place and date, which reissue the RTR ID with the same number. The new string replaces the old one on every record that stores it, in one transaction: `shared_player_entries.rtr_id` and `player_id_allocations.rtr_id` (with their place and date columns), the only two (no JSON projection or snapshot stores it). `player_id_allocations` stays append-only except this one UPDATE, allowed by its trigger only while the transaction sets `rotra.rtr_id_change`. The new place and day's counter is raised to at least that number. A taken RTR ID is refused; there is **no alias**, so the old one no longer resolves. Registered players' RTR ID changes run the same cascade.
- **Public and ranked:** an unclaimed person reads as public on the session page's participant card (the club's own name and nickname, the RTR ID, stats from every record under the entry). The leaderboard rule (listed only while exactly one club record points to the entry) is not built: rank calculation does not count unclaimed records yet.
- **Existing data:** rows with a private phone and no email stay as they are and read as **Details required**; nothing was moved or deleted.

Still open: in [database open decisions](../../open-decisions.md).

## Club-only unclaimed profiles ([D-2026-11-11-03](../../../../mvp/decisions.md#d-2026-11-11-03)) — storage and services built

*Superseded in part on November 16, 2026 by [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04) (section above, built in P15.8). What still holds: older phone-only records, the record-keyed invite links and the phone linking on registration.*

Decided behaviour: an unclaimed profile lives only in its club, has no RTR ID, and is never found by another club; two clubs with the same phone keep separate records; on registration every club's record with that phone links automatically. Storage (migration `20261112000100_round2_profiles_banners_invites`, P08.1; no new columns were needed, `club_players` already carried `display_name`, `nickname` and the private-intake phone):

- An unclaimed profile is a `club_players` row with `player_id` null plus its `club_player_private_inputs` phone. No `players`, `player_private_contacts` or `player_id_allocations` row is created for it, so the global unique phone and the RTR ID belong to registered players only. Several clubs may hold the same phone in their private inputs.
- Entry sync links `club_players.player_id` only when the phone matches a **claimed** player's `player_private_contacts`; otherwise the input stays with the club.
- A registration invite for an unclaimed profile is a `club_player_claim_links` row keyed by `(club_id, club_player_id)` (migration `20261112000200_club_player_claim_links`, P08.9; same token, state and expiry rules as `player_claim_links`, one active link per record). Registering from it, or independently with the same phone, creates the player (claimed), contacts, account and RTR ID allocation (the inviting club's founding location), then links every unlinked `club_players` row whose private phone matches, one per club (`club_player_private_inputs` → `resolved`). No history attribution row is written by the link (open: see below).
- Player Information search filters to `profile_state = claimed`.
- **Existing data (migrated 2026-11-12):** every unclaimed `players` row linked from a club record was moved onto its club records (nickname copied where missing, phone copied into the club's private intake as `pending`), roster/hold/join-request snapshots that pointed at it were cleared (the entries stay attached through `club_player_id`), its invite links were deleted, its RTR ID allocation released (counters not rewound) and the `players` row deleted. Rows with immutable facts, assessments, attributions, projections, a rank, an account or requests stop the migration instead (none existed). Unclaimed rows with no club record are the registration service's staging rows and are left alone. Details: the migration's README.
- **Services (P08.9, 2026-11-12):** `searchPlayerDirectory` filters to `profile_state = claimed`; `resolveClubPlayerIdentity` only links a phone that belongs to a claimed player and never creates `players` rows or RTR IDs (an unmatched phone leaves the input `pending`, so a club-only record reads as Lookup pending in real mode until a marker state is decided); `issueClaimLink` issues a `club_player_claim_links` row for a club-only record; `registerGuest` and the record claim link both run the phone linking above. Admin › Players lists club-only records under their club as “Not registered yet” with no RTR ID (owner answer, November 12, 2026). The unverified-phone risk of automatic linking is accepted for MVP (owner answer, same day).
- **Still open:** a history attribution per linked record (none is written; the record's games stay reachable through `club_player_id`); a club-set picture or experience for a club-only record (no column yet, no data existed); a marker for “looked up, nobody registered has this phone” on `club_player_private_inputs`.

## Private contacts and account mapping

`player_private_contacts`: PK/FK `player_id`; required normalized phone for globally created identities; nullable normalized email until claiming; contact verification metadata and revision. Unique phone across all global players. Proposed unique non-null normalized email avoids ambiguous email login; exact canonicalization and shared-address policy need account-flow review. A claimed profile always has an email (decided 2026-11-07, #244).

`player_accounts`: PK/FK `player_id`; unique authentication provider/subject; claim time; current contact-sync version/status. The identity provider owns password hashes, sessions, and reset tokens, not application profile tables. A claimed profile must have both required contacts; enforce this transition transactionally.

**Account mapping, decided 2026-11-07 (#244):** the provider account is an **email + password** account; the provider holds the email (no phone provider, no SMS). Players sign in with **email + password only**; *changed 2026-11-08:* the phone-lookup sign-in is withdrawn, so no phone → email lookup exists. The signed-in provider subject must map through `player_accounts` to a player that is not disabled. Every failure (unknown email, unclaimed profile, wrong password) returns the same generic credential error. The player row links to the auth subject through `player_accounts`; the auth subject is never the player ID. Recovery is email-only.

Claiming is not permission to edit contact identity directly. Initial email completion and approval of later contact changes are distinct commands. No SMS requirement or Facebook login is introduced.

`player_social_links`: player FK, provider (Facebook/Instagram/YouTube/LinkedIn), URL, timestamps; unique `(player_id, provider)`. Do not treat these URLs as proof of identity or auth subjects. Public visibility remains subject to the profile-field decision.

**Google sign-in ([D-2026-11-16-01](../../../../mvp/decisions.md#d-2026-11-16-01)); written in #922, migration `20261118000200_player_google_sign_in` not applied yet, not run against Google.** The Google identity lives in Supabase Auth (`auth.identities`, provider `google`) on the same auth user as any password identity; `player_accounts` still maps one auth subject to one player. ROTRA keeps no Google tokens. Columns on `player_accounts`: `google_email` (trimmed and lowercased by a CHECK, nullable, unique when set: one Google account per ROTRA account) and `google_linked_at` (set together with it, by a CHECK); has-password is read from the auth user, not stored. **`google_email` is ROTRA's own record of "Google is connected"**: Supabase links a new Google identity to an existing user with the same verified email by itself, so an identity in `auth.identities` alone is never a connection. The callback signs in only when `google_email` already equals the Google email, asks **Connect Google to your account?** otherwise, and writes `google_email` only after that answer; a session started by Google is refused for an account whose `google_email` is null ([how](../../../../backend/google-sign-in-setup.md)). A Google sign-in with no matching identity never creates a player outside the registration sources. The deadline is configuration, not a column per player: December 31, 2026 for now as one swappable value (owner, November 18, 2026); whether it becomes an Admin setting or an environment value is open.

## Account verification ([D-2026-11-16-02](../../../../mvp/decisions.md#d-2026-11-16-02))

For a registered player, the automatic status is derived: verified = `google_email` is set **and** `player_private_contacts` has a phone **and** `google_email` equals the normalized account email. The Admin override is stored: `players.verification_override` enum (`verified` only) nullable, with `verification_override_by` (admin account) and `verification_override_at`. Each set and clear writes an [Admin audit entry](../../admin/modules/configuration-requests.md#admin_audit_events) with a required reason in its metadata (owner, November 18, 2026, #907). Clearing the override returns to the derived status.

Migration `20261118000300_player_verification_override` adds the three nullable columns to `players`. A check requires either three nulls or a claimed player with all three fields set. The indexed `verification_override_by` foreign key references `admin_accounts.id` with restricted deletion. The private Player and Admin reads derive the three checks from the same rules as mock mode. The Admin write locks the player row, compares its revision, and commits the override, revision increment and audit entry in one transaction.

## Registration links

`player_claim_links`: UUID PK; player FK; issuing club/account; unique opaque token digest; issued/expiry/consumed/revoked times; claim-state/version metadata. Store a digest rather than a reusable plaintext secret.

`club_player_claim_links` (P08.9): the same columns keyed by `(club_id, club_player_id)` → `club_players` instead of a player, for a club's own unclaimed record. One token namespace: a claim read looks the digest up in both tables.

**Decided 2026-11-07 (#244), lifetime changed 2026-11-11 ([D-2026-11-11-08](../../../../mvp/decisions.md#d-2026-11-11-08)):** expiry is the issued time plus **24 hours** (was 7 days). No email verification on claim: the claim confirms the email at once. Password: at least 8 characters, nothing else. A link claimed by the wrong person is not undone; the Queue Master creates a new player. A link is **single use**: consumed time is set once, and a consumed link never claims again. The club (Queue Master) can **reissue**; reissuing sets the revoked time on the player's current active link in the same write, so at most one active link exists per player. Expired, consumed and revoked links resolve to the existing expired/used states. If the phone or email being bound already belongs to another account (unique contact or account constraint), the claim is **blocked**, nothing is consumed or merged, and the screen shows the contact-support route.

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
| Expired link, then reissue | Link issued Nov 1 at 19:00, opened Nov 3 | Expired state shown. The Queue Master reissues: the old link is revoked, the new one is valid 24 hours and single use; after a successful claim it shows the used state |
| RTR ID or name only | Someone has the public RTR ID or the name | Cannot claim; only a valid link plus completed provisioning claims |
| Guest invite (name-only guest) | Guest with no phone and no global profile | Registration leaves the club guest record unlinked; a separate invitation is required to link it (owner, November 8, 2026, #490; *since November 16, 2026 there is no linking invitation: the club adds the guest's email first, [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04)*). Matching phone/email prompts whether the existing account is theirs. Yes requires sign-in/Admin-reviewed recovery; No requires contact correction or contacting ROTRA. Existing contact uniqueness stays in place; answering Yes never authorizes a link |
| Simultaneous allocation | Two clubs sync the same new phone at once | **Open** beyond the existing unique-phone retry rule |
| Failed provider application | Provider account step fails or the response is lost mid-claim | **Open**; the staged, idempotent recovery above is still the rule |

## Club membership, email confirmation and registration location ([D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06))

Club membership is a row in `club_players` (the club's saved players). Add `joined_via` with `club_link | session_link | added_by_club`, shown as “Joined via club link”, “Joined via session link” or “Added by the club”. **Leave club** sets that row's `removed_at` and keeps it for history, never a hard delete (owner decision, F07.64); Join club again clears `removed_at`. Game history stays. A player can have several rows. `player_private_contacts` (or the account mapping) gains nullable `email_confirmed_at`; while null, contact-change requests are refused. Admin-link registrations store the chosen city or province (from `location_codes`) as the RTR ID location; club and session links use the club's founding location. The clubs card on another player's profile (D-2026-11-12-04) is a read of the same `club_players` rows (club id, name, logo only; never `joined_via`), and the club page read adds a derived `viewerIsMember` (the viewer has a row not removed); no table is added.

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

`player_id_allocations`: PK/FK `player_id`; unique `rtr_id` (append-only except Admin's place-and-date change under [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04), see below); creating club FK; founding-location FK; frozen country/city strings; `sync_date`; sequence; allocation timestamp. Unique `(location_code_id, sync_date, sequence)`.

Allocation transaction:

1. Normalize/resolve the phone and lock its existing identity or safely race on the unique phone constraint.
2. Reuse an existing profile/allocation; never create another ID for the same identity.
3. For a new eligible profile, increment that founding city's counter using a single atomic database operation, then insert the allocation in the same transaction.
4. Format `RTR-PH-CEB-102926-0001` using the **sync day** and club founding city. Internal UUIDs never use this string.
5. On a uniqueness race, retry from identity resolution; do not publish a losing allocation or use `MAX(sequence)+1`.

IDs stay the same through contact/address changes; those do not rerun allocation. *Built in P15.8 for [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04):* an Admin change of the registration place or date writes a new `rtr_id` (same sequence number, unique check: “Another player already has this RTR ID. Choose another place or date.”) and replaces the old string on `shared_player_entries` and `player_id_allocations`, the only records holding it; allocation also runs when a club first saves an unclaimed person's email (into `shared_player_entries`), and registration copies that allocation; retired IDs are never reused. Do not assume gap-free sequences or truncate values over four digits; overflow presentation is open.

**Owner decision, October 28, 2026** (*superseded in part on November 11, 2026: the RTR ID is allocated on registration, not on entry sync; [D-2026-11-11-03](../../../../mvp/decisions.md#d-2026-11-11-03); and again on November 16, 2026: allocated when a club first saves the person's email, [D-2026-11-16-04](../../../../mvp/decisions.md#d-2026-11-16-04), built in P15.8*)**:** resolve/create the profile and allocate its permanent RTR ID as soon as the entry successfully syncs, without waiting for Session done. Keep unresolved or conflicting input pending; never claim a permanent ID was allocated offline. Identity creation does not grant match-performance credit before valid finalization.

After a club record joins a profile (since November 16, 2026: an unclaimed record under the person's email; a guest's record only after the club adds an email), attribute its earlier valid games to that profile for personal history and ranking under the existing eligibility/window rules. Keep original entry/finalization identity snapshots and permanent outcomes intact; the auditable linkage/projection mechanism, confirmation evidence, and mistaken-link handling must be designed before implementation. Use original played dates and deduplicate contributions.

Indexes: unique phone, non-null email proposal, auth subject, RTR ID, allocation city/date/sequence; name lookup can use a safe public search projection. No public phone index/query API is implied.

## Public club page reads (#737, epic P07)

The page at `/clubs/[clubId]` adds **no table**. The member list is a read of `club_players` (not removed, `player_id` not null, so guests and unclaimed profiles never appear) joined to registered `players` whose `hidden_from_directory` is false; the count is the number of rows listed. Masking follows `profile_visibility` and the viewer (a visitor sees `private` and `always_private` names masked; a signed-in viewer sees `private` names; `always_private` stays masked for everyone but the player) while `avatar_ref` and `banner_id` are returned for all. Upcoming sessions, the calendar and stats read the club's `queue_sessions` and public session pages. Reads are served per request and never indexed ([D-2026-11-11-09](../../../../mvp/decisions.md#d-2026-11-11-09) for page retention). The Share profile card adds no storage: it uses the profile and the player's counted wins this calendar year (from January 1, Asia/Manila; [D-2026-11-13-03](../../../../mvp/decisions.md#d-2026-11-13-03)), derived from the same counted games as rank.

Business source: [identity](../../../../business_logic/product/player-information/modules/identity/README.md).
