# Workstream — Player access & Player Information

**Last verified:** 2026-11-12 (round-2 status lines; code trace of `main` @ `aca899f2` for the rest; traced, not run) · [MVP hub](../README.md)

Paths: `real/` = `packages/data/src/real/`, `api/` = `apps/player/src/app/api/`, `db/` = `packages/db/`.
"Mock only" = in real mode the screen shows "This part of ROTRA isn't connected to saved data yet."

## Goal

Player Information exposes identities/history. Players can sign in, claim their account and recover
access. Recovery follows [D-2026-11-07-01](../decisions.md#d-2026-11-07-01), updated by #491: Admin reviews submitted requests and provides links without automatic email.

## In scope

Public profile, RTR ID lookup, games/history, rank page and leaderboard reads; own profile, phone
privacy, contact-change submit; player sign-in (email + password only since 2026-11-08), sign-out, session; registration/account claim;
password recovery through Admin-reviewed requests (#491).

## Out of scope / deferred

- Automated recovery emails, a player notification inbox, and club-owner password resets. #491 adds submitted requests in Admin.
- Meaningful rank and leaderboard values until #247 ([ranking.md](ranking.md)).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Public profile | implemented | `(public)/players/[playerId]/page.tsx` → `player/fetchers.ts:51` → `real/player.ts:96` → `api/players/[playerId]`; pages load in real mode since #488 (public `api/ranking-settings` → `db/src/player/ranking-settings.ts`; no rank row reads as "no rank yet") | #400 closed; #488 |
| RTR ID lookup (`/find/[rtrId]`) | implemented | `player/fetchers.ts:39` → `real/player.ts:122` → `api/rtr-ids/[rtrId]` | #400 closed |
| Games / history | implemented | `player/fetchers.ts:31` → `real/player.ts:114` → `api/players/[playerId]/games` → `db/src/player/projections.ts` | #400 closed |
| Player Compare | implemented in source; SQL draft | `player-compare/usePlayerCompare` → signed-in `api/players/[playerId]/compare` → `db/src/player/compare.ts` → `rotra_player_compare`; mock fixtures and screen landed, SQL-only migration still needs human sign-off/runtime EXECUTE grant, local and hosted verification pending | #525, #526, #541; D-2026-11-08-02 |
| Player rank page | partially connected | `api/players/[playerId]/rank` → `projections.ts`; rank always null / `formula_pending` | #247 open |
| Leaderboard (page, search, my position) | partially connected | `real/leaderboard.ts` → `api/leaderboard/{,search,me}` → `db/src/player/leaderboard.ts`; eligibility always `false` (`projections.ts`) so the list is empty | #247 open |
| Own profile read/edit, phone privacy, contact-change submit | implemented | `api/me/{account,profile,phone-privacy}`, `api/account/contact-change` → `db/src/player/{profile,contact-change}.ts`; a real player session now exists (#483). Admin approval side: [admin.md](admin.md) | #400 closed; #483 |
| Your clubs, Join club, Leave club | implemented in source (F07.64); not run against a database | `player-club/fetchers.ts` → `real/player-club.ts` → `api/me/clubs` (GET, POST) and `api/me/clubs/[clubId]` (DELETE) → `db/src/player/my-clubs.ts`. Leave club sets `club_players.removed_at` and keeps the row (owner decision); Join club creates the row or clears `removed_at`. `club_players.joined_via` is not migrated (D-2026-11-09-06), so a club-link join reads as "Added by the club"; a confirmed join request reads as "Joined via session link" | F07.64 |
| My sessions, share-card results | implemented in source (F07.65); not run against a database | `player/mySessions.ts` → `real/my-sessions.ts` → `api/me/sessions` → `db/src/player/my-sessions.ts` (open sessions from roster, waitlist and pending requests; finished from saved history). `player/shareData.ts` → `api/me/sessions/[sessionId]/share` (published standings only; position from the published snapshot; guests masked). A private-profile flag has no column yet (F07.66), so every player with an RTR ID shows their picture | F07.65 |
| Sign-in (email + password only) | implemented | `auth/fetchers.ts:33` → `real/player.ts:26` → `api/auth/sign-in` → `db/src/auth/sign-in.ts` (`SignInAudience` includes `player`). Phone sign-in withdrawn 2026-11-08 | #483 |
| Session read / proxy guard | implemented | `auth/fetchers.ts:27` → `real/player.ts:23` → `api/auth/session` → `handleSessionRead('player')`; `apps/player/src/proxy.ts` | #483 |
| Logout | implemented | `auth/fetchers.ts:71` → `real/player.ts:32` → `api/auth/sign-out` → `handleSignOut('player')` | #483 |
| Registration / account claim (`/claim/[token]`) | implemented | `player-account/fetchers.ts:89,174` → `real/player.ts:39,47` → `api/claim/[token]` GET/POST → `db/src/player/{claim,account-access}.ts` (`readClaimLink`, `registerFromClaim`); prefilled from the club, phone typable when none on file (#484). The "processing" re-check (`checkClaimStatus`, `player-account/fetchers.ts:211`) is mock only | #483, #484 |
| Claim-link issuance — Queue (Saved players › Invite) | implemented | `club-player/fetchers.ts:165` → `real/queue.ts:550` → Queue `api/club/players/[clubPlayerId]/registration-link` → `db/src/player/claim.ts:44`; 7 days (`CLAIM_LINK_DAYS = 7`), a new link cancels the previous one (#485); guests get independent registration at `/register/[clubId]` (#490) | #483, #485 |
| Claim-link issuance — Admin | not implemented | `admin-player/mutations.ts:229` `issueRegistrationLink` mock only | none found |
| Forgot Password screen | implemented in #491; schema applied | `/api/auth/password-reset` saves an Admin review request; no automatic email | #491 |
| Reset password (`/reset-password/[token]`) | implemented in #491; schema applied | Reviewed digest + provider expiry/single use, mapped player check, new password chosen by player | #491 |
| Guest registration (without an existing-profile claim link) | implemented | `/register/[clubId]` → `useGuestRegistration` → `/api/register/[clubId]` → `db/src/player/guest-registration.ts`; unique contacts, recoverable claim staging, no guest linkage. Once the account exists the new player is saved to the originating club (`addPlayerToClub` in `my-clubs.ts`, D-2026-11-09-06, #707); a failed join does not fail the registration. Local database + simulated-provider flow verified; production provider not exercised | #490, #707 |
| Club invite code (`/register/[clubId]?k=<code>`) | implemented in source (P08.7, #755; not run against a database) | One `clubs.invite_code` column, every club backfilled in `20261112000100`; the server checks `k` and Regenerate link replaces it; a plain link without a valid code is refused ([D-2026-11-12-01](../decisions.md#d-2026-11-12-01)). Open: the public club page's Join button sends the current code to anyone who opens the page | #707, #712, #755 |
| Profile visibility (Public · Private · Always private), Hide me from Player Information, profile banners | implemented in source (P08.5, P08.6; #753, #754) | `players.profile_visibility`, `hidden_from_directory`, `banner_id`; the hide flag applies to Queue Add player › Player Information and RTR ID search only; an always-private leaderboard row keeps position, picture and banner and hides the level; banner default = first shown banner; the Edit profile swatches cannot show a banner Admin later hid ([D-2026-11-12-01](../decisions.md#d-2026-11-12-01)) | #715, #753, #754 |

## Remaining work

- [x] Player sign-in / sign-out / session Route Handlers (#483).
- [x] Claim Route Handlers; 7 days; reissue cancels the previous link (#483, #485).
- [x] Queue claim-link issuance (#483).
- [ ] Admin claim-link issuance in real mode. Ticket: needed if Admin issuance is MVP (open question 9).
- [ ] Admin-reviewed password recovery (#491) is verified with the hosted provider (schema applied after sign-off).
- [ ] Attach a signed-in player to a join request; player sign-up (D-07). Ticket: needed.
- [ ] Rank and leaderboard become meaningful after #247. Ticket: #247.

## Related decisions

- [D-2026-11-07-01](../decisions.md#d-2026-11-07-01) — manual password recovery.
- [D-2026-11-07-03](../decisions.md#d-2026-11-07-03) — guest identity reconciliation.
- [D-2026-11-11-03](../decisions.md#d-2026-11-11-03) — guests and unclaimed profiles stay in their club; RTR ID on registration; built in P08.9 (#757).
- [D-2026-11-12-01](../decisions.md#d-2026-11-12-01) — answers to the leftover questions of the November 11 round.
- [D-2026-11-07-07](../decisions.md#d-2026-11-07-07) — original login-only invite superseded by independent guest registration in #490.
- [D-2026-11-07-04](../decisions.md#d-2026-11-07-04) — scope freeze.

## Blocking open decisions

- #244 (email verification on claim, password policy, contact-change enforcement, mistaken guest links); hosted provider handoff verification for #491.
- #247 ranking math (rank, leaderboard).
- [Business open decisions](../../business_logic/product/open-decisions.md) · [database open decisions](../../database_design/product/open-decisions.md) · [screen open decisions](../../screens/product/open-decisions.md).
- Hub open questions 8, 9, 12, 14.

## Exit criteria

**Proposed — owner to confirm.**

- [ ] In real mode, a player can claim an account, sign in, sign out, and read and edit their own profile.
- [ ] Public profile, RTR ID lookup and history work for visitors.
- [ ] Admin-reviewed password recovery (#491) is verified with the hosted provider (schema applied after sign-off).
- [ ] Rank and leaderboard behaviour matches the owner's ruling (open question 12).
