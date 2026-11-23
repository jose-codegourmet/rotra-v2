# Workstream — Player access & Player Information

**Last verified:** 2026-11-20 (Google sign-in row, Admin link and D-2026-11-20-01); 2026-11-12 (round-2 status lines; code trace of `main` @ `aca899f2` for the rest; traced, not run) · [MVP hub](../README.md)

Paths: `real/` = `packages/data/src/real/`, `api/` = `apps/player/src/app/api/`, `db/` = `packages/db/`.
"Mock only" = in real mode the screen shows "This part of ROTRA isn't connected to saved data yet."

## Goal

Player Information exposes identities/history. Players can sign in, claim their account and recover
access. Recovery follows [D-2026-11-07-01](../decisions/2026-11-07.md#d-2026-11-07-01), updated by #491: Admin reviews submitted requests and provides links without automatic email.

## In scope

Public profile, RTR ID lookup, games/history, rank page and leaderboard reads; own profile, phone
privacy, contact-change submit; player sign-in (email + password only since 2026-11-08), sign-out, session; registration/account claim;
password recovery through Admin-reviewed requests (#491).

## Out of scope / deferred

- Automated recovery emails and club-owner password resets. #491 adds submitted requests in Admin.
- Skill-rating values until #247 ([ranking.md](ranking.md)).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Public profile | implemented | `(public)/players/[playerId]/page.tsx` → `player/fetchers.ts:51` → `real/player.ts:96` → `api/players/[playerId]`; pages load in real mode since #488 (public `api/ranking-settings` → `db/src/player/ranking-settings.ts`; no rank row reads as "no rank yet") | #400 closed; #488 |
| Player notifications | mock and real modes implemented in source | `/notifications`, signed-in bell and `/api/me/notifications` list/count/mark routes. Seven transactional event writers, the derived verification reminder and a 90-day visibility window. The mock includes a session invite. | #890, #914 |
| Account verification | connected and locally verified | Signed-in `GET /api/me/verification` derives Google, phone and email-match checks. Admin reads and sets or clears Verified by Admin on `/api/players/[playerId]/verification`. Each change records its reason and increments the player revision. Migration `20261118000300_player_verification_override` applied and verified on isolated local Supabase and ROTRA v2 ASIA (`xvsgwgihgbuqkcazikek`), with matching Prisma migration history. Required reason, cross-app persistence, stale/concurrent edits, private access and audit records checked; Google OAuth remains #922. | #889, #915 |
| RTR ID lookup (`/find/[rtrId]`) | implemented | `player/fetchers.ts:39` → `real/player.ts:122` → `api/rtr-ids/[rtrId]` | #400 closed |
| Framed profile card (`/card/[rtrId]`) and leaderboard name search by address (`/?q=`) | implemented, for rotra.club's Find your profile | `app/card/[rtrId]` (same reads as the profile page; only rotra.club may frame it, `next.config.ts`) | none |
| Games / history | implemented | `player/fetchers.ts` → `real/player.ts` → `api/players/[playerId]/games` → `db/src/player/projections.ts`. Each game carries the faces on its court (`partnerPlayers` / `opponentPlayers`: name, picture, player ID; a guest has no picture or player ID; an always-private player's name is masked, the picture stays), #830 | #400 closed, #830 |
| Player Compare | implemented in source; SQL draft | `player-compare/usePlayerCompare` → signed-in `api/players/[playerId]/compare` → `db/src/player/compare.ts` → `rotra_player_compare`; mock fixtures and screen landed, SQL-only migration still needs human sign-off/runtime EXECUTE grant, local and hosted verification pending | #525, #526, #541; D-2026-11-08-02 |
| Player rank page | partially connected | `api/players/[playerId]/rank` → `projections.ts`; rank always null / `formula_pending` | #247 open |
| Leaderboard (page, search, my position) | partially connected | `real/leaderboard.ts` → `api/leaderboard/{,search,me}` → `db/src/player/leaderboard.ts`; top 50 and movement computed from valid match facts, with the private cutoff for the signed-in player | #918, batch verification pending |
| Own profile read/edit, phone privacy, contact-change submit | implemented | `api/me/{account,profile,phone-privacy}`, `api/account/contact-change` → `db/src/player/{profile,contact-change}.ts`; a real player session now exists (#483). Admin approval side: [admin.md](admin.md) | #400 closed; #483 |
| Clubs card, Join club, Leave club | implemented in source (F07.64, #766); not run against a database | `player-club/fetchers.ts` (`getPlayerClubs`) → `real/player-club.ts` → `api/me/clubs` (GET, POST; the owner's read) and `api/me/clubs/[clubId]` (DELETE) → `db/src/player/my-clubs.ts`; another player's clubs → `api/players/[playerId]/clubs` (public, no joined-via) → `db/src/player/player-clubs.ts`. Leave club is on the club page hero (`viewerIsMember` on the club page read). Leave club sets `club_players.removed_at` and keeps the row (owner decision); Join club creates the row or clears `removed_at`. `club_players.joined_via` is not migrated (D-2026-11-09-06), so a club-link join reads as "Added by the club"; a confirmed join request reads as "Joined via session link" | F07.64 |
| My sessions, share-card results | implemented in source (F07.65); not run against a database | `player/mySessions.ts` → `real/my-sessions.ts` → `api/me/sessions` → `db/src/player/my-sessions.ts` (open sessions from roster, waitlist and pending requests; finished from saved history). `player/shareData.ts` → `api/me/sessions/[sessionId]/share` (the people on the player's own games, before or after publication, D-2026-11-13-06, #830; position only from the published snapshot once the standings are shared; guests masked with no picture; always-private players masked, picture kept) | F07.65 |
| Google sign-in (flag `player_google_sign_in`, off) | written, not run against Google (#922; pending #896; migration `20261118000200_player_google_sign_in` applied to the shared database November 20, 2026) | `api/auth/google/{start,callback,outcome,link}`, `api/register/[clubId]/google`, `api/register/google` (Admin link), `api/claim/[token]/google`, `api/invites/[clubId]` (names the inviter from `&invite=`) → `db/src/player/google-sign-in.ts`, `db/src/auth/google-oauth.ts`, `db/src/player/invite-landing.ts`; deadline gate in `proxy.ts` and `db/src/service/handler.ts`. Admin link and inviter added November 20, 2026 ([D-2026-11-20-01](../decisions/2026-11-20.md#d-2026-11-20-01)); migration `20261120000100_admin_link_registration` written, not applied (apply before deploying). [Setup](../../backend/google-sign-in-setup.md) | #892, #922 |
| Sign-in (email + password only) | implemented | `auth/fetchers.ts:33` → `real/player.ts:26` → `api/auth/sign-in` → `db/src/auth/sign-in.ts` (`SignInAudience` includes `player`). Phone sign-in withdrawn 2026-11-08 | #483 |
| Session read / proxy guard | implemented | `auth/fetchers.ts:27` → `real/player.ts:23` → `api/auth/session` → `handleSessionRead('player')`; `apps/player/src/proxy.ts` | #483 |
| Logout | implemented | `auth/fetchers.ts:71` → `real/player.ts:32` → `api/auth/sign-out` → `handleSignOut('player')` | #483 |
| Registration / account claim (`/claim/[token]`) | implemented | `player-account/fetchers.ts:89,174` → `real/player.ts:39,47` → `api/claim/[token]` GET/POST → `db/src/player/{claim,account-access}.ts` (`readClaimLink`, `registerFromClaim`); prefilled from the club, phone typable when none on file (#484). The "processing" re-check (`checkClaimStatus`, `player-account/fetchers.ts:211`) is mock only | #483, #484 |
| Claim-link issuance — Queue (Saved players › Invite) | implemented | `club-player/fetchers.ts:165` → `real/queue.ts:550` → Queue `api/club/players/[clubPlayerId]/registration-link` → `db/src/player/claim.ts:44`; 7 days (`CLAIM_LINK_DAYS = 7`), a new link cancels the previous one (#485); since November 18, 2026 a guest gets the same kind of link for their own record ([D-2026-11-18-07](../decisions/2026-11-18.md#d-2026-11-18-07), written, not run against a database yet; before: independent registration at `/register/[clubId]`, #490) | #483, #485 |
| Claim-link issuance — Admin | not implemented | `admin-player/mutations.ts:229` `issueRegistrationLink` mock only | none found |
| Forgot Password screen | implemented in #491; schema applied | `/api/auth/password-reset` saves an Admin review request; no automatic email | #491 |
| Reset password (`/reset-password/[token]`) | implemented in #491; schema applied | Reviewed digest + provider expiry/single use, mapped player check, new password chosen by player | #491 |
| Guest registration (without an existing-profile claim link) | implemented | `/register/[clubId]` → `useGuestRegistration` → `/api/register/[clubId]` → `db/src/player/guest-registration.ts`; the Admin link `/register` → `/api/register` (no club: the picked city gives the RTR ID its place, no club joined; written November 20, 2026, [D-2026-11-20-01](../decisions/2026-11-20.md#d-2026-11-20-01), needs migration `20261120000100_admin_link_registration`); unique contacts, recoverable claim staging, no guest linkage. Once the account exists the new player is saved to the originating club (`addPlayerToClub` in `my-clubs.ts`, D-2026-11-09-06, #707); a failed join does not fail the registration. Local database + simulated-provider flow verified; production provider not exercised | #490, #707 |
| Club invite code (`/register/[clubId]?k=<code>`) | implemented in source (P08.7, #755; not run against a database) | One `clubs.invite_code` column, every club backfilled in `20261112000100`; the server checks `k` and Regenerate link replaces it; a plain link without a valid code is refused ([D-2026-11-12-01](../decisions/2026-11-12.md#d-2026-11-12-01)). Open: the public club page's Join button sends the current code to anyone who opens the page | #707, #712, #755 |
| Profile visibility (Public · Private · Always private), Hide me from Player Information, profile banners | implemented in source (P08.5, P08.6; #753, #754) | `players.profile_visibility`, `hidden_from_directory`, `banner_id`; the hide flag applies to Queue Add player › Player Information and RTR ID search only; an always-private leaderboard row keeps position, picture and banner and hides the level; banner default = first shown banner; the banner dialog cannot show a banner Admin later hid ([D-2026-11-12-01](../decisions/2026-11-12.md#d-2026-11-12-01)); the banner is 5:2 with nothing over it, picked in a dialog from the banner pencil ([D-2026-11-12-03](../decisions/2026-11-12.md#d-2026-11-12-03)) | #715, #753, #754, #765 |

## Remaining work

- [x] Player sign-in / sign-out / session Route Handlers (#483).
- [x] Claim Route Handlers; 7 days; reissue cancels the previous link (#483, #485).
- [x] Queue claim-link issuance (#483).
- [ ] Admin claim-link issuance in real mode. Ticket: needed if Admin issuance is MVP (open question 9).
- [ ] Admin-reviewed password recovery (#491) is verified with the hosted provider (schema applied after sign-off).
- [ ] Attach a signed-in player to a join request; player sign-up (D-07). Ticket: needed.
- [ ] Implement skill-rating constants from #247. Ticket: #247.

## Related decisions

- [D-2026-11-07-01](../decisions/2026-11-07.md#d-2026-11-07-01) — manual password recovery.
- [D-2026-11-07-03](../decisions/2026-11-07.md#d-2026-11-07-03) — guest identity reconciliation.
- [D-2026-11-11-03](../decisions/2026-11-11.md#d-2026-11-11-03) — guests and unclaimed profiles stay in their club; RTR ID on registration; built in P08.9 (#757). Superseded in part by D-2026-11-16-04.
- [D-2026-11-16-04](../decisions/2026-11-16.md#d-2026-11-16-04) — four player statuses; an unclaimed player needs an email, gets an RTR ID when saved and is found by other clubs by exact RTR ID or email; mockups, components and mock data built (#923); real mode built in P15.8 (#927): registration keeps the RTR ID and joins every club record by the ROTRA or Google email, phone linking stays; migration `20261118000500_shared_player_entries` written and applied locally, not yet to the shared database; not run against Supabase Auth or in a browser.
- [D-2026-11-17-01](../decisions/2026-11-17.md#d-2026-11-17-01) — Privacy Policy (`/privacy`) and Terms of Service (`/terms`) pages, public and static; built in the mockup and apps/player together; legal review and details open.
- [D-2026-11-12-01](../decisions/2026-11-12.md#d-2026-11-12-01) — answers to the leftover questions of the November 11 round.
- [D-2026-11-07-07](../decisions/2026-11-07.md#d-2026-11-07-07) — original login-only invite superseded by independent guest registration in #490.
- [D-2026-11-07-04](../decisions/2026-11-07.md#d-2026-11-07-04) — scope freeze.
- [D-2026-11-19-10](../decisions/2026-11-19.md#d-2026-11-19-10) — Home for signed-in players (current session, upcoming sessions, clubs, stats).
- [D-2026-11-19-11](../decisions/2026-11-19.md#d-2026-11-19-11) — fullscreen onboarding after an invite link; where you play, shots, favorite player.
- [D-2026-11-19-13](../decisions/2026-11-19.md#d-2026-11-19-13) — bottom dock on phones; the logo is Home.
- [D-2026-11-19-14](../decisions/2026-11-19.md#d-2026-11-19-14) — Higgsfield art inside the apps (sign-in, onboarding).
- [D-2026-11-20-01](../decisions/2026-11-20.md#d-2026-11-20-01) — Google sign-in in real mode: registration from the Admin link (picked city, no club), the inviting player on a session invite, one accepted risk; migration `20261120000100_admin_link_registration` written, not applied.
- [D-2026-11-22-01](../decisions/2026-11-22.md#d-2026-11-22-01) — trusted club hosts: a **Host** badge in the profile Clubs section (built in #1007: mock and real mode, `isHost` on the Clubs read).

## Blocking open decisions

- #244 (email verification on claim, password policy, contact-change enforcement, mistaken guest links); hosted provider handoff verification for #491.
- #247 skill-rating math.
- [Business open decisions](../../business_logic/product/open-decisions.md) · [database open decisions](../../database_design/product/open-decisions.md) · [screen open decisions](../../screens/product/open-decisions.md).
- Hub open questions 8, 9, 12, 14.

## Exit criteria

**Proposed — owner to confirm.**

- [ ] In real mode, a player can claim an account, sign in, sign out, and read and edit their own profile.
- [ ] Public profile, RTR ID lookup and history work for visitors.
- [ ] Admin-reviewed password recovery (#491) is verified with the hosted provider (schema applied after sign-off).
- [ ] Verify the three period leaderboards and their profile places against D-2026-11-16-05.
