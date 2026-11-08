# Workstream — Player access & Player Information

**Last verified:** 2026-11-08 (code trace of `main` @ `aca899f2`; traced, not run) · [MVP hub](../README.md)

Paths: `real/` = `packages/data/src/real/`, `api/` = `apps/player/src/app/api/`, `db/` = `packages/db/`.
"Mock only" = in real mode the screen shows "This part of ROTRA isn't connected to saved data yet."

## Goal

Player Information exposes identities/history. Players can sign in, claim their account and recover
access. Recovery: [D-2026-11-07-01](../decisions.md#d-2026-11-07-01) (manual) is approved, while `main`
ships Supabase email password reset (#483); the owner has to say which one MVP keeps (hub open question 8).

## In scope

Public profile, RTR ID lookup, games/history, rank page and leaderboard reads; own profile, phone
privacy, contact-change submit; player sign-in (email + password only since 2026-11-08), sign-out, session; registration/account claim;
password recovery (D-01 manual reset link, or the email reset shipped in #483: open question 8).

## Out of scope / deferred

- Automated recovery emails, player-submitted reset requests, a recovery notification inbox, club-owner password resets (D-01). `main` nevertheless ships an automated Supabase recovery email since #483; open question 8.
- Meaningful rank and leaderboard values until #247 ([ranking.md](ranking.md)).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Public profile | implemented | `(public)/players/[playerId]/page.tsx` → `player/fetchers.ts:51` → `real/player.ts:96` → `api/players/[playerId]`; pages load in real mode since #488 (public `api/ranking-settings` → `db/src/player/ranking-settings.ts`; no rank row reads as "no rank yet") | #400 closed; #488 |
| RTR ID lookup (`/find/[rtrId]`) | implemented | `player/fetchers.ts:39` → `real/player.ts:122` → `api/rtr-ids/[rtrId]` | #400 closed |
| Games / history | implemented | `player/fetchers.ts:31` → `real/player.ts:114` → `api/players/[playerId]/games` → `db/src/player/projections.ts` | #400 closed |
| Player rank page | partially connected | `api/players/[playerId]/rank` → `projections.ts`; rank always null / `formula_pending` | #247 open |
| Leaderboard (page, search, my position) | partially connected | `real/leaderboard.ts` → `api/leaderboard/{,search,me}` → `db/src/player/leaderboard.ts`; eligibility always `false` (`projections.ts`) so the list is empty | #247 open |
| Own profile read/edit, phone privacy, contact-change submit | implemented | `api/me/{account,profile,phone-privacy}`, `api/account/contact-change` → `db/src/player/{profile,contact-change}.ts`; a real player session now exists (#483). Admin approval side: [admin.md](admin.md) | #400 closed; #483 |
| Sign-in (email + password only) | implemented | `auth/fetchers.ts:33` → `real/player.ts:26` → `api/auth/sign-in` → `db/src/auth/sign-in.ts` (`SignInAudience` includes `player`). Phone sign-in withdrawn 2026-11-08 | #483 |
| Session read / proxy guard | implemented | `auth/fetchers.ts:27` → `real/player.ts:23` → `api/auth/session` → `handleSessionRead('player')`; `apps/player/src/proxy.ts` | #483 |
| Logout | implemented | `auth/fetchers.ts:71` → `real/player.ts:32` → `api/auth/sign-out` → `handleSignOut('player')` | #483 |
| Registration / account claim (`/claim/[token]`) | implemented | `player-account/fetchers.ts:89,174` → `real/player.ts:39,47` → `api/claim/[token]` GET/POST → `db/src/player/{claim,account-access}.ts` (`readClaimLink`, `registerFromClaim`); prefilled from the club, phone typable when none on file (#484). The "processing" re-check (`checkClaimStatus`, `player-account/fetchers.ts:211`) is mock only | #483, #484 |
| Claim-link issuance — Queue (Saved players › Invite) | implemented | `club-player/fetchers.ts:165` → `real/queue.ts:550` → Queue `api/club/players/[clubPlayerId]/registration-link` → `db/src/player/claim.ts:44`; 7 days (`CLAIM_LINK_DAYS = 7`), a new link cancels the previous one (#485); guests get the Player login link (D-07) | #483, #485 |
| Claim-link issuance — Admin | not implemented | `admin-player/mutations.ts:229` `issueRegistrationLink` mock only | none found |
| Forgot Password screen | implemented as email reset (vs D-01) | `ForgotPassword.tsx` → `player-account/fetchers.ts:44` → `real/player.ts:81` → `api/auth/password-reset` → `db/src/player/account-access.ts:102` (Supabase `resetPasswordForEmail`). D-01's support-directed screen is not built | #483; D-01 open question 8 |
| Reset password (`/reset-password/[token]`) | implemented (email recovery token) | `player-account/fetchers.ts:65` → `real/player.ts:87` → `api/auth/reset-password` → `account-access.ts:127` (`verifyOtp` recovery, `updateUser`). No Admin-issued reset link (D-01) | #483; D-01 |
| Player sign-up (without a claim link) | not implemented | Sign-up shows as not open yet; invite links use player login until it exists ([D-07](../decisions.md#d-2026-11-07-07)) | none found |

## Remaining work

- [x] Player sign-in / sign-out / session Route Handlers (#483).
- [x] Claim Route Handlers; 7 days; reissue cancels the previous link (#483, #485).
- [x] Queue claim-link issuance (#483).
- [ ] Admin claim-link issuance in real mode. Ticket: needed if Admin issuance is MVP (open question 9).
- [ ] Recovery: owner to confirm whether the shipped email reset (#483) supersedes D-01; if D-01 stands, P-FORGOT → support-directed screen (mockup first, AGENTS §15) and an Admin-issued reset link. Ticket: needed once decided (open question 8).
- [ ] Attach a signed-in player to a join request; player sign-up (D-07). Ticket: needed.
- [ ] Rank and leaderboard become meaningful after #247. Ticket: #247.

## Related decisions

- [D-2026-11-07-01](../decisions.md#d-2026-11-07-01) — manual password recovery.
- [D-2026-11-07-03](../decisions.md#d-2026-11-07-03) — guest identity reconciliation.
- [D-2026-11-07-07](../decisions.md#d-2026-11-07-07) — invite links use player login until sign-up exists.
- [D-2026-11-07-04](../decisions.md#d-2026-11-07-04) — scope freeze.

## Blocking open decisions

- #244 (email verification on claim, password policy, contact-change enforcement, mistaken guest links); D-01 vs the email reset shipped in #483 (open question 8).
- #247 ranking math (rank, leaderboard).
- [Business open decisions](../../business_logic/product/open-decisions.md) · [database open decisions](../../database_design/product/open-decisions.md) · [screen open decisions](../../screens/product/open-decisions.md).
- Hub open questions 8, 9, 12, 14.

## Exit criteria

**Proposed — owner to confirm.**

- [ ] In real mode, a player can claim an account, sign in, sign out, and read and edit their own profile.
- [ ] Public profile, RTR ID lookup and history work for visitors.
- [ ] Password recovery works per the owner's ruling on D-01 vs the #483 email reset (open question 8).
- [ ] Rank and leaderboard behaviour matches the owner's ruling (open question 12).
