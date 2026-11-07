# ROTRA MVP

**Last verified:** 2026-11-07 (code audit of `main` @ `51abb94f`) · **Audience:** contributors and AI agents.

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
| Queue core | partially connected (almost all implemented) | Club settings and Copy Facebook post are mock-only in real mode | #408, #10, #12, #247 | #247, #381 | [queue.md](workstreams/queue.md) |
| Queue offline | not implemented | No durable device copy, outbox or replay; no guest review at Session done | #246, #18 | #246, [D-03](decisions.md#d-2026-11-07-03) reconciliation | [queue-offline.md](workstreams/queue-offline.md) |
| Player access & Player Information | partially connected | No player sign-in, sign-out, claim or recovery routes | #244, #400 | #244, [D-01](decisions.md#d-2026-11-07-01), #247 | [player.md](workstreams/player.md) |
| Admin | partially connected | Contact-change approve/apply/status, reset link (D-01), player writes | #24, #25, #26, #244, #395 | #244, #395, #377 | [admin.md](workstreams/admin.md) |
| Ranking | partially connected (settings only) | No approved rank formula; leaderboard always empty in real mode | #247 | #247 | [ranking.md](workstreams/ranking.md) |
| Backend decisions / infrastructure | partially connected | Production data mode unknown; scheduled jobs have no runner; offline sync routes unwired | #241, #243–#248, #387 | [database open decisions](../database_design/product/open-decisions.md) | [backend.md](workstreams/backend.md) |

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
- [ ] Manual player password recovery per [D-01](decisions.md#d-2026-11-07-01) works, meeting its security requirements.
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
| 3 | Are club name-change, session defaults, Facebook post template and club password change MVP? (Mock-only in real mode.) | Queue core |
| 4 | Server-rendered result-image export: needed, or is the client-side download enough? | Queue core |
| 5 | A new player entered with a phone: keep "lookup pending" profile matching on sync, or route it through D-03 Queue Master guest review? | Queue offline |
| 6 | Who owns the offline implementation ticket(s): a new epic, or reopen Q11 #18? #246 excludes IndexedDB/outbox | Queue offline |
| 7 | Close epics #408, #10, #11, #12 now that every sub-issue is closed? | Queue core (housekeeping) |
| 8 | Does D-01 supersede #244 "recovery by email only"? Should docs drop email recovery, and does P-FORGOT need a mockup change log? | Player, Admin |
| 9 | Who issues claim links in MVP: Queue Master only (#244 L5), Admin too (mock has an Admin registration link), or both? | Player, Admin |
| 10 | Are Admin player writes (create/edit/archive/remove), club price change and club-name review MVP? | Admin |
| 11 | Do session awards ship with the `prototype-reference` formula, or wait for #247? | Ranking |
| 12 | With no approved rank formula, should the leaderboard ship empty (current behaviour) or be hidden for MVP? | Ranking, Player |
| 13 | Are license-lapse refresh and retention sweep jobs MVP, and which scheduler runs them? | Admin, Backend |
| 14 | D-01 reset link: provider-generated recovery link, or a ROTRA table? Affects migration sign-off | Admin, Player, Backend |

---

## 7. Docs that are now untrue

Follow-up list from the audit. **Not fixed in this folder**; each needs its own change.

| File:line | Says | Reality / conflict |
|---|---|---|
| `AGENTS.md:14-15` | Database, real auth … remain targets | Real auth and DB services exist for Queue, Admin, Player reads (real mode) |
| `AGENTS.md:55-56` | Building on mock data; Supabase + Prisma come later | Real-mode adapters, Route Handlers and Prisma services exist |
| `AGENTS.md:71` | `db/ … (database epic, later)` | `packages/db/src` is populated and used |
| `AGENTS.md:171` | Testing switches back on when Supabase/Prisma is connected | Connected in real mode; trigger is ambiguous |
| `docs/README.md:6` | "Nothing is built yet." | Apps and real-mode paths exist |
| `docs/architecture.md:3`, `:35` | Status lines (target, mock in progress) | Real mode exists |
| `docs/architecture.md:51` | `db` … (database epic, later) | Populated |
| `docs/architecture.md:167` | "Real phase (later)" | Real mode exists |
| `docs/architecture.md:220`, `:229` | "Auth (target, not built)"; sign-in is mocked | Club and Admin sign-in are real |
| `docs/architecture.md:297` | Console offline notice says changes save on this device | Untrue in real mode (doc already flags it) |
| `docs/architecture.md:407` | "Database (later epic)" | Database services exist |
| `docs/business_logic/product/queue/modules/offline/README.md:12`, `:14`, `:16`, `:43` | Offline start with a downloaded copy; only new players offline; no guest review at Session done | Conflicts with [D-03](decisions.md#d-2026-11-07-03) |
| `docs/screens/product/state-matrix.md:14` | Start allowed offline with a downloaded copy | Conflicts with D-03 |
| `docs/screens/product/dialogs.md:11`; `docs/screens/product/modules/queue/session-setup.md:102`, `:116`, `:120` | Offline start copy | Conflicts with D-03 |
| `docs/screens/product/modules/queue/offline-recovery.md:24` | "Start the session" offline-supported | Conflicts with D-03 |
| `docs/database_design/product/queue/modules/sessions-roster.md:55`; `docs/database_design/product/open-decisions.md:25`; `docs/screens/product/open-decisions.md:15`; `docs/database_design/product/access-retention.md:37`; `docs/database_design/product/physical-schema.md:150`, `:176`; `docs/database_design/product/implementation-plan.md:135`; `docs/database_design/product/validation-review.md:182` | Offline-start reservation design | Moot under D-03 |
| `docs/screens/product/modules/queue/players-roster.md:85`; `docs/business_logic/product/queue/modules/players/flow/add-player.md:6` | Phone makes identity matching eligible on sync; "Lookup pending" | Possible conflict with D-03 "never auto-link" (open question 5) |
| `docs/screens/product/modules/queue/players-roster.md:65` | Saving without a session is mock-only | `api/club/players` POST exists |
| `docs/business_logic/product/player-information/modules/identity/flow/claim-and-recover.md:25` | Send recovery email | Conflicts with [D-01](decisions.md#d-2026-11-07-01) |
| `docs/screens/product/modules/player-information/access-registration.md:62-64` | P-FORGOT "Email recovery request"; recovery stays email-only | Conflicts with D-01 |
| `docs/business_logic/product/open-decisions.md:18`, `:48` | Recovery by email only (#244) | Conflicts with D-01 (open question 8) |
| `packages/db/src/player/claim.ts:11` (code) | `CLAIM_LINK_DAYS = 14` | Decided 7 days (#244 L5) |
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
