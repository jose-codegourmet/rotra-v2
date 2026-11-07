# Workstream — Player access & Player Information

**Last verified:** 2026-11-07 (code audit of `main` @ `51abb94f`; traced, not run) · [MVP hub](../README.md)

Paths: `real/` = `packages/data/src/real/`, `api/` = `apps/player/src/app/api/`, `db/` = `packages/db/`.
"Mock only" = in real mode the screen shows "This part of ROTRA isn't connected to saved data yet."

## Goal

Player Information exposes identities/history. Players can sign in, claim their account and recover
access per [D-2026-11-07-01](../decisions.md#d-2026-11-07-01).

## In scope

Public profile, RTR ID lookup, games/history, rank page and leaderboard reads; own profile, phone
privacy, contact-change submit; player sign-in, sign-out, session; registration/account claim;
Forgot Password directing to support and the Admin-issued reset link (D-01).

## Out of scope / deferred

- Automated recovery emails, player-submitted reset requests, a recovery notification inbox, club-owner password resets (D-01).
- Meaningful rank and leaderboard values until #247 ([ranking.md](ranking.md)).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Public profile | implemented | `(public)/players/[playerId]/page.tsx` → `player/fetchers.ts:51` → `real/player.ts:18` → `api/players/[playerId]` | #400 closed |
| RTR ID lookup (`/find/[rtrId]`) | implemented | `player/fetchers.ts:39` → `real/player.ts:44` → `api/rtr-ids/[rtrId]` | #400 closed |
| Games / history | implemented | `player/fetchers.ts:31` → `real/player.ts:36` → `api/players/[playerId]/games` → `db/src/player/projections.ts:477` | #400 closed |
| Player rank page | partially connected | `api/players/[playerId]/rank` → `projections.ts:538`; rank always null / `formula_pending` | #247 open |
| Leaderboard (page, search, my position) | partially connected | `real/leaderboard.ts` → `api/leaderboard/{,search,me}` → `db/src/player/leaderboard.ts:68,84,107`; eligibility always `false` (`projections.ts:105`) so the list is empty | #247 open |
| Own profile read/edit, phone privacy, contact-change submit | partially connected | `api/me/{account,profile,phone-privacy}`, `api/account/contact-change` → `db/src/player/{profile,contact-change}.ts`; no player session can be created | #400 closed |
| Sign-in (phone or email + password) | not implemented | `auth/fetchers.ts:31` real branch only for `club`; `SignInAudience = 'club' \| 'admin'` (`db/src/auth/sign-in.ts:9`); no `api/auth/*` | #244 open |
| Session read / proxy guard | partially connected | `apps/player/src/proxy.ts` real; client `getSession('player')` (`auth/fetchers.ts:25-27`) reads the mock cookie | #244 |
| Logout | not implemented | `auth/fetchers.ts:71-78` real branch only for `club`; no player sign-out route | Ticket: needed |
| Registration / account claim (`/claim/[token]`) | not implemented | UI → `player-account/fetchers.ts:80,156,193` mock only; `db/src/player/claim.ts:36,91,123` have no Route Handler; `CLAIM_LINK_DAYS = 14` (`claim.ts:11`) vs decided 7 | #244 open |
| Claim-link issuance (club invite / Admin registration link) | not implemented | Queue `club-player/fetchers.ts:159`, Admin `admin-player/mutations.ts:229` mock only | #244 open |
| Forgot Password screen | not implemented (vs D-01) | `ForgotPassword.tsx` renders an email form → `requestPasswordReset` (`player-account/fetchers.ts:39`) mock only | Ticket: needed (D-01) |
| Reset password (`/reset-password/[token]`) | not implemented | `player-account/fetchers.ts:49,57` mock only; no route or reset-link model | Ticket: needed (D-01) |

## Remaining work

- [ ] Player sign-in / sign-out / session Route Handlers per #244 L1–L3, plus client `getSession`/`signOut('player')` real branches. Ticket: needed (#244 is a decision ticket).
- [ ] Claim Route Handlers over `db/src/player/claim.ts`; 14 → 7 days; reissue revokes; collision block (#244 L5–L7). Ticket: needed.
- [ ] Club / Admin claim-link issuance routes. Ticket: needed (who issues: open question 9).
- [ ] P-FORGOT → support-directed screen (mockup first, AGENTS §15) and P-RESET backed by the Admin-issued link (D-01). Ticket: needed.
- [ ] Rank and leaderboard become meaningful after #247. Ticket: #247.

## Related decisions

- [D-2026-11-07-01](../decisions.md#d-2026-11-07-01) — manual password recovery.
- [D-2026-11-07-03](../decisions.md#d-2026-11-07-03) — guest identity reconciliation.
- [D-2026-11-07-04](../decisions.md#d-2026-11-07-04) — scope freeze.

## Blocking open decisions

- #244 (email verification on claim, password policy, contact-change enforcement, mistaken guest links); D-01 vs #244 L2 "recovery by email only" (open question 8).
- #247 ranking math (rank, leaderboard).
- [Business open decisions](../../business_logic/product/open-decisions.md) · [database open decisions](../../database_design/product/open-decisions.md) · [screen open decisions](../../screens/product/open-decisions.md).
- Hub open questions 8, 9, 12, 14.

## Exit criteria

**Proposed — owner to confirm.**

- [ ] In real mode, a player can claim an account, sign in, sign out, and read and edit their own profile.
- [ ] Public profile, RTR ID lookup and history work for visitors.
- [ ] Forgot Password directs to support and the Admin-issued reset link works per D-01.
- [ ] Rank and leaderboard behaviour matches the owner's ruling (open question 12).
