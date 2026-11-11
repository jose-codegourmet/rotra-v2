# Workstream — Queue core

**Last verified:** 2026-11-08 (code trace of `main` @ `aca899f2`; traced, not run) · [MVP hub](../README.md)

Path traced: UI route in `apps/queue/src/app/(operator|auth|public)` → `packages/data/src/<domain>`
fetcher (real branch) → `packages/data/src/real/*.ts` → `apps/queue/src/app/api/**/route.ts` →
`packages/db/src/queue/*.ts`. Paths below are shortened (`real/` = `packages/data/src/real/`,
`api/` = `apps/queue/src/app/api/`, `db/` = `packages/db/`).

## Goal

A club operator can sign in, prepare a badminton session, manage players and courts, queue and score
matches, finish the session, and retain results.

## In scope

Club sign-in and club details; sessions (create, edit, start, end, extend, cancel, delete); courts;
roster, saved players, waitlist, join requests; cost, payments, inventory; match queue, Generate matches,
court filling, match control, results and substitution; Session done, finalization, results and public
session page; the November 6 prototype changes (epic #408).

## Out of scope / deferred

- Offline operation → [queue-offline.md](queue-offline.md).
- Ranking, awards and generation math → [ranking.md](ranking.md) (#247).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Club sign-in / session / sign-out | implemented | `(auth)/login/page.tsx` → `real/queue.ts:30-39` → `api/auth/{sign-in,session,sign-out}` → `db/src/auth/sign-in.ts` | #8 closed; #381, #382 open |
| Club password change | not implemented | `data/src/club/settings.ts:97` mock only | Ticket: needed |
| Club details: logo, venues, license read | implemented | `real/queue.ts:89-171` → `api/{club,venues,license}` → `db/src/admin/{club-logo,clubs,licenses}.ts` | #8 closed |
| Club name-change request, session defaults | not implemented | `data/src/club/settings.ts` `requestClubNameChange`, `updateSessionDefaults` mock only; `club/fetchers.ts:400` mock only | Ticket: needed |
| Facebook post template (save, reset to default) | implemented | `club/settings.ts` `saveFacebookPost`/`resetFacebookPostTemplate` → `real/queue.ts:135` → `api/club` PATCH | #473 |
| Copy Facebook post | implemented | `club/settings.ts:135,144` → `real/facebook-post.ts` (saved template + current roster, read fresh from the Route Handlers) | #473 |
| Session list / home / calendar | implemented | `queue-session/fetchers.ts:45` → `real/queue.ts:330` → `api/sessions` GET | #8, #9 closed |
| Session create / edit setup | implemented | `queue-session/mutations.ts:109,183` → `api/sessions` POST, `api/sessions/[sessionId]` PATCH | #9, #432 closed |
| Start session (incl. late start) | implemented | `real/session-live.ts:29` → `api/.../start` | #429, #436 closed |
| Set end / extend / end session | implemented | `real/session-live.ts:211,221` → `api/.../end`, `.../extend` | #429 closed |
| Cancel / delete session | implemented | `real/session-live.ts:71,80` → `api/.../cancel`, DELETE → `db/src/queue/session-{cancel,delete}.ts` | #420, #423, #431 closed |
| Courts: add/edit/remove, open early, undo | implemented | `real/session-live.ts:126-202` → `api/.../courts/**` | #424, #436 closed |
| Roster: add, remove, level, presence | implemented | `real/queue.ts:416-567`, `real/session-live.ts:232-269` → `api/.../roster/**`, `.../presence` | #10 open (no open sub-issues); #421, #426 closed |
| Saved players (no session) | implemented | `club-player/mutations.ts:93,120` → `api/club/players` POST | #330 |
| Edit details (guests, unclaimed profiles) | implemented | `api/club/players/[clubPlayerId]` GET/PATCH → `db/src/queue/club-player-details.ts:68,98`; Level for this club is not saved here yet | #484, #486 |
| Delete a saved player (D-DELETE-PLAYER) | implemented | `club-player/delete.ts:13,36` → `real/queue.ts:564,570` → `api/club/players/[clubPlayerId]/delete-impact`, DELETE → `db/src/queue/club-player-delete.ts:57,76` (soft delete, `club_players.removed_at` migration) | #487 |
| Invite / registration link | implemented | `club-player/fetchers.ts:165` → `real/queue.ts:550` → `api/club/players/[clubPlayerId]/registration-link` → `db/src/player/claim.ts:44`; unclaimed: 7-day single-use link, a new one cancels the previous one; guests: independent Player registration, no guest linkage (#490) | #478, #483, #485 |
| Waitlist: give slot, fill, remove | implemented | `real/session-live.ts:277-293` → `api/.../waitlist/**` | #10 open |
| Join requests (submit, confirm, decline) | implemented | `real/public-session.ts:19-49`; `real/session-live.ts:309,326` → `api/join-requests/[id]/{confirm,decline}` | #16 closed; #248 open |
| Cost estimate, payments, mark all paid | implemented | `real/financials.ts` → `db/src/queue/financials.ts` | #17 closed; #245 open |
| Payment amounts (Paid, Partial, Reimburse, Unpaid) | implemented | `session-payment/fetchers.ts:116` → `api/sessions/[sessionId]/payments/amount`; [D-05](../decisions.md#d-2026-11-07-05) | #479 |
| Inventory | implemented | `real/queue.ts:210-250` → `api/inventory/**` | #17 closed |
| Match queue: add, make, reorder, edit, swap, remove, regenerate | implemented | `real/match.ts:164-318` → `api/.../matches/**` → `db/src/queue/match-queue.ts` | #12 open (no open sub-issues) |
| Generate matches drafts | partially connected | `real/autoQueue.ts:16-25`: drafts in module memory (lost on reload); only "Add to Main Queue" writes | #247 open |
| Court filling Manual / Auto | implemented | `real/match.ts:657,674` → `api/.../court-fill` | #433, #437 closed |
| Match control: On court, start, send back, move, replace, swap | implemented | `real/match.ts:341-456` → `api/.../matches/[id]/{place,start,send-back,move,replace,swap}` | #13 closed; #422, #427, #430, #434 closed |
| Results: complete, invalidate, substitution credit | implemented | `real/match.ts:479-523` → `.../result`, `.../invalid`, `.../substitution` | #428, #435 closed |
| Live standings | implemented | `real/match.ts:156` | #13 closed |
| Session done review | implemented | `real/finalization.ts:37` → `api/.../done-review` → `db/src/queue/finalization.ts:104` | #14, #438 closed |
| Finalization, status, invalid session | implemented | `real/finalization.ts:99,109`, `real/match.ts:632` → `finalization.ts:306,420,474` | #14 closed; #243 open |
| Results view, publish/unpublish | implemented | `real/match.ts:572-603` → `db/src/queue/results.ts:103,152` | #15 closed |
| Download result images | partially connected | Client-side frames only; `requestResultExport`/`markExportRendered` (`results.ts:248,305`) have no route | none found |
| Public session page `/s/[slug]` | implemented | `(public)/s/[slug]/page.tsx` → `real/public-session.ts`; masked names and aggregate skill mix ([D-06](../decisions.md#d-2026-11-07-06)); preview operator-only (#469); Request to join offers guest form or ROTRA Player login ([D-07](../decisions.md#d-2026-11-07-07)) | #16 closed; #469, #474, #475, #476 |

Notes: the session done review has no guest step (see [queue-offline.md](queue-offline.md)); the rank
job records evidence only until #247; payment rules are still an open decision (#245).

### November 6 changes (epic #408, Q12)

Epic #408 is **open**; all 30 sub-issues are **closed**, each with code on `main` (commits
`7953432b`..`ea7c370e`, PRs #440–#463).

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Schema/types: On court, credit, court fill mode, Cancelled, planned start | implemented | migration `20261106000100_on_court_credit_cancel_court_fill`; `7953432b` | #409 |
| DateTimePicker, day-aware labels, setup/court pickers | implemented | `80304ff5`, `05d3de48`, `abd525f0` (#455) | #410, #411, #432 |
| CourtDrawing badges, queue tiles + wait timers | implemented | `e275c8ad`, `43d833f9` | #412, #413 |
| CourtCard states, fill switch, short-on-players banner | implemented | `79aaf560`, `3d846050` (#461) | #414, #437 |
| OnCourtSheet / SwapMatchSheet; On court step | implemented | `af293f88`, `389a2202`, `190e43b2` (#457) | #415, #422, #430 |
| Send back / Move / Replace / Swap with queue | implemented | `bfa82396`, `fea9c890` (#460) | #427, #434 |
| Substitution game credit | implemented | `ffd6d247`, `b8604c32`, `e2fc5998` (#453) | #416, #428, #435 |
| Roster level tabs, Group by, List/Grid; returning flag | implemented | `57ccbeeb`, `49e6a143` (#454), `6a2f1780` | #417, #421, #426 |
| Cancelled sessions (sheet, calendar, record, public page) | implemented | `8f9b8d63`, `2b7603f9`, `2795ffe7` (#456) | #418, #423, #431 |
| Rename Auto Queue → Generate matches | implemented | `3d7b1d53` (#440) | #419 |
| Delete session in real mode | implemented | `a95d1dca` (#442) | #420 |
| Full-instant times; set end; late start; overdue reminder | implemented | `e2a78efc`, `beca60c9`, `755d57f7`, `63a3e37c` (#459) | #424, #425, #429, #436 |
| Auto queue court filling | implemented | `ea7c370e` | #433 |
| Session done drops On court; offline/permission states | implemented | `3dfc3628` (#462) | #438 |
| Time fields: hour, minute and AM/PM dropdowns (2026-11-08) | implemented | `aca899f2` (#489) | — |

### November 9–10 changes (epic #586, Q18)

Mock app only. Real mode does not read or decide requests, and does not persist `requestFormats` (no
Prisma column); the Checked in themselves mark has no server clearing rules yet.

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Requests · N with Join and Match tabs; Add to queue / Decline; drop-out notices; ROTRA-player join cards | implemented (mock app only) | commit `e64678bf` | #616 |
| Checked in themselves / Left mark on roster rows, cards and live Players cards | implemented (mock app only) | commit `d7c92168` | #617 |
| Request formats per session (default option A), `requestFormats` | implemented (mock app only) | commit `3abfba67`; defaults decided 2026-11-10 ([D-2026-11-09-11](../decisions.md#d-2026-11-09-11)) | #618 |
| Games played override (Set games played, one player or all; `session_players.games_adjustment`) | in progress (mock app + real-mode services; migration `20261111000300_roster_games_adjustment` drafted, **pending**, not applied) | [mockup log](../../mockup-changes/2026-11-11-queue-set-games-played.md) | #717 |
| Join request: Join a slot / Be waitlisted choice, full-slots rule before start, Join from waitlist (`placement`) | in progress (mock app + real-mode services; migration `20261111000200` applied 2026-11-11) | [D-2026-11-11-02](../decisions.md#d-2026-11-11-02); [mockup log](../../mockup-changes/2026-11-11-queue-join-request-slot-or-waitlist.md) | #706 |

### Obvious Queue bugs (#466, 2026-11-07)

From the former MVP roadmap item 5 (main @ `66617c60`). **Implemented:** debounced inventory stock,
prompt confirm/remove player, Facebook post from the saved template (real mode), preparation tabs in
the URL, invite link + session QR, skill mix bar (roster and public, aggregate only), masked public
names, operator-only preview, guest/ROTRA Player choice on Request to join, guest Invite to ROTRA,
payment amounts with Partial/Reimburse (PRs #467–#481). **Still open:** Downloads / This device
([#477](https://github.com/jose-codegourmet/rotra-v2/issues/477), blocked on #246); attaching a
signed-in player to a join request; guest registration now exists through club invitations (#490);
whether published results and profile pictures on the public page should also be masked.
Decisions: [D-05](../decisions.md#d-2026-11-07-05), [D-06](../decisions.md#d-2026-11-07-06),
[D-07](../decisions.md#d-2026-11-07-07), [D-2026-11-11-03](../decisions.md#d-2026-11-11-03) (guests and unclaimed profiles stay in their club).

## Remaining work

- [ ] Club settings in real mode: name-change request, session defaults, password change. Ticket: needed (MVP scope: open question 3).
- [ ] Downloads / This device page. #477 (blocked on #246).
- [x] Attach a signed-in player to a join request (real mode, #687: one-tap join and Cancel request through the Player app). Player sign-up (D-07): guest registration through club invitations (#490).
- [ ] Decide whether published results and profile pictures on the public page are masked too (D-06 "not covered yet"). Owner decision.
- [ ] Generate matches drafts survive reload (or accept device memory) and final weights. #247 (decision); implementation Ticket: needed.
- [ ] Server result-image export: wire or drop `requestResultExport`. Ticket: needed (or owner rules it out).
- [ ] Close or re-scope epics #408, #10, #11, #12 (all sub-issues closed). Ticket: none (housekeeping; owner to confirm).

## Related decisions

- [D-2026-11-07-03](../decisions.md#d-2026-11-07-03) — setup and start online only (matches current real mode).
- [D-2026-11-07-04](../decisions.md#d-2026-11-07-04) — scope freeze.
- [D-2026-11-07-05](../decisions.md#d-2026-11-07-05) — payment amounts.
- [D-2026-11-07-06](../decisions.md#d-2026-11-07-06) — masked public names.
- [D-2026-11-07-07](../decisions.md#d-2026-11-07-07) — guest invites now open registration (#490); Request to join still offers guest entry or login.

## Blocking open decisions

- #247 queue-generation math; #381 club username identity; #245 roster/payments storage; #248 public projections.
- [Business open decisions](../../business_logic/product/open-decisions.md) · [database open decisions](../../database_design/product/open-decisions.md) · [screen open decisions](../../screens/product/open-decisions.md).
- Hub open questions 2, 3, 4, 7.

## Exit criteria

**Proposed — owner to confirm.**

- [ ] In real mode, a club operator can sign in, prepare a session, manage players and courts, queue and score matches, finish the session, and results are retained.
- [ ] Every Queue capability the owner keeps in MVP scope is `implemented` (none falls to the mock in real mode).
- [ ] Every item above has a ticket or an owner ruling.
