# Design decisions before migrations

> **November 8, 2026:** The owner decisions in [Offline operation and recovery](../../business_logic/product/queue/modules/offline/README.md) supersede conflicting earlier offline, device, finalization, payment and conflict rules below. Late-record recovery and implementation details remain open.


**Last verified:** 2026-11-12 for the round-2 columns (D-2026-11-12-01); 2026-11-07 for player login mapping and claim-link rules (#244) and the MVP offline-start note (D-2026-11-07-03); 2026-11-06 for the On court, substitution-credit, court-fill, cancelled-session and times-and-days decisions (column names settled; drafted in `20261106000100`); 2026-11-01 for the F07.34 wiring gaps (#317).

**Status:** Review register, not a questionnaire or approval request for writing these docs.

This design is concrete enough to review but not safe to translate mechanically into migrations. The [business open decisions](../../business_logic/product/open-decisions.md) still apply.

Execution gates now have focused tickets: [#243 infrastructure](https://github.com/jose-codegourmet/rotra-v2/issues/243),
[#244 identity/auth/contacts](https://github.com/jose-codegourmet/rotra-v2/issues/244),
[#245 roster/payments/licenses](https://github.com/jose-codegourmet/rotra-v2/issues/245),
[#246 offline/finality](https://github.com/jose-codegourmet/rotra-v2/issues/246),
[#247 calculations](https://github.com/jose-codegourmet/rotra-v2/issues/247), and
[#248 public/retention](https://github.com/jose-codegourmet/rotra-v2/issues/248).
Creating those issues did not settle their questions. The [command contracts](command-contracts.md)
and [schema dependencies](schema-dependencies.md) identify their consumers.

## Technical proposals introduced here

| Proposal | Why | Unresolved consequence |
|---|---|---|
| One PostgreSQL database, logical product ownership | Shared identity and atomic finalization | Physical schemas/worker boundaries |
| Player UUID independent from auth UUID | Unclaimed profiles and permanent history | Migration and account-provider mapping |
| Club-local player with optional global link | Guest participation and offline identity | Auditable historical attribution after confirmed identity; confirmation evidence and duplicate/mistaken-link resolution |
| Session reservation before offline start authorization | Prevent a second distinct offline active session | When reservation is acquired/released; no new requirement that all downloads reserve a slot (MVP: offline start is out of MVP under [D-2026-11-07-03](../../mvp/decisions.md#d-2026-11-07-03), so this reservation is moot for MVP.) |
| Enrolled device streams with contiguous sequence and final seals | Detect missing original records before Session done | Device 2 provisioning; conflicting terminal decisions; unknown/unregistered device prevention |
| Immutable decisions plus conflict quarantine | Preserve touch-move while reconciling | Who selects among conflicting confirmed facts and what selection means |
| Versioned finalization facts and rank jobs | Retry safely without double contribution | Projection delay UX and exact atomic visibility across products |
| Player compare (head to head) data: **no cron job** unless the owner approves one. Read it from the final match rows, or update a per-pair summary in the same step that submits and finalizes a session | Owner comment, November 8, 2026: a background Supabase Edge Function that cron-runs games was suggested, with the note to check a cron is even needed and to add no extra work after a session is submitted. Edge Functions and cron are new infrastructure, which needs a decision first. A cron adds delay and a second thing to run; reading from final match rows on request needs nothing extra, and a pair summary updated at submit adds no work afterwards | Settled by [D-2026-11-08-02](../../mvp/decisions.md#d-2026-11-08-02): computed on read by one SQL function; a pair summary only if measured slow |
| Admin Sales numbers (revenue, sessions started, matches played, cost per session) are calculated in Postgres (a read-only view or function per report), read by a thin Admin route handler | Owner leaning, November 8, 2026: not sure Next.js is the right place for calculations; Supabase feels right. See [D-2026-11-08-01](../../mvp/decisions.md#d-2026-11-08-01) for the discussion and the AI recommendation | Settled by [D-2026-11-08-01](../../mvp/decisions.md#d-2026-11-08-01): views computed on read, month paid, cost per session as an Admin setting; a totals table only if measured slow |
| Separate publication data and expiry-cycle IDs | Safe deletion without losing histories | Internal-data retention and restoration after actual deletion |

## Sign-in tables for the Go API (proposed 2026-11-13)

[Sign-in owned by the Go API](sign-in.md) proposes `auth_identities`, `auth_sessions`, `auth_rate_limits` and `auth_events`, and reuses `devices` and `player_password_reset_requests` ([D-2026-11-13-01](../../mvp/decisions.md#d-2026-11-13-01), B-11). Not migration SQL. Still open there: club and admin password policy, rate-limit values, token lifetimes, retention (#248), and when to add the `auth_subject` FKs.

## Blocking unresolved details

- Rating constants (band edges, step sizes) for the rating-by-wins engine; the engine itself, the 90-day window, Asia/Manila midnight, tie order and recompute-on-save were settled November 11, 2026 (below).
- Historical guest-link confirmation evidence and the auditable attribution mechanism; including earlier games after confirmed identity is settled below. (Mistaken links: not undone, settled November 11, 2026.)
- Whether assessments for no-shows, roster entries removed during preparation, or invalid sessions remain eligible; assessment changes already sync immediately, independently of match performance.
- Exact award evidence calculations (partial substitutes are excluded from local standings and awards unless the Queue Master gave one the game; see below).
- Interrupted-device conflict resolution versus irreversible winners. Never implement last-write-wins as an accidental answer.
- Long-term policy for finalization with active games (v1 refuses it); whether unused waiting matches are kept frozen or marked removed; recovery of a session already marked invalid.
- Collision-free `match_no` allocation across offline devices, and collision-free court placement (two devices putting the same match or court On court while disconnected).
- Offline inventory edits, automatic stock deduction, and non-peso currencies.
- Phone/contact conflict handling and aliasing duplicate offline club-player IDs without rewriting confirmed history.
- Sequence formatting above 9999 (the city registry, Admin-added cities and founding-location corrections were settled November 11, 2026).
- Refunds, offline expiry enforcement, flag targeting, and when offline devices pick up flag changes (renewal dates and overlapping terms were settled November 11, 2026). (Per-club prices, free tester clubs, owner-added clubs and owner-created flags were settled October 27, 2026.)

## Owner decisions recorded November 12, 2026

Source: [D-2026-11-12-01](../../mvp/decisions.md#d-2026-11-12-01), built in migrations `20261112000100_round2_profiles_banners_invites` and `20261112000200`.

- **Settled:** `players.profile_visibility` enum (`public` · `private` · `always_private`) plus `players.hidden_from_directory`; existing Private maps to `private`, others to `public`, new registrations default `private`. `clubs.invite_code` (one column, every club backfilled). `profile_banners` table and `profile-banners` Storage bucket modelled on characters, `players.banner_id`; the default banner is the first shown one (changed November 13, 2026: Admin picks it, `profile_banners.is_default` built in `20261114000100_profile_banner_default`, [D-2026-11-13-03](../../mvp/decisions.md#d-2026-11-13-03)). Unclaimed `players` rows were moved onto `club_players` and their RTR IDs released.
- **Still open:** a stored marker that distinguishes a club-only record whose phone lookup found nobody (“Lookup pending”) from “Unclaimed”; whether Admin › Add player may still create an unclaimed `players` row with an RTR ID; the invite code shown to anyone who opens the public club page (Join sends it); the banner picker for a banner Admin later hid; closing drop-out notices at Start; an attribution history per linked club record.

## Owner decisions recorded November 11, 2026

Source: the owner's answers of November 11, 2026, recorded as [D-2026-11-11-04](../../mvp/decisions.md#d-2026-11-11-04) to [D-2026-11-11-10](../../mvp/decisions.md#d-2026-11-11-10). Prose rules only; no DDL or migration is approved by this.

- **Offline writes (D-04, #722):** an IndexedDB outbox of commands applied locally by the existing reducers and replayed through the existing real adapters on reconnect; 409 goes to Q-CONFLICT. The device-stream protocol in [offline-sync.md](queue/modules/offline-sync.md) is not built for MVP. A `playhistory.json` export/import in Club settings › This device is the manual fallback.
- **Ranking (D-05, #247):** rating by wins weighted by opponent strength; seeded from the first level for the night; assessments have zero influence after that; Provisional for ~10 games; 90 rolling days, Asia/Manila midnight; saving settings recomputes everyone from the game facts; leaderboard ties by games in the window, then name; prototype award formula and Generate matches weights approved as is. The `club_assessments` vote model and the 70/30 policy fields no longer feed rank ([ranking](player-information/modules/ranking.md)). Constants in #247.
- **Roster and payments (D-06, #245):** a paid mark survives demotion to the waitlist; payments can change after Session done with an audit record; shuttle plan lines snapshot the unit cost at save; a level saved for a roster player removed before start is dropped.
- **Licenses (D-06, #377):** terms stack, a renewal starts the day after the current term ends, else today; no client-supplied start date; payment history keeps the generated `LIC-####` and the typed note as separate fields.
- **Club sign-in (D-07, #381, #382, #380):** the synthetic `<username>@clubs.rotra.invalid` login stays and a username change rewrites it; a forgotten club password is a request the platform owner sees in Admin › Requests and answers with a temporary password; Q-LOGIN says "Username or password is incorrect."; A-ADD-CLUB says "Password incorrect. Try another password." on a provider rejection; the six cities are the v1 list and the platform owner adds cities from Admin; RTR IDs are display only (records key on the UUID) and never change on a city correction.
- **Accounts (D-08, #244):** registration links expire **24 hours** after issue (was 7 days), still single use with reissue revoking the old one; no email verification on claim; password at least 8 characters; a wrong claim is not undone; name-only guests are invited once a contact is added; RTR sequence first come, first served.
- **Public pages (D-09, #248, #398):** cookie receipt; public pages have no time limit while licensed and are never indexed or static; no Unpublish; join requests, server logs and exports are kept 90 days.
- **Housekeeping (D-10):** #243 closed as overtaken (RLS stays #387); no club accent for MVP (#395 closed); the pg_cron jobs of D-2026-11-08-04 are parked, so ageing, eligibility and license state are computed on read.

## Owner decisions recorded November 7, 2026

Source: [#244](https://github.com/jose-codegourmet/rotra-v2/issues/244) (F07.3) and the [business decision summary](../../business_logic/product/open-decisions.md#settled-by-the-product-owner-on-november-7-2026). Prose rules only; no DDL or migration is approved by this. Details and worked examples: [identity](player-information/modules/identity.md).

- Player auth accounts are email + password, and players sign in with email only (phone-lookup sign-in withdrawn 2026-11-08); the provider sends no SMS. Email is required on every player account; recovery is email-only.
- Sign-in failure is one generic credential error. `hide_phone_from_clubs` does not block phone sign-in.
- `players.id` stays independent of the auth subject; `player_accounts` links them.
- `player_claim_links`: expiry = issued + 7 days; single use (consumed once); club reissue revokes the previous active link.
- A phone or email at claim that already belongs to another account blocks the claim; never merge.
- An RTR ID or name alone never claims.

Still open: email verification on claim; password policy; contact-change enforcement across direct provider APIs and its approval evidence (application itself is real since #575); RTR location/date/sequence rules and simultaneous allocation; mistaken/duplicate guest links and permanent relink; name-only guest invitation; audit lines for a failed or retried contact-change application in real mode (the mock writes them). Club username (#381) and platform-owner sign-in are unchanged.

## Owner decisions recorded November 6, 2026

Source: [mockup change log](../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md) and the [business decision summary](../../business_logic/product/open-decisions.md#settled-by-the-product-owner-on-november-6-2026). **Column names settled by Jose on November 6, 2026** ("use the names the database docs propose"); drafted, unapplied, in migration `20261106000100_on_court_credit_cancel_court_fill` ([physical schema](physical-schema.md)). The commands that use them are later tickets.

- `matches.state` gains `on_court` (placed, not started) between `waiting` and `active`, with `placed_at` (nullable `timestamptz`) and the court assignment before start. `started_at` is set only at Start match. Holds start at placement, so On court players are busy.
- Substitutions gain `credit_to`: `none` (default) · `incoming` · `outgoing` (enum `substitution_credit`); frozen when the match is decided. **Settled:** it is a column on the **incoming** player's `match_participations` row (the segment the substitution opened); `outgoing` names the player whose segment that substitution closed.
- `queue_sessions` gains `court_fill_mode`: `manual` (default) · `auto` (enum `court_fill_mode`).
- **Settled (offline):** the Manual Queue | Auto Queue switch needs internet. While the device is offline, auto filling pauses (no automatic placements), so two offline devices can't collide through Auto Queue. Manual **Put on court** keeps today's offline behaviour; two offline devices placing the same match or court by hand stays open (above).
- Session standings, awards, game counts and minimum progress include a credited substitute as a full participant; long-term performance and rank exclude both partial players regardless of `credit_to`.
- At Session done, `on_court` matches that never started are dropped like waiting matches. Whether either kind is kept frozen or marked removed stays open (above).
- New commands are proposed (place on court, send back to queue, move to another court, set court fill mode); see [command contracts](command-contracts.md).

Times and days ([change log](../../mockup-changes/2026-11-06-queue-time-and-day.md)), proposals except the court columns:

- Club time zone for **display and entry** is settled: Asia/Manila for v1. Storage stays `timestamptz` instants ([conventions](conventions.md)). The canonical timezone for ID dates and rank-window cutoffs stays open (above).
- `scheduled_end_at` becomes editable after start (any instant after now, up to 24 h after `started_at`); `started_at` stays fixed. A late or other-day `startSession` carries a new end. Court planned starts and `open_until` are full instants; see [sessions and roster](queue/modules/sessions-roster.md).
- **Settled November 6, 2026:** `session_courts` gains `starts_at` (planned start; null = the session start) and `opened_early_at` (Start anyway), both nullable `timestamptz`; drafted in `20261106000100`.

Cancelled sessions ([change log](../../mockup-changes/2026-11-06-queue-example-sessions-and-cancel.md)), settled by Jose on November 6, 2026 and drafted in `20261106000100`:

- `queue_sessions.state` gains `cancelled`, only from `prepared`, final; `cancelled_at` (nullable `timestamptz`, set ⇔ cancelled) and nullable `cancel_reason` (text, ≤ 120 characters). Cancelled sessions leave the overlap exclusion and are never finalized. See [sessions and roster](queue/modules/sessions-roster.md).
- A proposed `cancelSession` command, idempotent on its command ID; see [command contracts](command-contracts.md).
- Roster, waitlist and payment marks are retained; payment marks become read-only; no refund records.
- Pending join requests close: `join_request_status` gains `closed` (settled), distinct from `declined`, with the cancel time as `decided_at`.
- **Settled (offline):** Cancel session needs internet, like Delete session. It is never queued offline and has no sync replay.

## Owner decisions recorded October 28, 2026

- Match/create phone-linked profiles and allocate new permanent RTR IDs as soon as the entry successfully syncs, without waiting for Session done. Valid finalization still gates match-performance contribution.
- After identity confirmation, include earlier valid guest games in personal history and ranking under existing eligibility and rolling-window rules. Preserve original facts and club history; apply attribution repeat-safely without duplicate contribution. Confirmation evidence and physical linkage/projection design remain to be specified.
- Private online testing may precede offline recovery work. Full offline support is required before live club use; this is sequencing approval, not approval to run migrations or release an online-only product.

## Gaps from the F07.34 wiring

Found while wiring the first persisted preparation journey (#275, PR #318) and split out of #317 on
November 1, 2026. Nothing here was decided by the split. The decision tickets wait for the product owner;
the chore tickets wait for their own pickup.

| Gap | Ticket | Kind |
|---|---|---|
| A-LICENSE *Starts on* is ignored; the typed *Reference* is kept as the note while the database generates `LIC-####` | #377 | Decision (#245) |
| Payment history has no "activated by" (only the admin account ID is stored) | #378 | Chore |
| A-CLUBS / A-CLUB-DETAIL miss the running session title, pending name request, earlier names and accent | #379 | Chore |
| The six founding cities are a seeded proposal; no approved location registry | #380 | Decision (#244) |
| Club username sign-in maps to `<username>@clubs.rotra.invalid` | #381 | Decision (#243, #244) |
| Q-LOGIN invalid-credential copy; A-ADD-CLUB has no copy for a provider-rejected password | #382 | Decision, mockup-first |
| Editing a saved venue: `ClubVenue` has no `revision`, so real mode refuses edits | #383 | Chore |
| Q-CLUB / dashboard miss the founding city, username and license pricing | #384 | Chore |
| Courts in use, games played, queued matches and "downloaded here" stay 0/false | #385 | Chore |
| Every other domain shows "isn't connected to saved data yet" in real mode | #386 (inventory: #375; public session: #398) | Tracking |
| Public join-request receipt is a browser-session cookie (proposal): no expiry, a lost receipt cannot be recovered, and the visitor sees no status again | #398 | Decision (#248) |
| RLS disabled on 55 public tables; `anon` can execute `rotra_next_player_sequence()` | #387 | Chore (#243), migration sign-off |
| Club logo has no storage adapter | #374 (closed) | Done |
| Player sign-in, registration (claim) and password reset have real-mode routes in the Player app since November 8, 2026 (`/api/auth/sign-in`, `session`, `sign-out`, `password-reset`, `reset-password`; `/api/claim/[token]`). The Queue Master issues registration links from Saved players › Invite (owner decision, November 8, 2026; Queue `/api/club/players/[clubPlayerId]/registration-link`). Admin's Copy registration link is still mock only: `player_claim_links.issuing_club_id` is required and an Admin-issued link has no club. Claims also confirm the email at once (`email_confirm: true`); email verification is still open | #244 | Done for Queue-issued links; Admin issuing and email verification open |
| Contact-change Approve / Retry application / Check status change the provider login | #196, #244, #575 | Done in real mode (#575, Jose, November 8, 2026): Approve = review then apply; the Supabase login email is set and read back before the private contact changes; any failure is Application failed. Approval evidence beyond the owner's manual review stays open |

### Gaps from the match and results wiring (#396)

Found on November 2, 2026. Nothing here was decided by the wiring.

| Gap | Waits on | Kind |
|---|---|---|
| Session done (`finalizeSession`, review and status) is wired at the owner's request with the proposed barriers (no active match, completeness proven, ranking policy in effect); its projection and slide jobs run in the request and on each status read (interim in-request worker), not on a hosted worker | #246 (finalization barriers), #243 (worker hosting) | Decision + chore |
| Generate matches drafts (formerly called Auto Queue) are wired at the owner's request with the prototype's draft weights; the working set lives only on the device (lost on reload, not shared between devices) and only Add to Main Queue is saved (`source: 'auto'`) | #247 (queue generation weights); a stored working set only if wanted | Decision |
| Real-mode queue commands are online only; offline match numbering and the outbox are not built | #246 | Decision |
| A retried add, Make match, Generate matches or Regenerate whose reply never came back sends a new operation ID (the screens supply none), so the operator checks the queue before retrying | Mockup-first if a stable per-sheet ID is wanted | Chore |
| The mock publishes an Off-Day-only selection; `publishResults` refuses it (Off Day goes with the awards slide) | Results publication rules (#248) | Decision |

## Design limits

A database can enforce uniqueness and atomicity for records it has received. It cannot know about arbitrary never-enrolled offline devices, prove a device's unsent work is absent, remotely revoke already-cached data, or infer the true winner from contradictory signed/confirmed inputs. Enrollment, seals, review, and explicit unresolved states are necessary rather than claims of perfect automatic merging.

No production tables were queried, and no SQL/schema/migrations were applied. The existing-schema comparison is repository evidence only.
