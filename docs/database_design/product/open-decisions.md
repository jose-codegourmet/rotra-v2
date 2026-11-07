# Design decisions before migrations

**Last verified:** 2026-11-07 for player login mapping and claim-link rules (#244); 2026-11-06 for the On court, substitution-credit, court-fill, cancelled-session and times-and-days decisions (column names settled; drafted in `20261106000100`); 2026-11-01 for the F07.34 wiring gaps (#317).

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
| Session reservation before offline start authorization | Prevent a second distinct offline active session | When reservation is acquired/released; no new requirement that all downloads reserve a slot |
| Enrolled device streams with contiguous sequence and final seals | Detect missing original records before Session done | Device 2 provisioning; conflicting terminal decisions; unknown/unregistered device prevention |
| Immutable decisions plus conflict quarantine | Preserve touch-move while reconciling | Who selects among conflicting confirmed facts and what selection means |
| Versioned finalization facts and rank jobs | Retry safely without double contribution | Projection delay UX and exact atomic visibility across products |
| Separate publication data and expiry-cycle IDs | Safe deletion without losing histories | Internal-data retention and restoration after actual deletion |

## Blocking unresolved details

- Exact numerical ranking/performance model, label thresholds, global tie behavior, and policy-change retroactivity.
- Three calendar months versus a day count, and canonical timezone for ID dates/window cutoffs.
- Authentication provider support/configuration for club username login; email verification on claim; password policy. (Player login mapping was decided November 7, 2026 and changed to email only on November 8, below.)
- Historical guest-link confirmation evidence, mistaken-link handling, and the auditable attribution mechanism; including earlier games after confirmed identity is settled below.
- Whether assessments for no-shows, roster entries removed during preparation, or invalid sessions remain eligible; assessment changes already sync immediately, independently of match performance.
- Exact award evidence calculations (partial substitutes are excluded from local standings and awards unless the Queue Master gave one the game; see below).
- Interrupted-device conflict resolution versus irreversible winners. Never implement last-write-wins as an accidental answer.
- Long-term policy for finalization with active games (v1 refuses it); whether unused waiting matches are kept frozen or marked removed; recovery of a session already marked invalid.
- Collision-free `match_no` allocation across offline devices, and collision-free court placement (two devices putting the same match or court On court while disconnected).
- Whether shuttle plan lines snapshot the inventory unit cost at save time (the prototype uses the live price).
- What happens to a paid mark when a budget reduction moves that player to the waitlist (the prototype keeps it and shows it again if they regain a slot; `session_payment_marks` keys on the roster entry).
- Offline inventory edits, automatic stock deduction, and non-peso currencies.
- Phone/contact conflict handling and aliasing duplicate offline club-player IDs without rewriting confirmed history.
- City/country code registry, sequence formatting above 9999, and founding-location corrections.
- Renewal dates and overlapping terms, refunds, offline expiry enforcement, flag targeting, and when offline devices pick up flag changes. (Per-club prices, free tester clubs, owner-added clubs and owner-created flags were settled October 27, 2026.)

## Owner decisions recorded November 7, 2026

Source: [#244](https://github.com/jose-codegourmet/rotra-v2/issues/244) (F07.3) and the [business decision summary](../../business_logic/product/open-decisions.md#settled-by-the-product-owner-on-november-7-2026). Prose rules only; no DDL or migration is approved by this. Details and worked examples: [identity](player-information/modules/identity.md).

- Player auth accounts are email + password, and players sign in with email only (phone-lookup sign-in withdrawn 2026-11-08); the provider sends no SMS. Email is required on every player account; recovery is email-only.
- Sign-in failure is one generic credential error. `hide_phone_from_clubs` does not block phone sign-in.
- `players.id` stays independent of the auth subject; `player_accounts` links them.
- `player_claim_links`: expiry = issued + 7 days; single use (consumed once); club reissue revokes the previous active link.
- A phone or email at claim that already belongs to another account blocks the claim; never merge.
- An RTR ID or name alone never claims.

Still open: email verification on claim; password policy; contact-change enforcement across direct provider APIs and its approval evidence; RTR location/date/sequence rules and simultaneous allocation; mistaken/duplicate guest links and permanent relink; name-only guest invitation; failed provider application handling. Club username (#381) and platform-owner sign-in are unchanged.

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
| Contact-change Approve / Retry application / Check status change the provider login; not connected in real mode (#401) | #196, #244 | Decision |

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
