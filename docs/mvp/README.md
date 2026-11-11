# ROTRA MVP

**Last verified:** 2026-11-12 (round-2 status lines; code trace of `main` @ `aca899f2` for the rest) · **Audience:** contributors and AI agents.

**Purpose:** quick orientation on MVP scope, status and decisions. GitHub issues are the implementation
tracker; this folder summarizes scope and status, it does not replace tickets. Product rules stay in
[business logic](../business_logic/product/README.md) and the `open-decisions.md` files remain
authoritative for their domains. Check `main` and linked issues before assuming a feature is missing.

`#n` means issue or PR `n` in [jose-codegourmet/rotra-v2](https://github.com/jose-codegourmet/rotra-v2/issues).

| Page | What it holds |
|---|---|
| [decisions.md](decisions.md) | MVP decision register (D-ids), status conventions, entry template |
| [workstreams/queue.md](workstreams/queue.md) | Queue core, incl. the November 6 changes (#408) |
| [workstreams/queue-offline.md](workstreams/queue-offline.md) | Queue offline operation and guest reconciliation |
| [workstreams/player.md](workstreams/player.md) | Player access and Player Information |
| [workstreams/admin.md](workstreams/admin.md) | Admin, incl. the Admin implementation gap index |
| [workstreams/ranking.md](workstreams/ranking.md) | Ranking, awards, fairness math |
| [workstreams/backend.md](workstreams/backend.md) | Backend decisions and infrastructure |

---

## 1. MVP goal

A club operator can sign in, prepare a badminton session, manage players and courts, queue and score
matches, finish the session, and retain results. Player Information exposes identities/history; Admin
manages clubs and access.

**Scope freeze ([D-2026-11-07-04](decisions.md#d-2026-11-07-04)):** the agreed Queue, Player, Admin,
offline operation, guest reconciliation and ranking work is sufficient MVP scope for now. Complete and
link existing tickets; don't add unrelated features. **Offline is mandatory for MVP; an online-only
public launch is not approved.**

---

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **implemented** | The code path is located end to end on `main` (UI → `packages/data` fetcher → Route Handler → `packages/db` service) |
| **partially connected** | Some of the path exists (e.g. reads but not writes, a service with no route, UI on mock only) |
| **not implemented** | No real-mode path; the fetcher falls to the mock, which throws `NotConnectedError` in real mode |
| **deferred** | Owner or an open decision holds it back on purpose |
| **unknown** | Not traced, or depends on something outside the repo |

Real mode is **opt-in**: `NEXT_PUBLIC_ROTRA_DATA_MODE=real` (client) plus `ROTRA_DATA_MODE=real`
(server); the default is `mock`. Statuses here come from **code tracing, not running**: nothing was
built, run or exercised against a database. Whether production sets real mode is unknown.

---

## 3. Status board

| Workstream | Overall status | Biggest gap | Tickets | Blocking decisions | Page |
|---|---|---|---|---|---|
| Queue core | partially connected (almost all implemented) | Club name change, session defaults and club password change are mock-only in real mode; Downloads page #477 blocked on #246 | #408, #466, #477, #10, #12, #247 | #247, #381 | [queue.md](workstreams/queue.md) |
| Queue, November 9–10 | Q18 (Requests, self check-in mark, request formats) and Q19 (club invite link, previous logo, self check-in switch, Joined via, guest linking, club-set pictures) done in the mock app; real mode not connected | No server paths or `requestFormats` column; no Prisma columns, server paths or storage/cleanup for Q19 | #586, #616–#618, #587, #619–#629 | [D-11](decisions.md#d-2026-11-09-11), [D-12](decisions.md#d-2026-11-09-12) | [queue.md](workstreams/queue.md) |
| Queue, November 11 | Games played override (#717) in the mock app and real-mode services | Migration `20261111000300_roster_games_adjustment` (`session_players.games_adjustment`) applied 2026-11-11 with `prisma migrate deploy` | #717 | none | [queue.md](workstreams/queue.md) |
| Player, Admin and Queue, November 12 (P08.1) | Schema for the round-2 design: `players.profile_visibility` (enum, default `private`), `players.hidden_from_directory`, `players.banner_id` → new `profile_banners` (six seeded keys), `clubs.invite_code` (unique, backfilled), and club-only unclaimed profiles (unclaimed `players` rows and their RTR IDs moved onto `club_players`) | Migration `20261112000100_round2_profiles_banners_invites` applied to the shared database 2026-11-12 with `prisma migrate deploy` (DIRECT_URL) after owner sign-off: 43 unclaimed `players` rows moved onto 45 club records, 5 invite links removed, no game references touched; services that read or write these columns are the P08.x follow-ups | P08.1 | none | [player.md](workstreams/player.md), [admin.md](workstreams/admin.md), [queue.md](workstreams/queue.md) |
| Player and Admin, November 12 (P08.6) | Profile banners (Admin › Settings › Profile banners, Edit profile › Banner, the profile card) in the mock app and real-mode services | The public Storage bucket `profile-banners` was created on 2026-11-12 with the same settings as `profile-characters`; not run against a database. The Edit profile swatches cannot show a banner Admin later hid ([D-2026-11-12-01](decisions.md#d-2026-11-12-01)) | #754 | none | [admin.md](workstreams/admin.md) |
| Queue, Player and Admin, November 11 design round | built on Epic P08 (#748), November 12 | The nineteen approved mockup changes of [D-2026-11-11-11](decisions.md#d-2026-11-11-11) are built in the mock app and real mode on branch tickets #749–#759: `--photo-scrim` / `--photo-fg` tokens and the photo viewer (#716, #750, #758), three-level profile visibility and Hide me from Player Information (#715, #753), profile banners (#754), club invite code checked on the server (#712, #755), live console, Courts and time and Admin license period (#756), club-only unclaimed profiles with “Not registered yet” in Admin (D-2026-11-11-03, #757). Their mockup logs are IN MOCK APP. Answers: [D-2026-11-12-01](decisions.md#d-2026-11-12-01). Not run against a production database. Still open: real-mode marker for Lookup pending versus Unclaimed; Admin › Add player still creates an unclaimed `players` row with an RTR ID; the public club page's Join button sends the current invite code to anyone who opens the page; drop-out notices are not closed at Start | #748, #749–#759 | [D-2026-11-12-01](decisions.md#d-2026-11-12-01) | [queue.md](workstreams/queue.md), [player.md](workstreams/player.md), [admin.md](workstreams/admin.md) |
| Queue offline | connected (traced, not run against a database) | Read-only device copy in IndexedDB (#477); outbox of offline commands applied by the existing reducers and replayed through the existing adapters, 409 → Q-CONFLICT, `playhistory.json` export/import (#722, [D-2026-11-11-04](decisions.md#d-2026-11-11-04)). Guest review at Session done is a notice, not a gate (no guest → saved-player link column) | #721, #722 | guest review gate needs a schema decision | [queue-offline.md](workstreams/queue-offline.md) |
| Player access & Player Information | partially connected | Sign-in, session, sign-out, registration are real (#483); Admin-reviewed reset implemented in #491, schema applied; Your clubs, Join club and Leave club real (#703); registration from a club or session link joins that club (#707); club invite code `?k=` checked on the server and Regenerate link real (P08.7, #712; a plain club link is refused); profile visibility (three levels, Hide me from Player Information) and banners in real mode (P08.5, P08.6; [D-2026-11-12-01](decisions.md#d-2026-11-12-01)); Admin registration link mock-only; rank empty until #247 | #244, #400, #483, #488 | [D-01](decisions.md#d-2026-11-07-01), #491, #247 | [player.md](workstreams/player.md) |
| Admin | partially connected | Reset link (D-01), player create/archive/restore/remove (contact-change approve/apply/status and name/nickname edit are real, #575). A07 (#589, #644–#650): profile character library and Admin edit-everything in the mock app; real mode is a backend follow-up (Supabase Storage, `profile_characters` table, full-form PATCH, admin-set password) | #24, #25, #26, #244 | none (#377, #380, #395 decided November 11, 2026, [D-06](decisions.md#d-2026-11-11-06), [D-07](decisions.md#d-2026-11-11-07), [D-10](decisions.md#d-2026-11-11-10)) | [admin.md](workstreams/admin.md) |
| Ranking | partially connected (settings only) | Engine decided November 11, 2026: rating by wins ([D-2026-11-11-05](decisions.md#d-2026-11-11-05)); constants and worked examples pending in #247; leaderboard empty in real mode until then | #247 | none (constants in #247) | [ranking.md](workstreams/ranking.md) |
| Backend decisions / infrastructure | partially connected | Production data mode unknown; scheduled jobs parked for MVP ([D-2026-11-11-10](decisions.md#d-2026-11-11-10)); offline sync routes unwired; #243 closed as overtaken; #244, #245, #247, #248 unblocked by the November 11 decisions | #241, #244, #245, #247, #248, #387 | [database open decisions](../database_design/product/open-decisions.md) | [backend.md](workstreams/backend.md) |

---

## 4. Milestones

Only what the owner stated ([D-2026-11-07-04](decisions.md#d-2026-11-07-04)):

| Milestone | Status | Note |
|---|---|---|
| **M1 — ticket backlog complete** | open | Feature-completion milestone, **not** proof that no undiscovered gaps exist |
| Private regression handoff, November 9–13 | tentative | Discussed as a target, not a committed launch date. Reassess against actual remaining work |
| Launch | not dated | Requires offline. Online-only public launch is not approved |

---

## 5. MVP exit criteria

**Proposed — owner to confirm.** Derived from the MVP goal and approved decisions only.

- [ ] In real mode on `main`, a club operator can sign in, prepare a session, manage players and courts, queue and score matches, finish the session, and results are retained.
- [ ] Player Information exposes identities and history.
- [ ] Admin manages clubs and access.
- [ ] Offline operation works within [D-03](decisions.md#d-2026-11-07-03): setup and start online; offline add of downloaded club players and guests, matches and scores; Session done only after reconnection, complete sync and Queue Master review of every unresolved guest.
- [ ] Admin-reviewed password recovery (#491) is verified with the hosted provider (schema applied after sign-off).
- [ ] The ranking work inside the frozen scope ([D-04](decisions.md#d-2026-11-07-04)) is complete.
- [ ] Every approved MVP decision has an implementation ticket (no `Ticket: needed` left) and is `implemented`.
- [ ] M1: the ticket backlog is complete.

---

## 6. Open questions for the owner

Merged from both audits, deduped.

| # | Question | Blocks |
|---|---|---|
| 1 | Is production deployed with real data mode on? (Not in the repo.) | Backend, all |
| 2 | Should Generate matches drafts persist across reload/devices, or is device memory acceptable for MVP? | Queue core |
| 3 | Are club name-change, session defaults and club password change MVP? (Mock-only in real mode; the Facebook post template is real since #473.) | Queue core |
| 4 | Server-rendered result-image export: needed, or is the client-side download enough? | Queue core |
| 5 | A new player entered with a phone: keep "lookup pending" profile matching on sync, or route it through D-03 Queue Master guest review? | Queue offline |
| 6 | Offline writes shipped in #722 (outbox, replay, conflict review, play-history file); connectivity, D-03 rules and the read-only device copy shipped in #721. Left: the guest review gate at Session done needs a column for the guest → saved-player link | Queue offline |
| 7 | Close epics #408, #10, #11, #12 now that every sub-issue is closed? | Queue core (housekeeping) |
| 8 | Settled by #491: Admin-reviewed submitted requests, no automatic email. D-01 updated | Player, Admin |
| 9 | Queue Master issuance is real (#483). Is the Admin registration link (mock only) also MVP? | Player, Admin |
| 10 | Are Admin player writes (create/edit/archive/remove), club price change and club-name review MVP? | Admin |
| 11 | Do session awards ship with the `prototype-reference` formula, or wait for #247? | Ranking |
| 12 | With no approved rank formula, should the leaderboard ship empty (current behaviour) or be hidden for MVP? | Ranking, Player |
| 13 | Are license-lapse refresh and retention sweep jobs MVP, and which scheduler runs them? | Admin, Backend |
| 14 | #491 uses a provider-generated recovery link plus a ROTRA request/digest table. Shared migration applied after owner sign-off | Admin, Player, Backend |

---

## 7. Docs that are now untrue

Remaining follow-ups from the audit (fixed rows removed 2026-11-07 and 2026-11-08). **Not fixed in this folder**; each needs its own change.

| File:line | Says | Reality / conflict |
|---|---|---|
| `AGENTS.md:174` | Testing switches back on when Supabase/Prisma is connected | Connected in real mode; trigger is ambiguous |
| `docs/screens/product/modules/queue/players-roster.md:71`, `:89`; `docs/business_logic/product/queue/modules/players/flow/add-player.md:6` | Phone makes identity matching eligible on sync; "Lookup pending" | Possible conflict with D-03 "never auto-link" (open question 5) |
| `packages/data/src/real/admin-audit.ts:12` (code comment) | Flags and ranking settings "wait on #402" | #402 is closed |
| `docs/mockup-changes/2026-11-01-queue-auto-queue-copy.md`, `…-queue-presence-batches.md`, `…-queue-live-session-settings.md`, `2026-10-31-queue-routed-prototypes.md` | `Status: NEW` | Work looks shipped (unverified) |

---

## 8. Agent rules

- Before creating a ticket, compare the current app route, `packages/data/src/real` adapter and `packages/db/src` service; documentation can lag code.
- Classify work with the [status vocabulary](#2-status-vocabulary). Do not label an unverified flow a bug.
- Follow [AGENTS.md](../../AGENTS.md), [ways of working](../ways-of-working.md), and product rules in [business logic](../business_logic/product/README.md). Keep implementation detail in issues/PRs.
- Never turn an audit finding or suggestion into a decision. Decisions come from the owner and go in [decisions.md](decisions.md).

### Updating this folder

- **Scope or status changed:** update the workstream page's *Current state* and *Remaining work*, then its row in the [status board](#3-status-board). Bump *Last verified* with the commit you checked.
- **New owner decision:** add an entry to [decisions.md](decisions.md) using its template, add it to the index, and link it from the affected workstream pages.
- **Ticket created:** replace `Ticket: needed` with the issue number on the workstream page and in the decision entry.
- **Doc fixed:** remove its row from [§7](#7-docs-that-are-now-untrue).
