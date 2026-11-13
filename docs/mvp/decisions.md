# MVP decisions and tracking

**Last verified:** 2026-11-13 (D-2026-11-13-01 approved; amendment notes on D-2026-11-08-03, D-2026-11-09-04, D-2026-11-09-09, D-2026-11-11-04); 2026-11-12 (decisions and status lines; code trace of `main` @ `aca899f2` for the older entries); decisions added 2026-11-09. This is the short decision register
for MVP discussions. The [MVP hub](README.md) summarizes delivery; GitHub issues track implementation.
Product rules and existing open-decision documents remain authoritative for their domains.

## Index

| ID | Title | Decision status | Implementation | Ticket | Workstream |
|---|---|---|---|---|---|
| [D-2026-11-07-01](#d-2026-11-07-01) | Manual player password recovery for MVP | approved (updated #491) | in progress | #491 | [Player](workstreams/player.md), [Admin](workstreams/admin.md) |
| [D-2026-11-07-02](#d-2026-11-07-02) | Decision and roadmap status tracking | approved | implemented | none | Tracking (this folder) |
| [D-2026-11-07-03](#d-2026-11-07-03) | Offline session boundaries and guest reconciliation | approved | not started | needed; #246 | [Queue offline](workstreams/queue-offline.md), [Player](workstreams/player.md) |
| [D-2026-11-07-04](#d-2026-11-07-04) | Freeze the current MVP scope | approved | not applicable | none | All |
| [D-2026-11-07-05](#d-2026-11-07-05) | Payment amounts reuse the existing paid mark | approved | implemented | #479 | [Queue](workstreams/queue.md) |
| [D-2026-11-07-06](#d-2026-11-07-06) | Public participant names are masked | approved | implemented | #475, #474 | [Queue](workstreams/queue.md) |
| [D-2026-11-07-07](#d-2026-11-07-07) | Player invite links use player login until sign-up exists | approved | implemented | #476, #478; #477 blocked | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-08-01](#d-2026-11-08-01) | Where Admin Sales numbers are calculated | approved | implemented in source; SQL not yet verified against a database | #533, #540 (epic #504) | [Admin](workstreams/admin.md) |
| [D-2026-11-08-02](#d-2026-11-08-02) | Player Compare data, rules and route | approved | implemented in source; SQL draft, verification pending | #525, #526, #541 (epic #502) | [Player](workstreams/player.md) |
| [D-2026-11-08-03](#d-2026-11-08-03) | Profile pictures in Supabase Storage | approved | in progress | #522, #542 (epic #502) | [Player](workstreams/player.md) |
| [D-2026-11-08-04](#d-2026-11-08-04) | Scheduled jobs: Supabase pg_cron calls protected Route Handlers | approved | not started | #545; #546, #547 blocked | [Backend](workstreams/backend.md) |
| [D-2026-11-08-06](#d-2026-11-08-06) | Player access to public Queue sessions | approved | implemented in source; authenticated real verification pending | #569 | [Queue](workstreams/queue.md) |
| [D-2026-11-09-01](#d-2026-11-09-01) | Next-match picker after every result | approved | in progress | #579 | [Queue](workstreams/queue.md) |
| [D-2026-11-09-02](#d-2026-11-09-02) | Signed-in Players on the session page: full names and one-tap join | approved | in progress (mock app; real mode: join only) | #585, #687 | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-09-03](#d-2026-11-09-03) | Players check themselves in, leave, and say they can't make it | approved | in progress | #617, #619, #624, #626 | [Queue](workstreams/queue.md) |
| [D-2026-11-09-04](#d-2026-11-09-04) | The player's live view: My night, Courts now, own standing, refresh only | approved | not started | needed | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-09-05](#d-2026-11-09-05) | Match requests | approved | not started | needed | [Queue](workstreams/queue.md) |
| [D-2026-11-09-06](#d-2026-11-09-06) | Registration from session and club links, guest linking and club membership | approved | in progress | #622, #625, #627 | [Player](workstreams/player.md), [Queue](workstreams/queue.md) |
| [D-2026-11-09-07](#d-2026-11-09-07) | Public or private player profile | approved | in progress (three levels and the hide switch built in P08.5, #753; always-private rules in the services) | #753 | [Player](workstreams/player.md) |
| [D-2026-11-09-08](#d-2026-11-09-08) | Sharing: links, QR codes and post/story images | approved | in progress (club invite code checked on the server in real mode, #755; Post image stays 1080 × 1350) | #620, #621, #624, #626, #755 | [Player](workstreams/player.md), [Queue](workstreams/queue.md) |
| [D-2026-11-09-09](#d-2026-11-09-09) | Keeping the session page cheap to serve | approved | not started | needed | [Queue](workstreams/queue.md), [Backend](workstreams/backend.md) |
| [D-2026-11-09-10](#d-2026-11-09-10) | Uploaded pictures: keep only the current and the previous | approved | in progress | #619, #624, #626 | [Player](workstreams/player.md), [Queue](workstreams/queue.md), [Backend](workstreams/backend.md) |
| [D-2026-11-09-11](#d-2026-11-09-11) | Session page and Queue refinements from the owner's artifact review | approved | in progress (Q18 Queue Master side in the mock app; request-format defaults decided 2026-11-10) | needed | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-09-12](#d-2026-11-09-12) | Club-set pictures for guests and unclaimed players | approved | in progress | #623, #628 | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-09-13](#d-2026-11-09-13) | Admin-managed profile character library | approved | in progress (mock app; real mode merged in #703, migration applied) | #644, #645, #646 | [Admin](workstreams/admin.md), [Player](workstreams/player.md) |
| [D-2026-11-09-14](#d-2026-11-09-14) | Admin edits everything on a player, with a beta-only password field | approved for MVP or beta only; signed off 2026-11-10 | in progress (mock app; real mode not started) | #647, #648, #649, #650 | [Admin](workstreams/admin.md) |
| [D-2026-11-11-01](#d-2026-11-11-01) | Observability: OpenTelemetry traces to Grafana Cloud, plus a local Grafana stack | approved 2026-11-11 | implemented in the repository; Grafana Cloud stack and Vercel `OTEL_*` variables not set up yet | none | [Backend](workstreams/backend.md) |
| [D-2026-11-11-02](#d-2026-11-11-02) | Join request: the player picks Join a slot or Be waitlisted, and can join from the waitlist | approved | in progress (mock app + real-mode services; migration applied 2026-11-11) | #706 | [Queue](workstreams/queue.md) |
| [D-2026-11-11-03](#d-2026-11-11-03) | Guests and unclaimed profiles stay in their club | approved | in progress on Epic P08 (migration and services built, #749, #757; real-mode marker and history attribution still open) | #749, #757 | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-12-01](#d-2026-11-12-01) | Answers to the leftover questions of the November 11 round | approved 2026-11-12 | in progress on Epic P08, #748 | #748, #749–#759 | [Queue](workstreams/queue.md), [Player](workstreams/player.md), [Admin](workstreams/admin.md) |
| [D-2026-11-12-02](#d-2026-11-12-02) | Club members join upcoming sessions right away; the Always require a request switch | approved 2026-11-12 (open points to be confirmed by the owner) | in progress (#764; migration applied 2026-11-12) | #764 | [Queue](workstreams/queue.md) |
| [D-2026-11-12-03](#d-2026-11-12-03) | Profile banner: 5:2, nothing overlaps it, banner dialog | approved 2026-11-12 (open points to be confirmed by the owner) | in the mockups and the mock app (#765); real mode shares the same services | #765 | [Player](workstreams/player.md), [Admin](workstreams/admin.md) |
| [D-2026-11-12-04](#d-2026-11-12-04) | Clubs on every readable profile; Leave club on the club page; no Report a problem | approved 2026-11-12 | in progress (#766) | #766 | [Player](workstreams/player.md) |
| [D-2026-11-12-05](#d-2026-11-12-05) | Playwright regression suite on a throwaway local Supabase | approved 2026-11-12 | in progress (feat/e2e-regression) | none | [Queue](workstreams/queue.md) |
| [D-2026-11-13-01](#d-2026-11-13-01) | Go API on Railway: API, database, sign-in and pictures off Vercel functions and Supabase; live updates | approved 2026-11-13 (B-01 to B-19) | not started | needed | [Backend](workstreams/backend.md) |
| [D-2026-11-13-02](#d-2026-11-13-02) | Shared rule-cases package `@rotra/rule-cases` | approved 2026-11-13 | done (PR #785) | #789–#792 (epic #788) | [Backend](workstreams/backend.md) |

## Status conventions

Every decision entry must include:
- **Decision status:** `proposed` | `approved` | `deferred` | `canceled` | `superseded`.
- **Implementation status:** `not started` | `in progress` | `implemented` | `unknown` | `not applicable`. Only mark `implemented` after locating the code on `main`; otherwise use `unknown`.
- **Ticket:** `none` | `needed` | linked issue(s). A referenced epic does not mean the decision has its own implementation ticket.
- **Roadmap:** `MVP` | `post-MVP` | `out of scope`, plus the related workstream.
- **References:** relevant docs, code, issues, and any superseding decision.

**Workflow:** Record owner decisions promptly; do not turn suggestions into approved decisions. Check
existing issues before creating a new one. If approved MVP work lacks a ticket, mark `Ticket: needed`;
create/attach a ticket only under the repository's issue-creation rules. When code merges, update
implementation status, the index above and the workstream page. Canceled/deferred decisions stay
visible for history, and superseded decisions link their replacement. Never equate an approved decision
with implemented code. Audit findings go in a **Notes (audit …)** line; they never rewrite a decision.

## Entry template

```markdown
<a id="d-YYYY-MM-DD-NN"></a>
### D-YYYY-MM-DD-NN — <short title>
- **Decision status:** proposed | approved | deferred | canceled | superseded
- **Implementation status:** not started | in progress | implemented | unknown | not applicable
- **Ticket:** none | needed | #n
- **Roadmap:** MVP | post-MVP | out of scope — <workstream>
- **Decision:** <the owner's decision, in the owner's words>
- **Not in MVP / Out of scope:** <if any>
- **References:** <docs, code paths, issues, superseding decision>
```

Then add a row to the [index](#index) and link the entry from the workstream page.

## Decisions

<a id="d-2026-11-07-01"></a>
### D-2026-11-07-01 — Admin-reviewed player password recovery for MVP
- **Decision status:** approved; updated by the owner November 8, 2026 in [#491](https://github.com/jose-codegourmet/rotra-v2/issues/491).
- **Implementation status:** in progress on the tracking board; PR #494 contains the completed, locally verified implementation and the shared migration was applied after owner sign-off. Update the board to implemented once the PR is on main.
- **Ticket:** #491
- **Roadmap:** MVP — [Player access](workstreams/player.md), [Admin](workstreams/admin.md).
- **Decision:** Forgot password submits a request to Admin > Requests. No automatic email. ROTRA Admin verifies ownership, then generates a secure, expiring, single-use link for manual delivery. The player chooses their password; the Admin never sees it. Delivery channel and arbitrary expiry duration are not prescribed.
- **Amended by:** [D-2026-11-09-14](#d-2026-11-09-14) (an admin-typed password for the beta only; the owner signed off the amendment on 2026-11-10, no end date set).
- **Supersedes:** the November 7 support-only/no-submitted-requests restriction and the automatic recovery email shipped in #483. Ownership verification, no plaintext-token storage, audit and no club-owner password-reset access remain.
- **Implementation:** Supabase recovery token/expiry plus a private ROTRA request table holding a token digest, reviewer and issuance lease. The existing reset screen consumes only reviewed links and checks the account mapping. No provider call occurs when submitting the request. The additive migration was applied to ROTRA v2 ASIA on November 8 after explicit owner sign-off.
- **References:** `apps/admin/src/app/(admin)/requests/password-resets`, `packages/db/src/admin/password-resets.ts`, [schema](../database_design/product/admin/modules/configuration-requests.md).

<a id="d-2026-11-07-02"></a>
### D-2026-11-07-02 — Decision and roadmap status tracking
- **Decision status:** approved
- **Implementation status:** implemented (documentation convention in this file)
- **Ticket:** none (documentation-only)
- **Roadmap:** MVP — tracking convention, not a product feature
- **Decision:** Maintain decision status, implementation status, ticket link/need, roadmap scope and references for each new decision. Keep statuses updated as work progresses, is canceled or deferred.
- **References:** [Ways of working](../ways-of-working.md), [MVP hub](README.md).

<a id="d-2026-11-07-03"></a>
### D-2026-11-07-03 — Offline session boundaries and guest reconciliation
- **Decision status:** approved
- **Implementation status:** partly built (#722, November 12, 2026): the offline working copy and outbox are connected in real mode; Session done is refused offline or while this device's changes wait; `GET …/done-review` lists every roster guest without a ROTRA profile with same-name saved players as candidates and the Session done sheet shows them. Not built: confirming a match (a guest → saved player merge service; the tables have no column to record the link) and creating a new unclaimed player from a guest (RTR ID allocation), so the guest step is a notice, not a gate
- **Ticket:** needed; related design issue [#246](https://github.com/jose-codegourmet/rotra-v2/issues/246)
- **Roadmap:** MVP — [Queue offline](workstreams/queue-offline.md) and [Player identity](workstreams/player.md)
- **Decision:** Session setup and start require internet. During an active session, downloaded club players and newly entered guests may be added offline, alongside offline match and score operations. Global ROTRA player search is online only. Session end/finalization requires reconnection, complete sync, and queue-master review of every unresolved guest.
- **Guest review:** Queue master owns every identity decision. Suggest only lightweight, limited candidate matches: search the club's saved players first, then the global player directory when online. Never scan or fetch every similarly named player, and never auto-link based on a name. The queue master explicitly confirms a match or creates a new unclaimed player; preserve session history for later claiming. No mandatory region filter.
- **Out of scope:** expensive fuzzy matching, exhaustive same-name searches, automatic identity linking.
- **References:** [Queue offline rules](../business_logic/product/queue/modules/offline/README.md), [Queue offline workstream](workstreams/queue-offline.md), [#246](https://github.com/jose-codegourmet/rotra-v2/issues/246). The offline rules, state matrix and offline-recovery screen doc now match this decision.
- **Notes (audit 2026-11-07):** Setup/start and global search are online only in real mode (matches the decision). Offline add, device copy and outbox are not built; the Session done review (`packages/db/src/queue/finalization.ts:104`) has no guest step and `canFinishAndSync` is always `true` (`packages/data/src/real/sync.ts:47`). #246 excludes IndexedDB/outbox. Offline-start UI copy in `dialogs.md` and `session-setup.md` carries an MVP note pending a mockup change; database-design offline-start reservation notes mark it moot for MVP; see [hub §7](README.md#7-docs-that-are-now-untrue).

<a id="d-2026-11-07-04"></a>
### D-2026-11-07-04 — Freeze the current MVP scope
- **Decision status:** approved
- **Implementation status:** not applicable (scope decision)
- **Ticket:** none (tracking only; missing implementation tickets still need reconciliation)
- **Roadmap:** MVP — all current workstreams
- **Decision:** The currently agreed Queue, Player, Admin, offline operation, guest reconciliation and ranking work is sufficient MVP scope for now. Prioritize completing and linking existing tickets, not adding unrelated features. A completed ticket backlog is the working feature-completion milestone, **not** proof that no undiscovered gaps exist.
- **Delivery note:** A private regression handoff during November 9–13 was discussed as a *tentative target*, not a committed launch date. Offline is mandatory for MVP; an online-only public launch is not approved. Reassess dates based on actual remaining work.
- **Follow-up:** Reconcile approved MVP decisions against GitHub tickets, avoid duplicates, and mark uncovered implementation work `Ticket: needed`. Keep deferred or canceled items visible.
- **References:** [MVP hub](README.md), [Ways of working](../ways-of-working.md), [D-2026-11-07-01](#d-2026-11-07-01) and [D-2026-11-07-03](#d-2026-11-07-03).

<a id="d-2026-11-07-05"></a>
### D-2026-11-07-05 — Payment amounts reuse the existing paid mark
- **Decision status:** approved
- **Implementation status:** implemented (fix/466-obvious-queue-bugs)
- **Ticket:** [#479](https://github.com/jose-codegourmet/rotra-v2/issues/479)
- **Roadmap:** MVP — item 5 in the former MVP roadmap; now [Queue workstream](workstreams/queue.md)
- **Decision:** `SessionPaymentMark.amountMinor` means the amount received; a quick tick records the current due. Status compares received with the current due: Paid, Partial, Reimburse (tracking only) or Unpaid. Pricing changes never rewrite received amounts. No migration.
- **References:** [Financials](../business_logic/product/queue/modules/financials/README.md).

<a id="d-2026-11-07-06"></a>
### D-2026-11-07-06 — Public participant names are masked
- **Decision status:** approved
- **Implementation status:** implemented (fix/466-obvious-queue-bugs)
- **Ticket:** [#475](https://github.com/jose-codegourmet/rotra-v2/issues/475), [#474](https://github.com/jose-codegourmet/rotra-v2/issues/474)
- **Roadmap:** MVP — item 5 in the former MVP roadmap; now [Queue workstream](workstreams/queue.md)
- **Decision:** On the public session page each name word shows as its first letter plus `***` (`J*** A***`), masked on the server. The public skill mix shows aggregate counts only, never who is which level. Not covered yet: published results and profile pictures.
- **References:** `packages/data/src/public-session/publicSession.rules.ts`, `packages/db/src/queue/public-session.ts`.

<a id="d-2026-11-07-07"></a>
### D-2026-11-07-07 — Player invite links use player login until sign-up exists
- **Decision status:** approved
- **Implementation status:** implemented (fix/466-obvious-queue-bugs)
- **Ticket:** [#476](https://github.com/jose-codegourmet/rotra-v2/issues/476), [#478](https://github.com/jose-codegourmet/rotra-v2/issues/478); Downloads page [#477](https://github.com/jose-codegourmet/rotra-v2/issues/477) blocked on #246
- **Roadmap:** MVP — items 1 and 5 in the former MVP roadmap; now [Player workstream](workstreams/player.md) and [Queue workstream](workstreams/queue.md)
- **Decision:** Request to join offers the guest form or "Log in with ROTRA Player" (returns to `/s/<slug>?join=1`); sign-up shows as not open yet. Guest "Invite to ROTRA" copies the player login link. A login never grants a slot, and a join request does not yet carry the signed-in player.
- **Superseded for guest invitations, November 8, 2026 (#490):** Copy and Share now open independent registration at `/register/[clubId]`. The club supplies RTR allocation context only. Registration keeps the guest record unlinked until a separate linking invitation is accepted. Matching contacts prompt sign-in/recovery or correction/help; no duplicate account or automatic merge. Request to join still offers guest entry or login; its note now directs new players to ask the club for a registration invite.
- **References:** [Public session screens](../screens/product/modules/queue/public-session.md), [registration screens](../screens/product/modules/player-information/access-registration.md).

<a id="d-2026-11-08-01"></a>
### D-2026-11-08-01 — Where Admin Sales numbers are calculated
- **Decision status:** approved (2026-11-08; the owner delegated the choice and asked for the most efficient option)
- **Implementation status:** implemented in source (A06.1–A06.4); the Postgres functions have not run against a seeded database yet. Cost per session lives in the new single-row `admin_settings` table (owner choice, 2026-11-08), since no Admin configuration table existed
- **Ticket:** [#533](https://github.com/jose-codegourmet/rotra-v2/issues/533) (mock data), [#540](https://github.com/jose-codegourmet/rotra-v2/issues/540) (Postgres views and real-mode reader), epic [#504](https://github.com/jose-codegourmet/rotra-v2/issues/504)
- **Roadmap:** MVP candidate — [Admin workstream](workstreams/admin.md)
- **Question:** Should revenue, sessions-started, matches-played and per-club cost-per-session be calculated in Next.js (route handlers or server code) or in Supabase (Postgres)?
- **Owner note (November 8, 2026):** Not sure Next.js is the right place to do calculations. Supabase feels right. This entry is where discussion and notes live, together with the AI recommendation.
- **Decision:** The recommendation below, as written: one read-only SQL view (or SQL function) per report, added by a Prisma migration in `packages/db`; computed when the page opens; the Admin Route Handler only reads it behind `requireAdmin`. **No Supabase Edge Function, no pg_cron, no totals table.** Add a monthly totals table updated at finalization only if a report is measured to be slow. Product defaults, taken from the mockup:
  - Revenue counts each recorded license payment in the **month it was paid** (no spreading of yearly payments).
  - **Free (tester) clubs count** in sessions started and matches played; their revenue is ₱0.
  - **“Revenue they pull in”** means what the club pays ROTRA. ROTRA never shows money clubs collect from their players.
  - **Cost per session** is one Admin-editable number stored with the Admin configuration (a new field), starting at ₱15. ₱15 stays a placeholder until the owner sets the real figure in Admin; nothing is hardcoded.
  - No CSV export and no history limit for MVP; the page shows the periods in the mockup (7 days, 30 days, 12 months; six months on the club tab).
- **AI recommendation (not a decision):** Do the calculations in Postgres, and keep Next.js as a thin reader.
  1. **Why Postgres.** The inputs (license payments, finalized sessions, finalized matches) already live there. Summing and grouping by month or club is exactly what SQL does best, runs next to the data, returns a few small rows, and stays correct for every client (Admin web now, anything later). Doing it in Next.js means pulling many rows over the wire and re-implementing the same rules in TypeScript, where it can drift from the database.
  2. **Shape.** One **read-only SQL view or function per report** (for example monthly revenue, sessions and matches by club) owned by the `packages/db` schema, written as a Prisma migration. The Next.js Admin route handler only calls it, checks that the caller is the platform owner, and passes the rows to the screen, which formats peso amounts and dates. Cost-per-session is a number in the Admin configuration table (the mockup shows ₱15 as a placeholder), joined in the view.
  3. **No cron by default.** Finalized sessions and matches never change, so the numbers can be computed when the page opens (indexed on club, month and status) with no scheduled job and no extra work after a session is submitted. If it ever gets slow, keep a **monthly totals table updated in the same transaction that finalizes a session**, not by a timer. Supabase Edge Functions or pg_cron stay off until you approve them (see the [database open decisions](../database_design/product/open-decisions.md)).
  4. **Money rules.** Revenue is only the license payments Admin records (ROTRA does not collect money). Store amounts as integer centavos or pesos with a currency, never floats; decide once whether a yearly payment counts in the month paid (as the mockup does) or is spread over the months it covers.
  5. **Access.** Admin-only: the platform owner's session reads the view through the server. Nothing from these reports is exposed to clubs or players. Do not call these from the browser with the public key.
  6. **What would change this.** If a number needs logic that is awkward in SQL (for example a long-running estimate or an external price feed), do just that part in code, and still store the result in Postgres.
- **Open questions:** None blocking. The owner sets the real cost per session in Admin when known.
- **References:** [Sales screen](../screens/product/modules/admin/sales.md), [club Sales tab](../screens/product/modules/admin/clubs-licenses.md#a-club-sales--sales-tab-on-the-club-page), [Admin database design](../database_design/product/admin/README.md), [mockup log: Sales page](../mockup-changes/2026-11-08-admin-sales-page.md), [mockup log: club Sales tab](../mockup-changes/2026-11-08-admin-club-sales-tab.md).

<a id="d-2026-11-08-02"></a>
### D-2026-11-08-02 — Player Compare data, rules and route
- **Decision status:** approved (2026-11-08; the owner delegated the choice and asked for the most efficient option)
- **Implementation status:** mock reader (#525), screen (#526), and real-mode reader (#541) implemented in source. SQL-only migration `20261108000200_player_compare_reader` is drafted; shared application requires human sign-off and an explicit EXECUTE grant to the actual runtime role. Batch checks, local SQL execution and hosted verification remain pending.
- **Ticket:** [#525](https://github.com/jose-codegourmet/rotra-v2/issues/525) (mock data), [#526](https://github.com/jose-codegourmet/rotra-v2/issues/526) (screen), [#541](https://github.com/jose-codegourmet/rotra-v2/issues/541) (Postgres and real-mode reader), epic [#502](https://github.com/jose-codegourmet/rotra-v2/issues/502)
- **Roadmap:** MVP candidate — [Player workstream](workstreams/player.md)
- **Decision:**
  - **Data:** read on request from the final match rows with one SQL function (two player IDs in, the shared counted games out), added by a Prisma migration and called by a Player Route Handler. **No Supabase Edge Function, no cron, no per-pair summary table**, and no extra work after a session is submitted. Add a pair summary updated at finalization only if the query is measured to be slow.
  - **Which games:** only counted singles and doubles, as the mockup shows; fun and partial games are left out.
  - **Who:** signed-in players compare themselves with any other player. No opt-out, because every number shown is already public on profiles.
  - **Numbers:** level, position and games counted reuse the existing rank readers unchanged. Compare adds no ranking math.
  - **Route:** `/players/[playerId]/compare`, next to `/players/[playerId]/rank` and `/players/[playerId]/games`. Signed out, it goes to sign-in and returns there.
- **References:** [P-COMPARE](../screens/product/modules/player-information/profile.md#p-compare--you-and-another-player), [mockup log](../mockup-changes/2026-11-08-player-compare-players.md), [database open decisions](../database_design/product/open-decisions.md).

<a id="d-2026-11-08-03"></a>
### D-2026-11-08-03 — Profile pictures in Supabase Storage
- **Decision status:** approved (2026-11-08; the owner delegated the choice and asked for the most efficient option)
- **Implementation status:** implemented by #542; #567 adds local drafts, explicit Done, framing, animation and multi-format processing. Bucket configuration is deployment setup.
- **Ticket:** [#522](https://github.com/jose-codegourmet/rotra-v2/issues/522) (mock data), [#542](https://github.com/jose-codegourmet/rotra-v2/issues/542) (Storage and real-mode writer), epic [#502](https://github.com/jose-codegourmet/rotra-v2/issues/502)
- **Roadmap:** MVP candidate — [Player workstream](workstreams/player.md)
- **Amended by:** [D-2026-11-13-01](#d-2026-11-13-01) (B-06): pictures move to Railway Buckets, served by presigned URL, when the Go API takes over storage. The reuse of the club-logo pattern and the limits stay.
- **Decision:** Reuse the club-logo pattern (#374) instead of building a new one. The Player app's existing `/api/me/profile` route (behind `requireOwnPlayer`) receives the photo, the server normalizes it to a square image (up to 512 px; #567 preserves JPEG/PNG/WebP/GIF and converts HEIC/HEIF to WebP), uploads it to a public **`player-avatars`** Supabase Storage bucket, and saves its immutable URL in `players.avatar_ref`. A character is saved as `character:<id>`; Use my initials saves null. No direct browser upload, no Edge Function, no migration (`avatar_ref` already exists). Old files are kept like club logo snapshots.
- **References:** [architecture.md › Club logos](../architecture.md), [identity](../database_design/product/player-information/modules/identity.md), [mockup log](../mockup-changes/2026-11-08-player-change-avatar.md).

<a id="d-2026-11-08-04"></a>
### D-2026-11-08-04 — Scheduled jobs: Supabase pg_cron calls protected Route Handlers
- **Decision status:** approved (2026-11-08; the owner asked for Supabase over Vercel and delegated the details for efficiency)
- **Implementation status:** not started
- **Ticket:** [#545](https://github.com/jose-codegourmet/rotra-v2/issues/545) (scheduler and license lapse), [#546](https://github.com/jose-codegourmet/rotra-v2/issues/546) (retention sweep, blocked on #248), [#547](https://github.com/jose-codegourmet/rotra-v2/issues/547) (ranking ageing, blocked on #247); epic [#241](https://github.com/jose-codegourmet/rotra-v2/issues/241)
- **Roadmap:** MVP — [Backend workstream](workstreams/backend.md)
- **Decision:**
  - **Scheduler: Supabase `pg_cron`**, enabled with `pg_net` by a Prisma migration. Free on the Supabase Free plan and runs at any interval. Not Vercel Cron: Vercel Hobby allows at most one run a day and only within a loose hour.
  - **What runs: the existing TypeScript job, unchanged.** Each schedule makes one `net.http_post` to a protected Route Handler in the Admin app (`POST /api/jobs/<job>`) that calls the job function in `packages/db` (`refreshLapsedEntitlements`, `runRetentionSweep`, `scheduleAgeingJobs`). The URL and secret live in **Supabase Vault**; the handler checks `ROTRA_JOBS_SECRET` and answers anything else as not found.
  - **No Supabase Edge Functions for these jobs.** They would need the Prisma-based rules rewritten for Deno (two copies of the same rules), and the retention sweep must purge the apps' page cache anyway. The jobs run once a day and spend their time in database queries, so an Edge Function would not make them faster. Edge Functions stay an option for a future job with no existing code to reuse (it needs its own decision).
  - **Safety:** every job is idempotent and batch-limited, so a repeat or a missed day is harmless; responses are visible in `net._http_response`. Daily at 00:05 Asia/Manila unless a ticket says otherwise.
- **Hosting note (not a decision):** Vercel Hobby is for non-commercial use and Supabase Free projects pause after a week of inactivity (a paused project runs no jobs). Both are fine while building; before paying clubs rely on ROTRA, plan Vercel Pro and Supabase Pro.
- **References:** [Backend workstream](workstreams/backend.md), [Supabase cron](https://supabase.com/docs/guides/cron/quickstart), [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Admin implementation gap index

Moved to the [Admin workstream](workstreams/admin.md#admin-implementation-gap-index).

### D-2026-11-08-05 — Profile picture drafts and HEIC decoder (#567)

- **Decision status:** approved by the owner in issue #567 and its implementation chat (2026-11-08).
- **Decision:** save only on Done; preserve GIF animation across crop/rotation; preserve web photo formats.
  Add pinned `libheif-js@1.23.5` to `@rotra/data` for browser-independent local HEIC/HEIF decoding;
  use Next's existing Sharp for every GIF frame. HEIC/HEIF becomes WebP for browser-compatible display.
- **Later owner follow-up:** simplify the editor to a draggable crop and one Zoom slider; remove position sliders and rotation controls. Automatic source orientation remains.
- **Limits:** retain the 2,097,152-byte stored-object cap. See the [storage decision](../database_design/product/player-information/modules/identity.md#profile-picture-storage-542) for input, pixel, frame and processing limits.


### D-2026-11-08-06 — Player access to public Queue sessions (#569)

- **Status:** approved; implementation in #569.
- **Owner decision, November 8, 2026:** “Queue for any signed-in Player; full roster only for confirmed
  participants”; “Preserve individual level rings”. Names remain masked for every audience. Full roster
  means uncapped participant tiles, verified through the authenticated Player's actual roster linkage.
- **Supersedes:** #569's earlier acceptance about hiding individual levels. Keeps the later November 8
  ring decision and November 7 name masking decision. No club/operator access or automatic confirmation.
- **Flow:** credentialed exact-origin Player-hosted read; separate audience cookies; allowlisted return
  context and expiring Queue-local draft. See architecture § Player access to a public Queue session.

<a id="d-2026-11-09-01"></a>
### D-2026-11-09-01 — Next-match picker after every result (#579)
- **Decision status:** approved by the owner (Jose), November 9, 2026.
- **Implementation status:** in progress (mockup and docs in the #579 PR; real app in the same PR).
- **Ticket:** #579
- **Roadmap:** MVP — [Queue](workstreams/queue.md).
- **Decision:** (1) Left and right are two equal options; neither is preferred. (2) Candidates are the first two waiting matches in Main Queue order that are ready for the freed court (one court needed, not blocked), the same readiness check Auto Queue and Q-CHOOSE-MATCH use; no new ranking or pairing rules. (3) The picker opens after every confirmed result, in both Manual Queue and Auto Queue. Picking places the match On court (getting ready, never started); Skip for now places nothing and Auto Queue then fills that court as usual.
- **Amended by:** [D-2026-11-09-11](#d-2026-11-09-11) (the picker is a slider of up to 5 eligible matches).
- **References:** [Q-NEXT-MATCH](../screens/product/modules/queue/match-control.md#q-next-match--next-match-picker-after-a-result), [court filling rule](../business_logic/product/queue/modules/queueing/README.md#auto-queue-and-manual-queue-court-filling), [mockup log](../mockup-changes/2026-11-09-queue-next-match-picker.md).

<a id="d-2026-11-09-02"></a>
### D-2026-11-09-02 — Signed-in Players on the session page: full names and one-tap join
- **Decision status:** approved (owner discussion, November 9, 2026; the owner chose every recommended option)
- **Implementation status:** in progress — the mock app has it all (Q17, #585). Real mode (#687, November 10, 2026): one-tap **Request to join as NAME**, **Request sent** / **Cancel request** and the confirmed, waitlist and declined cards, with identity from the Player app (`session_join_requests.player_id`, migration `20261110000100`). Full names, the uncapped roster and My night are still mock only in real mode.
- **Ticket:** #585 (mock app), #687 (real-mode join)
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Queue](workstreams/queue.md), [Player](workstreams/player.md)
- **Supersedes:** in part [D-2026-11-07-06](#d-2026-11-07-06) (names masked for everyone), [D-2026-11-08-06](#d-2026-11-08-06) (names masked for every audience; full roster only for confirmed players) and [D-2026-11-07-07](#d-2026-11-07-07) (a join request does not carry the signed-in player).
- **Decision:**
  - **Full names, for registered players only.** The full names of registered ROTRA players show only to signed-in ROTRA players. The viewer doesn't have to be confirmed in the session. Registered players show their full name with the nickname under it. Guests stay masked (`J*** A***`) for everyone. Anyone who isn't signed in sees every name masked.
  - **Full roster when signed in.** Signing in removes the three-row cap. The owner's flow: a signed-in player "sees full roster with full names".
  - **No privacy setting for this in v1.** The registration form says: "Your full name shows to signed-in ROTRA players on sessions you join."
  - **One-tap join.** A signed-in player sees **Request to join as <name>** with no form. The request carries their account. The owner's words: "the player already has a rotra account. why would they need to sign up again?" The QM's request card shows "ROTRA player · already in your club" or "new to your club", plus their shared rank as a hint. The QM still sets the level for the night and still confirms or declines. Logging in never grants a slot.
  - **Spam limit.** One open join request per account per session.
- **References:** [Public session screens](../screens/product/modules/queue/public-session.md), [Players › Join requests](../business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link), [Players › Public participant names](../business_logic/product/queue/modules/players/README.md#public-participant-names). Profile privacy: [D-2026-11-09-07](#d-2026-11-09-07).

<a id="d-2026-11-09-03"></a>
### D-2026-11-09-03 — Players check themselves in, leave, and say they can't make it
- **Decision status:** approved (owner discussion, November 9, 2026)
- **Implementation status:** in progress — the Queue Master roster mark (Checked in themselves / Left, #617) and the club setting Players can check themselves in (Club settings › Session defaults, #619, #624, #626) are in the mock app. Real mode does not persist it.
- **Ticket:** #617, #619, #624, #626
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Queue](workstreams/queue.md)
- **Decision:**
  - **Self check-in.** During a live session, a confirmed signed-in player who isn't present sees a large **I'm here** button. Tapping it sets Present directly. The QM's roster shows a small "checked in themselves" mark and the QM can undo it. The club can turn self check-in off. Check-in is a tap only, with no location check and no venue QR scan.
  - **Disagreements.** The QM's last action wins. A self check-in made after the QM turned Present off shows as a new check-in with the mark.
  - **QM offline.** The player's page says "Checked in · the QM will see it when their device syncs". The QM's roster shows the check-in after the next sync.
  - **I'm leaving** (during play) turns Present off and tells the QM. Afterwards the page says "You've left · tap I'm here if you come back". There's no separate "taking a break" control.
  - **Cancel request** while the join request is pending.
  - **I can't make it** (confirmed, before the session starts) sends a drop-out notice that the QM sees under **Requests**. The slot frees only when the QM removes the player. Players never take or release slots themselves.
  - **Who may write.** The server checks every Player-side write (check-in, I'm leaving, match request, drop-out notice): the signed-in player must be linked to an unreleased roster slot in that session. Each player has at most one open drop-out notice at a time.
  - **Finishing a session** closes every pending drop-out notice, match request and join request. They stay on the record but aren't shown.
  - **Guests** get none of this. They keep today's request status card, plus the nudge "Register to check in and see your matches."
- **References:** [product terms](../product-terms.md) Present / Available, [Players › Presence](../business_logic/product/queue/modules/players/README.md), [offline module](../business_logic/product/queue/modules/offline/README.md).

<a id="d-2026-11-09-04"></a>
### D-2026-11-09-04 — The player's live view: My night, Courts now, own standing, refresh only
- **Decision status:** approved (owner discussion, November 9, 2026)
- **Implementation status:** in progress — mockups updated November 9, 2026 (`NEW` logs dated 2026-11-09 in [mockup-changes](../mockup-changes/README.md)); the Refresh button, the pull down and the tab-return refresh are in the mockup and the mock app (November 12, 2026, [log](../mockup-changes/2026-11-12-queue-pull-to-refresh.md); the same pull also covers the Player app's leaderboard, club page and My sessions, and the Admin request inboxes)
- **Ticket:** needed
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Queue](workstreams/queue.md), [Player](workstreams/player.md)
- **Amended by:** [D-2026-11-13-01](#d-2026-11-13-01) (B-08): screens get live updates from the Go API. Refresh, pull-down and tab-return refresh stay as the fallback. What a player may see (masked names, own standing only, unpublished results out of the page data) is unchanged.
- **Decision:**
  - **No live updates.** The owner's words: "player view is never live." The page refreshes only its data, never the whole page. The player can pull down or tap **Refresh**, at most once every 10 seconds, and it also refreshes when they come back to the tab. A thin bar shows "Updated 7:42 PM · Refresh", adding "Venue changes haven't synced yet" when the server knows the venue has changes it hasn't received. The QM still calls names out loud. No polling, no push notifications and no Supabase Realtime.
  - **Where it goes.** A **My night** card sits above the Details and Participants tabs. **Courts now** and the read-only **Queue** go inside Details. No new tab.
  - **My night card, by stage:**
    - Present: "3 of 6 games played · 2W 1L", then "In queue #3 · with A vs B, C" (or "Not in a queued match"), with **Request a match** and **I'm leaving**.
    - On court: "You're on Court 2 · with A vs B, C", highlighted.
    - After the minimum: "6 of 6 · Minimum reached", then "7 games · minimum 6". The count matches the QM roster's count.
  - **Courts now** shows each court's players (names as in [D-2026-11-09-02](#d-2026-11-09-02)) and "Started 7:31 PM". No score and no running time.
  - **Own standing only.** During the session, the player sees only their own line, with no position and no one else's results. After the QM publishes, they see the published Standings with their own row highlighted. Unpublished results stay out of the page data. If results are never published: "Results for this session have not been shared." The player's own games remain in their Player Information match history.
  - **Finished:** "Session finished · 7 games · 4W 3L", Standings once they're published, and a link to Match history.
  - **My sessions.** Their own profile in the Player app has a **My sessions** card listing the upcoming and live sessions they requested, are confirmed in or are waitlisted in, each linking to `/s/<slug>`. It loads once when the profile opens. A player confirmed in two sessions the same night sees both. An approved join request shows on that player's next refresh.
- **References:** [Public session screens](../screens/product/modules/queue/public-session.md) (Signed-in Player access), [results sharing](../screens/product/modules/queue/results-sharing.md). Server load: [D-2026-11-09-09](#d-2026-11-09-09).

<a id="d-2026-11-09-05"></a>
### D-2026-11-09-05 — Match requests
- **Decision status:** approved (owner discussion, November 9, 2026)
- **Implementation status:** in progress — the Queue Master side (Requests · N with Join and Match tabs, Add to queue / Decline, request formats; #616, #618) is in the mock app. Real mode does not save `requestFormats` or decide match requests yet (no Prisma column).
- **Ticket:** needed
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Queue](workstreams/queue.md)
- **Decision:**
  - **What it is.** A present, signed-in, confirmed player can send **Request a match**. In the sheet they pick:
    - the format, if the session has more than one;
    - a partner and opponents from the present players (doubles: 1 partner and 2 opponents; singles: 1 opponent), or leave a spot as "Anyone".

    Once it's sent, the player sees "Match request sent · the QM decides", with **Cancel**.
  - **Who sees presence.** Presence shows only inside that picker, and only to signed-in confirmed players. Players on a court or already in a waiting match can still be picked.
  - **Limits.** One open match request per player. The other players named aren't asked to agree and aren't told. Only the QM sees requests.
  - **QM side.** One **Requests · N** button with **Join** and **Match** tabs. Drop-out notices show there too, and self check-ins show on the roster. Counts arrive with the QM's existing refresh, with no extra requests. Each match request card shows each player's games played against the minimum, their level, and "On Court 2" or "In queue #3" where it applies. The QM taps **Add to queue**, which makes it a waiting match, or **Decline**. The QM judges fairness, and the server doesn't block requests.
  - **Closing.** A request closes by itself when anyone named stops being present, or when the session ends.
- **Name:** **Match request**, distinct from Join request.
- **Amended by:** [D-2026-11-09-11](#d-2026-11-09-11) (six formats and the picker controls).
- **References:** [matches module](../business_logic/product/queue/modules/matches/), [queueing module](../business_logic/product/queue/modules/queueing/).

<a id="d-2026-11-09-06"></a>
### D-2026-11-09-06 — Registration from session and club links, guest linking and club membership
- **Decision status:** approved (owner discussion, November 9, 2026)
- **Implementation status:** in progress — the Queue club side (Joined via marks, Link to saved player…, guest linking: #622, #625, #627) is in the mock app; the Player side is in the mock app too (epic P06, #588); the Admin parts are not started. Real mode does not persist it.
- **Ticket:** #622, #625, #627
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Player](workstreams/player.md), [Queue](workstreams/queue.md)
- **Supersedes:** in part the [#490](https://github.com/jose-codegourmet/rotra-v2/issues/490) rule in [D-2026-11-07-07](#d-2026-11-07-07) that registration only opens from a club invitation and always keeps the guest record unlinked.
- **Decision:**
  - **Three ways in from the session page:** **Continue as guest**, **Log in with ROTRA Player** and **Register with ROTRA**. Registering opens the registration form under the session's club and returns to `/s/<slug>` signed in, with the request ready to send. Guests are kept.
  - **Club membership, in the owner's words:** "A guest should be binded by a club id. if they happen to click the registration link from that club. then they are registered via that club. if they happen to register via admin link. then they will have not club affiliated with it. BUT..... if the club owner happens to pull their records from the rotra system, then they will be part of that club. players CAN have multiple clubs."
    - Registering through a club's link or a session link adds the player to that club's Saved players, marked "Joined via club link" or "Joined via session link".
    - Registering through the Admin link gives no club.
    - A club can add a registered player by RTR ID, QR or phone without the player's approval. Being in a club's Saved players is what makes them part of that club. If the club deletes them from Saved players, they leave the club.
    - A player can belong to several clubs.
  - **Linking guest history.** When a guest registers through a club's link, the server looks for a likely match by phone. The QM sees "Is this <name> from your saved players?" and taps **Link** once, and only then does the guest history merge. The QM can also link by hand ("Link to saved player…") when the guest left no phone. Nothing merges automatically. Earlier valid games then count as the October 28, 2026 decision already says.
  - **RTR ID location for Admin-link registrations.** The form asks for their city or province, picked from the same location list clubs use, and the ID uses that. Club-link registrations keep the club's location.
  - **Email confirmation.** The player is signed in right away and confirms the email later. A banner keeps asking until they do, and some actions (for example a contact change) wait until it's confirmed. Supabase sends auth emails through a proper email provider (for example Amazon SES or Resend), not the built-in testing email. Which provider is chosen when it's set up.
  - **Spam.** Limit registrations per device or network for each hour.
  - **Your clubs** shows on the player's own profile only, with **Leave club** (removes them from that club's Saved players; past games stay) and **Report a problem** for each club.
  - **Report a problem** opens an email to ROTRA support, with the club name and RTR ID filled in. There's no table and no Admin screen in v1. **The support address is a placeholder; the owner supplies it before the real-app ticket ships.**
  - **Ranking risk accepted.** A club that adds a player can record games that count toward that player's shared rank. This is accepted for v1. The protection is Report a problem, plus Admin marking that club's sessions invalid.
  - **Linking a guest who shares a session with the saved player** (owner, November 10, 2026): the link is refused, and the Queue Master removes one of the two slots first. No ranking or payment surprises.
  - **Names for the three invites:** **Registration invite** (per guest, already exists), **Club invite link** and **Session invite** (see [D-2026-11-09-08](#d-2026-11-09-08)).
- **Amended by:** [D-2026-11-12-04](#d-2026-11-12-04) (the Your clubs card becomes a Clubs card on every readable profile; Leave club moves to the club page; Report a problem is removed).
- **References:** [registration screens](../screens/product/modules/player-information/access-registration.md), [identity module](../business_logic/product/player-information/modules/identity/README.md), [product terms](../product-terms.md) (Registration invite, Unclaimed profile, RTR ID).

<a id="d-2026-11-09-07"></a>
### D-2026-11-09-07 — Public or private player profile
- **Decision status:** approved (owner discussion, November 9, 2026)
- **Implementation status:** not started — mockups updated November 9, 2026 (`NEW` logs dated 2026-11-09 in [mockup-changes](../mockup-changes/README.md))
- **Ticket:** needed
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Player](workstreams/player.md)
- **Decision:**
  - **The switch.** A player chooses **Public** or **Private**, on the **Privacy and contact** page next to the phone privacy switch. Profiles are public by default. In the owner's words, "private means guests dont see their rotra profile". Signed-in ROTRA players still see a private profile.
  - **What a visitor sees** (not signed in). One rule everywhere: private players and guests are masked and don't open. That covers the leaderboard, other players' profiles and match history, share images, and club result images.
    - **Leaderboard:** a private player keeps their position, but the name is masked and the row doesn't open. Name search doesn't match them.
    - **RTR ID search:** a private player's ID gives the same neutral "Profile not found" as an unknown ID.
    - **A shared link** to a private profile shows "Log in with ROTRA to see this profile." There are no share tokens.
    - **Club Standings and Awards images:** private players show masked. Guests stay as the club shows them today.
- **References:** [Player profile screens](../screens/product/modules/player-information/profile.md), [identity and privacy screens](../screens/product/modules/player-information/identity-privacy.md), [ranking and history screens](../screens/product/modules/player-information/ranking-history.md).

<a id="d-2026-11-09-08"></a>
### D-2026-11-09-08 — Sharing: links, QR codes and post/story images
- **Decision status:** approved (owner discussion, November 9, 2026)
- **Implementation status:** in progress — the Queue club side (club invite link, invite card, Share club invite on Home: #620, #621, #624, #626) is in the mock app; the Player side is in the mock app too (epic P06, #588); the Admin parts are not started. Real mode does not persist it, except the club invite code: `?k=` is checked on the server and Regenerate link replaces it (P08.7, #712).
- **Ticket:** #620, #621, #624, #626
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Player](workstreams/player.md), [Queue](workstreams/queue.md)
- **Decision:**
  - **What every share offers**, in the owner's words: "share by link", "share by QR", and "sharing pictures such as fb posts and ig stories posts… follow the ratio". Images reuse the Session QR share card's **Post | Story** switch: 4:5 (1080 × 1350) and 9:16 (1080 × 1920), on the fixed dark brand card. Every invitation image has a QR ("anything invitation is always a QR"). Info images also carry a small corner QR that opens the player's profile, which follows the privacy setting.
  - **A player can share:**
    - **Rank card:** level, overall position and ladder.
    - **My session result:** position in the published Standings, games, W–L. It appears only after the QM publishes.
    - **Session games:** one card per session with date, club, each game (partner, opponents, score, or "Winner recorded") and W–L, shared from the session group in Match history. It also appears only after the QM publishes.
    - **Other players' names** on these images show the way a visitor would see them ([D-2026-11-09-07](#d-2026-11-09-07)).
  - **Session invite.** Confirmed and waitlisted players can invite someone with the session's share card, "<name> invites you to play". The link carries a short random invite code, one per player and session, created the first time they tap Share, stored in a small table and never the RTR ID. The QM's join request card shows "Invited by <name>". `invite` joins the values allowed through the login and registration round trip (with `tab` and `join`). **Invite** is hidden when requests are off or the session has finished. When the session is full, the card says "Waitlist open".
  - **Club invite link.** One standing link per club (`/register/[clubId]`) with a club share card (QR, Post | Story). It's in the club settings, plus **Share club invite** on the dashboard.
    - A new person registers through it and joins the club's Saved players ([D-2026-11-09-06](#d-2026-11-09-06)).
    - A signed-in ROTRA player who opens it sees "Join <club>?" and taps once to join.
    - **Regenerate link** stops the old link, and its QR images, from working.
  - **How images are made.** They're drawn on the phone, as the Session QR card already is, so there's no server cost. On phones, **Share** opens the phone's share sheet with the image attached, using the browser's built-in Web Share feature with no new dependency. Elsewhere, and in in-app browsers that don't support it, the button falls back to **Download image**. This hasn't been verified on real phones yet.
  - **Link previews.** One fixed branded preview image per type (session, club, profile), with a dynamic title only. There are no per-page generated preview images.
- **Amended by:** [D-2026-11-09-11](#d-2026-11-09-11) (a player can invite only before the session starts); [D-2026-11-12-01](#d-2026-11-12-01) (one `invite_code` column on clubs; the Post image stays 1080 × 1350).
- **References:** [session QR share card log](../mockup-changes/2026-11-08-queue-session-qr-share-card.md), [results sharing screens](../screens/product/modules/queue/results-sharing.md).

<a id="d-2026-11-09-09"></a>
### D-2026-11-09-09 — Keeping the session page cheap to serve
- **Decision status:** approved (owner discussion, November 9, 2026). The owner's priorities: "less server stress", "less server costs", "optimal QM and Player UX".
- **Implementation status:** not started — mockups updated November 9, 2026 (`NEW` logs dated 2026-11-09 in [mockup-changes](../mockup-changes/README.md))
- **Ticket:** needed
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Queue](workstreams/queue.md), [Backend](workstreams/backend.md)
- **Amended by:** [D-2026-11-13-01](#d-2026-11-13-01) (B-08): live push replaces "Not used: … polling, push notifications"; the cached snapshot and the server-side sign-in check stay.
- **Decision:**
  - **Split the page data in two.** A shared session snapshot (details, courts, queue, roster) is cached on the server for about 10 seconds. It comes in two versions per session: one for visitors (everything masked) and one for signed-in players (registered full names). A small personal part (my status, my games, my requests) isn't cached.
  - **Cost for one session of 24 players over 3 hours:** about 2,000 requests, mostly answered from the cache. If 24 players refresh at once, that costs about one database read.
  - **The sign-in check** on each refresh happens on the server itself (Supabase `getClaims`), without asking Supabase each time.
  - **The QM side** gets Requests counts with its existing refresh.
  - **Not used:** Supabase Realtime, polling, push notifications, scheduled jobs.
- **References:** [architecture](../architecture.md) (no Supabase Realtime; Player access to a public Queue session).

<a id="d-2026-11-09-10"></a>
### D-2026-11-09-10 — Uploaded pictures: keep only the current and the previous
- **Decision status:** approved (owner discussion, November 9, 2026). In the owner's words: "to save money on storage. everytime a user uploads image for avatar or club photo only 2 will be saved: current and previous."
- **Implementation status:** in progress — the Queue club side (club logo previous: #619, #624, #626) is in the mock app; the Player side is in the mock app too (epic P06, #588); the Admin parts are not started (court-picture uploads have no mockup yet). Real mode does not persist it.
- **Ticket:** #619, #624, #626
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Player](workstreams/player.md), [Queue](workstreams/queue.md), [Backend](workstreams/backend.md)
- **Supersedes:** in part [Club logo persistence (#374)](../database_design/product/admin/modules/clubs-licenses.md#club-logo-persistence-374), which keeps every previous logo for historical result snapshots, and the keep-everything behavior of [D-2026-11-08-03](#d-2026-11-08-03).
- **Decision:**
  - **What it covers.** Every user upload: player pictures (`player-avatars`), club logos (`club-logos`) and court pictures (kept per court), whether a player, a club or Admin uploads them.
  - **Use previous picture.** One tap in the picker swaps current and previous. Choosing a character or initials, or tapping **Remove**, makes the last photo the previous one, so it can be brought back. Characters and initials store no file.
  - **Cleanup.** In the same request, right after the new picture is saved, the server lists that owner's folder and deletes every file that isn't current or previous. A failed delete is cleaned up on the next upload. Extra files that exist today get cleared the same way, on each owner's next upload. There's no scheduled job.
  - **Storage.** A small migration adds one column next to each current reference (`avatar_previous_ref`, `logo_previous_ref`, and the same for court pictures).
  - **Old result images.** A result snapshot whose logo file is gone shows the club's current logo, or its initials.
  - **Stale caches are accepted.** A deleted picture may still show for a while in Facebook previews or browser caches. The app itself never points to a deleted file.
- **Scale note:** 10,000 players × 2 pictures × about 200 KB comes to about 4 GB.
- **References:** [profile picture storage](../database_design/product/player-information/modules/identity.md#profile-picture-storage-542), [club logo persistence](../database_design/product/admin/modules/clubs-licenses.md#club-logo-persistence-374), [court pictures log](../mockup-changes/2026-11-08-queue-setup-court-pictures.md).

<a id="d-2026-11-09-11"></a>
### D-2026-11-09-11 — Session page and Queue refinements from the owner's artifact review
- **Decision status:** approved (owner comments on the published Queue prototype, November 9, 2026). The comments are quoted in the matching [mockup logs](../mockup-changes/README.md).
- **Implementation status:** in progress — Queue Master side of epic Q18 (#586: Requests · N, the Checked in themselves mark, request formats; #616, #617, #618) is in the mock app; the rest is not started. Real mode does not save `requestFormats` yet (no Prisma column).
- **Ticket:** needed
- **Roadmap:** MVP (same scope as [D-2026-11-09-04](#d-2026-11-09-04) and [D-2026-11-09-05](#d-2026-11-09-05)) — [Queue](workstreams/queue.md), [Player](workstreams/player.md)
- **Amends:** [D-2026-11-09-01](#d-2026-11-09-01) (the picker is a slider, up to 5 matches), [D-2026-11-09-04](#d-2026-11-09-04) (Queue, Courts now and My night layout), [D-2026-11-09-05](#d-2026-11-09-05) (formats and picker controls), [D-2026-11-09-08](#d-2026-11-09-08) (when a player can invite).
- **Decision:**
  - **Match request formats.** The player picks **2 v 2** (default), **1 v 1**, **1 v 2**, **3 v 3**, **4 v 4** or **5 v 5**. A format the session doesn't allow is disabled. The session setup has a toggle per format for which kinds of games players may request.
  - **Choose partner / opponent picker.** It has **All · Playing · Available** tabs (Playing = on a court), a skill filter (Beginner, Intermediate, Advanced) and a sort: longest wait, shortest wait, fewest games (default) or most games.
  - **Invite only before the start.** The player **Invite** button shows only while the session hasn't started. This limits [D-2026-11-09-08](#d-2026-11-09-08), which had no such limit.
  - **Public Queue.** Signed-in Players see the next match (#1) pinned on top with a yellow glow, and #2 onward in a scrolling list with a bottom fade that disappears at the end. Each match is one horizontal row. No format label: the number of heads shows the format.
  - **Courts now** uses the Queue Master's court cards, read-only.
  - **My night** puts games played (with progress toward the minimum) and Won / Lost first, as large numbers.
  - **Clear queue.** The Queue Master gets a red **Clear queue** button that, after a confirmation, removes every waiting match. Matches on a court and finished matches are not touched.
  - **Next-match picker** is a slider: one eligible match at a time, #1 on the left, up to **5** matches, draggable, with a fade on the right while more cards follow and a games-played count on each face. It replaces "the first two" in [D-2026-11-09-01](#d-2026-11-09-01).
  - **Players tab player cards** (Queue Master) show only two numbers, large: **Played** (completed games) and **For the night** (played + queued games). Wait time sits in the status line.
  - **Main Queue search.** A search box finds a player by name or nickname, highlights their queued matches and fades the rest.
  - **Make match asks first.** The Players tab's Make match opens a confirmation with the court, each player's games played on their face and their skill level under their name. **Arrange to balance** evens the teams by level; Make match adds it to the end of the Main Queue.
- **Request format defaults (decided by the owner, Jose, 2026-11-10; option A).** A new session allows **2 v 2**; **1 v 1** follows the Singles switch; **1 v 2**, **3 v 3**, **4 v 4** and **5 v 5** are off. Sessions saved before this change, with no saved selection, behave the same until edited. This replaces his earlier 2026-11-09 comment on #618, which chose all off (option D).
- **References:** [Public session screens](../screens/product/modules/queue/public-session.md), [Match control › Q-NEXT-MATCH](../screens/product/modules/queue/match-control.md#q-next-match--next-match-picker-after-a-result), [mockup changes](../mockup-changes/README.md).

<a id="d-2026-11-09-12"></a>
### D-2026-11-09-12 — Club-set pictures for guests and unclaimed players
- **Decision status:** approved (owner, November 9, 2026): "Club Owners can set profile pictures to guests and unclaimed players".
- **Implementation status:** in progress — the Queue side is in the mock app (Edit details › Profile picture: Upload photo, Remove, Use previous picture, characters 8 per page; #623, #628). Real mode does not store club-set pictures yet (no `club_players.avatar_ref` / `avatar_previous_ref`, no upload cleanup).
- **Ticket:** #623, #628
- **Roadmap:** MVP — [Queue](workstreams/queue.md), [Player](workstreams/player.md)
- **Decision:**
  - The club (Queue Master or owner) sets the picture in **Saved players › player › Edit details**, for **Guest** and **Unclaimed** players only. A registered player owns their own picture; the club cannot change it.
  - The picture is an uploaded photo, one of the characters from the [character library](#d-2026-11-09-13), or initials. Characters and initials store no file.
  - **Only the current and the previous photo are kept**, the same rule as [D-2026-11-09-10](#d-2026-11-09-10). **Use previous picture** swaps them; **Remove** returns to initials and keeps the removed photo as the previous one.
  - It shows wherever that player appears for the club, including the public session page under the masking rules of [D-2026-11-07-06](#d-2026-11-07-06).
- **Owner answers (November 10, 2026):**
  - **On claim:** the club-set picture becomes the player's starting picture, which they can change.
  - **Storage:** on the club's saved-player record (`club_players.avatar_ref`, `avatar_previous_ref`) for guests and unclaimed players alike; on claim it follows the answer above.
  - **Characters:** Edit details uses the same picker and pager as P06.1 (#630), 8 per page; the mockup's eight faces are page 1 of the library.
- **References:** [mockup log](../mockup-changes/2026-11-09-queue-club-set-player-pictures.md), [open decisions](../business_logic/product/open-decisions.md).

<a id="d-2026-11-09-13"></a>
### D-2026-11-09-13 — Admin-managed profile character library
- **Decision status:** approved (owner, November 9, 2026): the character pictures players choose from "will be controlled in the admin app", and the library is only images the platform owner uploads.
- **Implementation status:** in progress — in the mock app (A07.1 CharacterGrid/ImageDropZone, A07.2 Admin library, A07.3 `/settings/profile-characters`). Real mode written on branch `fix/real-mode-characters-clubs-sessions` (draft tickets 408/409), not merged and not run against a database:
  - Table `profile_characters` (`packages/db/prisma/schema/admin/profile-character.prisma`, migration `20261111000100_profile_characters`, applied), seeded with the 24 mock characters under the same ids, so every saved `character:<id>` keeps resolving. Delete is a soft delete (`deleted_at`), so Undo works.
  - Services in `packages/db/src/admin/profile-characters.ts`: Admin list, add (one image per request, PNG/JPEG/WebP up to 1 MB, bytes checked, stored at `profile-characters/<id>.<ext>`), show/hide, delete, restore, with the keep-8-shown rule on the server and an `admin_audit_events` row per change; a public list of shown images. `updatePlayerAvatar` accepts any id that exists, is shown and is not deleted.
  - Routes: Admin `/api/profile-characters` (GET, POST), `/shown`, `/[id]` (PATCH, DELETE), `/[id]/restore`; Player `/api/profile-characters/shown`; and `/api/profile-characters/[id]/image` in Queue, Player and Admin, which serves any library image (hidden and deleted too). In real mode `profileCharacterImage` falls back to that path for an id no loaded list named. The id `''` travels as `_` in a path.
  - **Setup by hand:** create the public Supabase Storage bucket `profile-characters` in the dashboard (images only: `image/png`, `image/jpeg`, `image/webp`; 1,048,576-byte object limit; no browser insert/update/delete policies), as `player-avatars` was.
  - Not covered: the Queue club picture editor (`PROFILE_CHARACTER_IDS`) and the screens that call `profilePictureSrc` from `@rotra/ui` (Queue lists, Admin player card and detail) still draw the built-in faces for ids `''`/a–g and initials for any other id; they do not read the library or the image route yet.
- **Ticket:** #644, #645, #646
- **Roadmap:** MVP — [Admin](workstreams/admin.md), [Player](workstreams/player.md)
- **Decision:**
  - **Admin › Settings › Profile characters** is a plain grid of images. The admin adds images by dragging them in (images only, up to 1 MB each, cropped to a square). Clicking an image hides or shows it (hidden images are dimmed). A small x deletes one, with a short Undo.
  - At least **8** images must stay shown. There is no generated character, no names and no ordering: players see the shown images in upload order.
  - **Players' picker** shows only the shown images, **8 per page** with a pager. A player who already uses an image that is later hidden or deleted keeps showing it. Admin's edit-player sheet and the club's picture editor ([D-2026-11-09-12](#d-2026-11-09-12)) use the same list.
- **Storage:** a character library (image reference, shown, position, created) in Supabase Storage plus one small table; images are admin uploads only, so the keep-two rule of [D-2026-11-09-10](#d-2026-11-09-10) does not apply.
- **References:** [Admin screens](../screens/product/modules/admin/README.md), [mockup logs](../mockup-changes/README.md).

<a id="d-2026-11-09-14"></a>
### D-2026-11-09-14 — Admin edits everything on a player, with a beta-only password field
- **Decision status:** approved by the owner for **MVP or beta only** (November 9, 2026): "since admin, you should be able to edit everything. also password (for now) wrap it with *(for mvp or beta only)*". It conflicts with [D-2026-11-07-01](#d-2026-11-07-01); the owner confirmed D-2026-11-09-14 over D-2026-11-07-01 on 2026-11-10 (Jose). End date: not set (the owner has no timeline).
- **Implementation status:** in progress — in the mock app (A07.4 picture section, A07.5 full Edit player form, A07.6 Admin edits everything, A07.7 wiring); registered Player full-form PATCH and an admin-set password implemented in source; club-only edit is outside real-mode scope.
- **Ticket:** #647, #648, #649, #650
- **Roadmap:** MVP or beta — [Admin](workstreams/admin.md)
- **Amends:** [D-2026-11-07-01](#d-2026-11-07-01) for the beta only.
- **Decision:**
  - **Admin › Players › Edit** can change the player's picture ([D-2026-11-09-13](#d-2026-11-09-13)), name, nickname, playing style, experience, playing since, the four social links, Private profile, Hide phone from clubs, and phone and email (checked for format and uniqueness). A reason is required, and the change is written to the player's Activity log.
  - **Read-only:** RTR ID, created-by club, registered/unclaimed status, rank, level and match history (ranking math is not editable by Admin).
  - **Password.** The field is labelled **Password *(for MVP or beta only)***. The admin types a new password (at least 8 characters); empty leaves it unchanged; it is not available for unclaimed players. Only that it was set, and by whom, is recorded, never the password.
- **Real-mode scope and failure handling (owner, 2026-11-12):** implement this form for registered Player profiles first. If the login email or password cannot be confirmed, keep the other changes and report the Auth failure. Email updates must remain recoverable and cannot be called applied until the provider and the saved contact agree.
- **Conflict resolved (2026-11-10):** [D-2026-11-07-01](#d-2026-11-07-01) says "the Admin never sees" a player's password; the owner confirmed this decision over it. The field keeps the label "Password *(for MVP or beta only)*" until an end date is set; no end date is set yet.
- **Open contact-change requests (decided 2026-11-10, Option A):** on a direct Admin phone or email edit, the open request for that field is marked "Superseded by an Admin edit" (stored as rejected plus `supersededAt`), logged in the Activity log, and can no longer be approved or applied.
- **Picture change (2026-11-10):** an Admin save makes the old picture the previous picture on any picture change (photo, character or initials), as the Admin mockup does. Known gap: when the old picture was initials, no "Previous picture" row shows (the mockup shows one).
- **References:** [Admin screens](../screens/product/modules/admin/README.md), [mockup logs](../mockup-changes/README.md).

<a id="d-2026-11-11-01"></a>
### D-2026-11-11-01 — Observability: OpenTelemetry traces to Grafana Cloud, plus a local Grafana stack
- **Decision status:** approved by the owner (November 11, 2026). This is the decision AGENTS.md rule 11 requires for the new dependencies.
- **Implementation status:** implemented in the repository (instrumentation, local stack, docs). Not done yet: the Grafana Cloud stack and the Vercel `OTEL_*` variables, so production sends nothing until they are set.
- **Ticket:** none
- **Roadmap:** MVP — [Backend](workstreams/backend.md)
- **Decision:**
  - The Queue, Player and Admin apps export **OpenTelemetry traces** over OTLP with `@vercel/otel` and `@opentelemetry/api`, from each app's `src/instrumentation.ts` (service names `rotra-queue`, `rotra-player`, `rotra-admin`). No other observability dependencies.
  - Telemetry is **off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set**. Configuration uses only the standard `OTEL_EXPORTER_OTLP_*` variables.
  - **Production:** Grafana Cloud (free stack), exported directly from the functions, so it works on Vercel Hobby without trace drains. The variables live in the Vercel project env, never in the repository.
  - **Local:** `grafana/otel-lgtm` through `docker-compose.observability.yml` and `make observability-up` / `make observability-down`.
- **Not in MVP / Out of scope:** browser telemetry, Prisma query spans, metrics and log export.
- **References:** [observability](../observability.md), [architecture §2](../architecture.md#2-the-shape-of-the-system).
<a id="d-2026-11-11-02"></a>
### D-2026-11-11-02 — Join request: the player picks Join a slot or Be waitlisted, and can join from the waitlist
- **Decision status:** approved (Jose, November 11, 2026, voice call; who picks answered in the implementation brief for #706)
- **Implementation status:** in progress — mock app and real-mode services in #706; migration `20261111000200` applied 2026-11-11
- **Ticket:** #706
- **Roadmap:** MVP — [Queue](workstreams/queue.md)
- **Decision:**
  - “a player can request to join, but they can be waitlisted if they want, or they can just join the slot directly.” The **player** picks **Join a slot** or **Be waitlisted** on the request (guest form and signed-in one tap). The Queue Master sees the choice on the request.
  - **Players cannot join if the slots are full.** Before start, while every slot is taken, Join a slot is unavailable and refused by the server; only the waitlist remains. During play the Queue Master can admit additional players (#284–#287), so the choice stays open and the QM decides.
  - **If the slots are not full and a waitlisted player decides to join, they can join from the waitlist.** It is a join request like any other, so the Queue Master confirms it; if slots are full again by then, before start, the confirmation is refused and the player keeps their waitlist place. The Queue Master's own admission above the planned capacity during play (#284–#287) is unchanged.
  - Every request stays pending until the Queue Master confirms; nobody self-admits (existing rule).
- **Not in MVP / Out of scope:** a guest (not signed in) asking to join from the waitlist; a new admission model; changes to the slot budget, first-come waitlist order or Give slot / Fill N open slots.
- **References:** [Players › Join requests from the session link](../business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link), [Q-PUBLIC-JOIN](../screens/product/modules/queue/public-session.md#q-public-join--guest-join-request), [session_join_requests](../database_design/product/queue/modules/sessions-roster.md#session_join_requests), [mockup log](../mockup-changes/2026-11-11-queue-join-request-slot-or-waitlist.md).

<a id="d-2026-11-11-03"></a>
### D-2026-11-11-03 — Guests and unclaimed profiles stay in their club
- **Decision status:** approved (owner discussion, November 11, 2026)
- **Implementation status:** in progress — Queue mockup updated November 11, 2026 ([log](../mockup-changes/2026-11-11-queue-club-only-unclaimed.md)); storage and data migration done in P08.1 (`20261112000100_round2_profiles_banners_invites`: existing unclaimed `players` rows and RTR IDs moved onto their `club_players` records); services in P08.9 (#757, November 12, 2026: registered-only search, link-only sync, no identity check, automatic linking at registration, `club_player_claim_links` invites for club-only records, Admin rows “Not registered yet”); still open: a history attribution per linked record and a real-mode marker that distinguishes Lookup pending from a club-only unclaimed record
- **Ticket:** [#749](https://github.com/jose-codegourmet/rotra-v2/issues/749), [#757](https://github.com/jose-codegourmet/rotra-v2/issues/757) (epic #748)
- **Roadmap:** MVP — [Queue](workstreams/queue.md), [Player](workstreams/player.md)
- **Supersedes:** in part the October 28, 2026 owner decision that a phone-linked profile and its permanent RTR ID are created on the first entry sync, and the rule "the same phone number identifies the same profile across clubs" for unclaimed profiles.
- **Decision:**
  - **In the owner's words:** "guest should stay in the club's saved players and registered players live in rotra's saved players", and "Unclaimed profiles should never be found in other clubs. they should only live in club".
  - **Player Information search** (Queue › Add player and Saved players › Add player) shows **registered (claimed) players only**. Guests and unclaimed profiles are never found by another club, by name, nickname or RTR ID.
  - **Same phone in two clubs: keep separate** (owner choice). When Club B saves someone whose phone matches Club A's unclaimed profile, Club B gets its own record. Nothing links them while the person is unregistered. A phone that matches a **registered** player still links to that player, as today.
  - **RTR ID only on registration** (owner choice). An unclaimed profile has no RTR ID. The one permanent RTR ID is given when the person registers, using the location rules of [D-2026-11-09-06](#d-2026-11-09-06).
  - **On registration, records link automatically** (owner choice). Every club's unclaimed record with the same phone joins the new account, with no Queue Master tap. Earlier valid games then count under the October 28, 2026 history rules (original dates, each game once, permanent results unchanged).
  - **No identity check for unclaimed profiles.** They are the club's own records, so the Queue Master's **Confirm player** step (RTR ID matches / Scanned their QR / Phone confirmed) no longer applies to them. A pick with a level is added in one tap; a pick with no level still opens the level step.
- **Risk, accepted for MVP (owner answer, November 12, 2026):** registration does not verify the phone (no SMS, [identity](../database_design/product/player-information/modules/identity.md)). With automatic linking, someone who registers with another person's phone number would collect that person's guest history from every club. [D-2026-11-09-06](#d-2026-11-09-06) used a Queue Master tap (**Link**) to guard against this; the owner accepted the risk like the ranking risk in D-2026-11-09-06, with no Link tap, to be revisited when SMS verification exists.
- **Admin › Players (owner answer, November 12, 2026):** unclaimed club records are listed under their club, marked “Not registered yet”, with no RTR ID; the RTR ID search ignores them (the Admin mockup still lists them with RTR IDs). *Decided November 12, 2026 (P08.1):* existing unclaimed `players` rows move onto their club records and their RTR IDs are released; rows with game history would have stopped the migration (none existed).
- **References:** [product terms](../product-terms.md) (Unclaimed profile, RTR ID), [identity module](../business_logic/product/player-information/modules/identity/README.md), [players module](../business_logic/product/queue/modules/players/README.md), [Queue players and roster screens](../screens/product/modules/queue/players-roster.md), [identity database design](../database_design/product/player-information/modules/identity.md), code: `searchPlayerDirectory` in `packages/db/src/queue/club-players.ts`, `resolveClubPlayerIdentity` in `packages/db/src/player/identity.ts`.

### D-2026-11-11-04 — Offline writes: an outbox replayed through the existing adapters, plus a play-history file
- **Decision status:** approved (owner answers, November 11, 2026)
- **Implementation status:** built (#722, November 12, 2026): `packages/data/src/outbox/` (IndexedDB outbox next to the device copy, local apply through the mock reducers over the downloaded copy, ordered replay through the real adapters with learned ids, 409 → Q-CONFLICT with Keep the server's version / Retry, `playhistory.json` export/import in Club settings › This device). Still open: Generate matches drafts › Add to Main Queue stays online only; the guest review at Session done is a read-only notice (no link / create-unclaimed services yet, see D-2026-11-07-03); the mockup log is [IN MOCK APP](../mockup-changes/2026-11-11-queue-device-play-history-file.md)
- **Ticket:** [#722](https://github.com/jose-codegourmet/rotra-v2/issues/722) (unblocked)
- **Roadmap:** MVP — [Queue offline](workstreams/queue-offline.md)
- **Amended by:** [D-2026-11-13-01](#d-2026-11-13-01) (B-04): offline device enrollment is built with Go-owned sign-in. The outbox, replay and play-history file stay as decided; the rest of the device-stream protocol is still not built for MVP.
- **Supersedes:** the "CSV export/import" wording of the November 8, 2026 offline decisions (now a JSON file); the full device-stream protocol in [offline-sync.md](../database_design/product/queue/modules/offline-sync.md) is **not** built for MVP.
- **Decision:**
  - **Engine (option A).** Every change made offline on a downloaded, started session is recorded as a command (name, arguments, `operationId`) in an IndexedDB outbox and applied locally by running the existing mock-store reducers over the downloaded snapshot. When internet returns, the commands replay in order through the existing real adapters, which already carry idempotent operation IDs. A server disagreement (409) goes to Q-CONFLICT for Queue Master review. Nothing is lost on reload: the outbox and the local copy are durable on the device.
  - **Play-history file, for non-technical rescue.** Club settings › This device gets **Export play history** (downloads `playhistory.json`: the downloaded session, its local changes and the outbox) and **Import play history…** (loads such a file onto this device). In the owner's words: it is "for brute force sake (for non technical people)" — the automatic device storage is the normal path; the file is the fallback when a device dies or a session must move to another device. Importing is not a database sync; the imported commands join this device's outbox and replay like its own.
  - Session done still needs internet, complete sync and the guest review of [D-2026-11-07-03](#d-2026-11-07-03).
- **Not decided yet:** collision-free match numbers and court placement across two offline devices (the outbox replays in order; the second device's conflicting placement lands in Q-CONFLICT).
- **References:** [offline module](../business_logic/product/queue/modules/offline/README.md), [Club settings screen](../screens/product/modules/queue/access-home.md), code: `packages/data/src/device/deviceCopy.ts`, `packages/db/src/queue/sync.ts`.

### D-2026-11-11-05 — Rank comes from wins, weighted by who you beat
- **Decision status:** approved (owner answers, November 11, 2026: "all recommended" on the [ranking-by-wins proposal](../decisions/2026-11-11-ranking-by-wins/01-proposal.md))
- **Implementation status:** not started — real mode has no approved algorithm (`APPROVED_RANK_ALGORITHMS` is empty)
- **Ticket:** [#247](https://github.com/jose-codegourmet/rotra-v2/issues/247) (unblocked: write the worked examples and pick the constants there)
- **Roadmap:** MVP — [Ranking](workstreams/ranking.md)
- **Supersedes:** the 70% club assessments / 30% match performance blend; "saving a roster assessment immediately influences shared rank"; equal club weighting; "latest assessment per club within three months"; the two weight fields on A-RANK-CONFIG.
- **Decision:**
  - **Engine.** Each player has one hidden rating. Before a counted game the two teams are compared (team strength = average of its two players). After the game each player moves up or down by a step: beating a stronger team moves you up a lot, beating a weaker team a little; losing to a stronger team costs almost nothing, losing to a weaker team costs a lot. Clubs do not vote on the rating.
  - **What counts.** Only valid, full singles and doubles games in a valid, finished session. Fun games, invalid games or sessions and both players of a mid-game substitution do not count (as already decided). A game with only a winner counts the same as a game with a score.
  - **Score does not change the step** in v1 (option A on the proposal's question 5).
  - **New players start from the first night (option A).** The Queue Master's first level for the night seeds the starting rating. After that, assessments have **zero** influence on shared rank (question 3, option A). The level for the night stays local to that session and only helps Generate matches pair people.
  - **Provisional** until about 10 counted games, with a bigger step; the rank card says "Provisional" and there is no leaderboard position yet.
  - **Nine levels stay as bands** on the rating; the shown level is read off the rating.
  - **Window and clock:** three months means **90 rolling days**, day boundary **Asia/Manila midnight**. Saving new Admin settings **recomputes everyone** from the stored game facts (rank is a projection; the facts never change).
  - **Inactivity:** no counted games for 90 days → rank stays visible as Needs reassessment and the player leaves the leaderboard; on return they are Provisional again for a few games. Nobody is silently reset to Beginner.
  - **Leaderboard:** overall ROTRA only; 10 counted games in the window (Admin-adjustable); ordered by rating; ties: more counted games in the window first, then name. Private players keep their position with a masked name.
  - **Admin settings** replace the 70/30 fields with: normal step size, Provisional step size, Provisional game count, leaderboard game count, window length.
  - **Session awards (Most Improved, Off Day):** the prototype formula is approved **as is** for v1 (question 18, option A).
  - **Generate matches:** the prototype's draft weights are the official v1 pairing rule (question 19, option A).
  - **Accepted risks:** clubs that never mix are islands until players travel; padding earns little because beating weak teams earns little; partner luck averages out over 10+ games.
- **Not decided yet:** the actual constants (band edges, step sizes), chosen in #247 together with the worked examples.
- **References:** [proposal](../decisions/2026-11-11-ranking-by-wins/01-proposal.md), [ranking module](../business_logic/product/player-information/modules/ranking/README.md), [Admin configuration module](../business_logic/product/admin/modules/configuration/README.md), [ranking database design](../database_design/product/player-information/modules/ranking.md).

### D-2026-11-11-06 — Roster payments, shuttle prices and license terms
- **Decision status:** approved (owner answers, November 11, 2026)
- **Implementation status:** partly in the mock app (paid mark survives demotion already); Admin mockup updated November 11, 2026 ([log](../mockup-changes/2026-11-11-admin-license-no-start-date.md))
- **Ticket:** [#245](https://github.com/jose-codegourmet/rotra-v2/issues/245) (unblocked), [#377](https://github.com/jose-codegourmet/rotra-v2/issues/377) (decided, closed)
- **Roadmap:** MVP — [Queue](workstreams/queue.md), [Admin](workstreams/admin.md)
- **Decision:**
  - **Paid mark survives demotion.** A player marked paid who is moved to the waitlist keeps the mark, and it shows again if they regain a slot (prototype behaviour).
  - **Payments after Session done.** The Queue Master can tick paid / not paid after Session done; payments are bookkeeping and never reopen or change results (audit record, as already decided).
  - **Shuttle price is snapshotted** when the shuttle plan line is saved, so history stays true when inventory prices change. (The prototype used the live price; it follows through a ticket.)
  - **A level for the night saved for a roster player who is removed before start is dropped.** Moot for shared rank under [D-2026-11-11-05](#d-2026-11-11-05), where assessments never feed rank after the first night.
  - **License terms stack.** A renewal starts the day after the current term ends; an early renewal never shortens or overlaps the current term. A club with no current term starts today.
  - **No Starts on field.** The A-LICENSE sheet shows the computed period read-only; the field is removed from the Admin mockup (rule 15).
  - **Payment history shows both references:** the generated `LIC-####` number and the owner-typed text, kept as a note.
- **Not decided yet:** refunds; currencies other than pesos; automatic stock deduction; offline inventory edits.
- **References:** [clubs and licenses module](../business_logic/product/admin/modules/clubs-licenses/README.md), [financials module](../business_logic/product/queue/modules/financials/README.md), [A-LICENSE screen](../screens/product/modules/admin/clubs-licenses.md).

### D-2026-11-11-07 — Club sign-in identity, password reset, error copy and founding cities
- **Decision status:** approved (owner answers, November 11, 2026)
- **Implementation status:** sign-in identity and Q-LOGIN copy already in real mode; club password-reset request and Admin notification not started; Admin-added cities not started
- **Ticket:** [#381](https://github.com/jose-codegourmet/rotra-v2/issues/381), [#382](https://github.com/jose-codegourmet/rotra-v2/issues/382), [#380](https://github.com/jose-codegourmet/rotra-v2/issues/380) (all decided, closed); implementation tickets needed for the reset request and the city registry
- **Roadmap:** MVP — [Queue](workstreams/queue.md), [Admin](workstreams/admin.md)
- **Decision:**
  - **Club sign-in** keeps the synthetic provider login `<username>@clubs.rotra.invalid`. No username-capable provider adapter.
  - **A club username change rewrites the provider login** in the same operation.
  - **Forgotten club password:** the club sends a reset request from Q-LOGIN; the platform owner gets an **Admin notification** (Admin › Requests), sets a temporary password and gives it to the club outside ROTRA. The club changes it from Club settings afterwards.
  - **Q-LOGIN** invalid credentials: **"Username or password is incorrect."** (confirmed).
  - **A-ADD-CLUB:** there is no password policy beyond the existing minimum of 8 characters. When the provider rejects the initial password, the form shows a generic **"Password incorrect. Try another password."** under the password field; no policy text is shown up front.
  - **Founding cities:** the six prototype cities and codes are the approved v1 list. **The platform owner adds a city from Admin** (Admin › Settings); no code change. A corrected founding city never changes issued RTR IDs.
  - **RTR ID is display only.** Every record keys on the player's UUID; the RTR ID is a label on the profile (already the design).
- **Not decided yet:** sequence formatting above 9999 (first come, first served allocation by the database is confirmed, see [D-2026-11-11-08](#d-2026-11-11-08)).
- **References:** [clubs and licenses module](../business_logic/product/admin/modules/clubs-licenses/README.md), [identity module](../business_logic/product/player-information/modules/identity/README.md), [Q-LOGIN](../screens/product/modules/queue/access-home.md), [A-ADD-CLUB](../screens/product/modules/admin/clubs-licenses.md), code: `packages/db/src/auth/sign-in.ts`.

### D-2026-11-11-08 — Accounts and registration links: no email verification, 8 characters, links last 24 hours
- **Decision status:** approved (owner answers, November 11, 2026)
- **Implementation status:** real mode issues 7-day links and confirms the email at claim; the 24-hour expiry and the Admin unlink are not started
- **Ticket:** [#244](https://github.com/jose-codegourmet/rotra-v2/issues/244) (unblocked; remaining items listed below)
- **Roadmap:** MVP — [Player](workstreams/player.md), [Admin](workstreams/admin.md)
- **Supersedes:** the **7-day** registration-link lifetime of November 7, 2026 (#244). Single use and reissue-revokes-the-old-link stay.
- **Decision:**
  - **No email verification on claim.** Opening the club's registration link is the proof; the claim confirms the email at once (as real mode already does).
  - **Password rule:** at least 8 characters, nothing else.
  - **Registration links expire 24 hours after issue.** Still single use; the Queue Master can reissue, which revokes the old link. In the owner's words: "QMs are responsible for the links".
  - **A link claimed by the wrong person is not undone.** The Queue Master creates a new player for the right person; the claimed account stays as it is. The short lifetime is the guard.
  - **Name-only guests** can be invited later, once the club adds a phone or email to the record.
  - **RTR ID sequence:** the database hands out the next number first come, first served (already how `rotra_next_player_sequence()` works).
- **Not decided yet:** contact-change approval evidence beyond the owner's manual review; failed provider application recovery beyond "Application failed".
- **References:** [identity module](../business_logic/product/player-information/modules/identity/README.md), [identity database design](../database_design/product/player-information/modules/identity.md), code: `packages/db/src/player/claim.ts`, `/api/club/players/[clubPlayerId]/registration-link`.

### D-2026-11-11-09 — Public pages: cookie receipt, pages stay while licensed, never indexed, 90-day private retention
- **Decision status:** approved (owner answers, November 11, 2026)
- **Implementation status:** cookie receipt exists (#398 proposal); the no-index and per-request rules need checking in the Queue app; the 90-day sweep has no runner (jobs parked, [D-2026-11-11-10](#d-2026-11-11-10))
- **Ticket:** [#248](https://github.com/jose-codegourmet/rotra-v2/issues/248) (unblocked), [#398](https://github.com/jose-codegourmet/rotra-v2/issues/398)
- **Roadmap:** MVP — [Queue](workstreams/queue.md), [Player](workstreams/player.md)
- **Decision:**
  - **Join-request receipt is a browser cookie.** A lost cookie means the visitor asks the club; no secret link, no SMS.
  - **Public result pages have no time limit while the club is licensed.** The six-month deletion after continuous license expiry stays as decided.
  - **Never crawlable, never static.** Every public page (session page, published results, public profiles) is served per request with `noindex, nofollow` (meta and `X-Robots-Tag`) and is disallowed in `robots.txt`. No static generation, no ISR; the short per-request cache of [D-2026-11-09-09](#d-2026-11-09-09) is allowed because it is still request driven.
  - **No Unpublish button.** Republishing with a new selection stays the only change after publication.
  - **Private retention: 90 days.** Join requests (they hold phone numbers), server request logs and generated exports are deleted 90 days after they were created. Players' match history and ranks are never touched by this.
- **References:** [results module](../business_logic/product/queue/modules/results/README.md), [access and retention](../database_design/product/access-retention.md), [public session screen](../screens/product/modules/queue/public-session.md).

### D-2026-11-11-10 — Housekeeping: #243 closed as overtaken, no club accent for MVP, scheduled jobs parked
- **Decision status:** approved (owner answers, November 11, 2026)
- **Implementation status:** n/a
- **Ticket:** [#243](https://github.com/jose-codegourmet/rotra-v2/issues/243) closed; [#395](https://github.com/jose-codegourmet/rotra-v2/issues/395) closed; [#545](https://github.com/jose-codegourmet/rotra-v2/issues/545), [#546](https://github.com/jose-codegourmet/rotra-v2/issues/546), [#547](https://github.com/jose-codegourmet/rotra-v2/issues/547) parked
- **Roadmap:** [Backend](workstreams/backend.md)
- **Supersedes:** the implementation timing of [D-2026-11-08-04](#d-2026-11-08-04) (pg_cron): the design stands, the work is **not for MVP**.
- **Decision:**
  - **#243 (Prisma version, migration ownership, database access) is closed as overtaken:** real mode runs on Prisma with applied migrations. The one leftover, turning on row-level security (#387), stays its own chore.
  - **No club accent colour for MVP** (#395 closed).
  - **Daily jobs are parked.** License lapse, the retention sweep and ranking ageing get no scheduler for MVP. Until then: "Needs reassessment", leaderboard eligibility and license state are **computed when a page is read**, and the 90-day retention of [D-2026-11-11-09](#d-2026-11-11-09) runs by hand when needed.
- **References:** [backend workstream](workstreams/backend.md).

### D-2026-11-11-11 — The November 11 design proposals are approved as shown in the prototypes
- **Decision status:** approved (owner review of the three prototype artifacts on November 11, 2026; "please merge these artifacts to mock and update the decision logs and the affected")
- **Implementation status:** in the mockups (merged to main with this decision). The round-2 design (photo viewer, profile banners, visibility, circle avatars and character picker, live console, club-only unclaimed profiles, club invite code, Admin license period) is built in the mock app and real mode on Epic P08 (#748, tickets #749–#759, November 12, 2026); its mockup logs are IN MOCK APP. Answers to the leftovers: [D-2026-11-12-01](#d-2026-11-12-01)
- **Ticket:** #739, #738, #737, #736, #735, #731, #730, #716, #715 (the design parts), plus the comment-driven changes logged the same day; #712 (server-side, unchanged) and #725 (parked) carry no mockup change
- **Roadmap:** MVP — [Queue](workstreams/queue.md), [Player](workstreams/player.md), [Admin](workstreams/admin.md)
- **Decision:** every change logged in [docs/mockup-changes](../mockup-changes/README.md) dated 2026-11-11 from the proposal branch is the agreed design. The owner's answers that shaped them, by ticket:
  - **#739 Bagging mode:** doubles only; one session-wide switch; a pair's games are chosen as **ALL** or game numbers up to the session minimum; an applicable pair with both players free leads the next doubles draft (pair beats fairness, court capacity still wins); a player is in one pair at a time; Queue Master only; pairs guide every Generate tab including Catch Up, never Auto Queue or hand-built matches. The Add pair dialog is a wide tap-to-pair avatar grid with level rings and no level text.
  - **#738 Share profile:** a separate action on the own profile; the card shows the ranking when there is one and the number of wins (last 90 days); downloadable Post and Story images plus the system Share sheet; QR to the public profile; a visible link field with Copy; own profile only.
  - **#737 Public club page:** Player app, epic **P07**, `/clubs/[clubId]`; registered members only with the same masking as the session page; no banner on the club page; stat cards; a Next up card; the Queue dashboard's month calendar with the complete schedule; a full Members page with search, level filter and A–Z groups; member clicks open the profile dialog.
  - **#736:** no focus ring after a tap on any tab bar; a thin ring stays for keyboard focus.
  - **#735:** players step down to the waitlist before Start and after Start when not in a match (the button is hidden while they are in one); the Queue Master confirms an overfill once and the count shows 25/24; expected games follow every roster change; paid mark and level survive a step-down.
  - **#731 / #715 / #716:** every participant tile opens a dialog for a signed-in player: a banner profile card (same card for the Queue Master's player profile); a private player's card shows their picture and banner only, with the text "This player has chosen to keep their ROTRA profile private…"; a guest's card says there is no profile yet. **Profile visibility** has three levels (Public · Private · Always private; default Private) plus **Hide me from Player Information**; an always-private player's **face and banner stay public**, only name, level and games are hidden. Any avatar with a real picture opens the full photo; where the tap already opens a profile, the photo opens from inside it.
  - **#730:** court lines carry their own times in the session's When style; the post ends with "To join and see the full roster, open this link: [public session page]".
  - **Profile banners:** players pick one of the **predefined banners** managed by the platform owner in Admin › Settings › Profile banners (like profile characters); no uploads by players. The big profile picture and every other avatar are circles. The character picker is 5 circles across, 15 per page (Admin keeps at least 15 shown).
  - **Live console:** Match requests at the upper right in a noticeable colour; join requests end at Start; three live controls plus a More menu; Courts and time lists each court and lets a court's time change during a match; Grid view is two columns on phones.
  - **Admin image libraries:** plain tiles (the card layout was reverted on request) with an upload progress bar.
- **Not decided yet:** the ranking constants for #247. The other leftovers were answered on November 12, 2026 ([D-2026-11-12-01](#d-2026-11-12-01)); MVP timing of #739 and #737 is moot, both shipped on 2026-11-12 (#747). Earlier wording: MVP timing of #739 and #737 (the owner asked for both in the prototypes; the scope freeze D-04 still governs the real-app order).
- **References:** the mockup logs dated 2026-11-11, the three prototypes, the decision pack artifact.

<a id="d-2026-11-12-01"></a>
### D-2026-11-12-01 — Answers to the leftover questions of the November 11 round
- **Decision status:** approved (owner answers, November 12, 2026: the recommended option for every question)
- **Implementation status:** in progress on Epic P08, [#748](https://github.com/jose-codegourmet/rotra-v2/issues/748). Built in the mock app and real mode: tokens and photo viewer (#750, #758), schema (#749), UI components (#751, #752), banners (#754), visibility (#753), club invite code (#755), live console and Admin license period (#756), club-only unclaimed profiles (#757). Docs and status (#759). Not run against a production database.
- **Ticket:** #748 (epic), #749, #750, #751, #752, #753, #754, #755, #756, #757, #758, #759
- **Roadmap:** MVP — [Queue](workstreams/queue.md), [Player](workstreams/player.md), [Admin](workstreams/admin.md)
- **Decision:** the answers, by question:
  - **#716, photo colours:** one shared token pair, `--photo-scrim` and `--photo-fg`, for all three apps, built as one ticket (#750).
  - **#715, profile visibility:** stored as a `profile_visibility` enum (`public` · `private` · `always_private`) plus a separate `hidden_from_directory` flag. Existing Private profiles become `private`, all others `public`; new registrations default to Private.
    - The Queue Master of a session the player joined sees an always-private player's name.
    - An always-private leaderboard row shows the position, hides the level, and keeps the picture and banner.
    - **Hide me from Player Information** applies to Queue › Add player › Player Information and to RTR ID search only. Saved players, Admin and the public session page are unchanged.
  - **#712, club invite code:** one `invite_code` column on `clubs`. Every club got a code in the migration. A plain club link without a valid code is refused.
  - **Profile banners:** a `profile_banners` table and a `profile-banners` Storage bucket, modelled on profile characters ([D-2026-11-09-13](#d-2026-11-09-13)); `players.banner_id`. The default banner is the first shown banner when Court is hidden or deleted. The bucket was created on 2026-11-12 with the same settings as `profile-characters`.
  - **[D-2026-11-11-03](#d-2026-11-11-03), unclaimed profiles:** the unverified-phone risk is accepted for MVP (automatic linking at registration; revisit when SMS verification exists). Admin › Players lists unclaimed club records under their club as “Not registered yet”, with no RTR ID. Existing unclaimed `players` rows were migrated into club-only records and their RTR IDs released (migration `20261112000100`); club-record claim links came with `20261112000200`.
  - **Share image:** the Post image stays 1080 × 1350. The question of MVP timing for the club page and Bagging mode is moot: both shipped on 2026-11-12 (#747).
- **Still open:**
  - A real-mode marker for a club-only record whose phone lookup found nobody: “Lookup pending” versus “Unclaimed” in Saved players.
  - Admin › Add player still creates an unclaimed `players` row with an RTR ID, which contradicts “RTR ID only on registration”.
  - The public club page's Join button sends the current invite code to anyone who opens the page.
  - The Edit profile banner swatches cannot show a banner Admin later hid.
  - Drop-out notices are not closed at Start.
- **Amends:** [D-2026-11-09-07](#d-2026-11-09-07) (three levels), [D-2026-11-09-08](#d-2026-11-09-08) (invite code), [D-2026-11-11-03](#d-2026-11-11-03) (risk accepted, Admin listing), [D-2026-11-11-11](#d-2026-11-11-11) (leftovers answered).
- **References:** [mockup logs dated 2026-11-11](../mockup-changes/README.md), [identity database design](../database_design/product/player-information/modules/identity.md), migrations `20261112000100_round2_profiles_banners_invites` and `20261112000200`, [real-mode ticket status](README.md).

<a id="d-2026-11-12-02"></a>
### D-2026-11-12-02 — Club members join upcoming sessions right away; Always require a request (#764)
- **Decision status:** approved (owner's words logged in #764, November 12, 2026; open points decided by the implementing agent, to be confirmed by the owner)
- **Implementation status:** built in the mock app and real mode in one change (#764): mockup, `@rotra/data`, `@rotra/db` (migration `20261112000300_session_always_require_request`, applied to the shared database 2026-11-12), SessionLinkCard, JoinRequestCard, the Queue preparation and public page containers, the Player app's join and access routes. Not browser-checked in real mode.
- **Ticket:** [#764](https://github.com/jose-codegourmet/rotra-v2/issues/764)
- **Roadmap:** MVP — [Queue](workstreams/queue.md)
- **Owner's words:** “whenever a player is already a club member. they should be able to join a upcoming session · on going sessions would be a request still · BY default, guests or non club members should request · But if already member they can join right away · BUT if QM sets the Session to be ALWAYS require a request.. then it should be mandatory · the default is ALLOW members to join upcoming sessions”.
- **Decision:**
  1. **Setting.** A second switch on the **Session link card** (Queue › preparation › Overview), directly under **Accept join requests**: **Always require a request**. Helper when on: “Club members send a join request too, like everyone else.”; when off: “Club members join upcoming sessions right away; guests still send a request.” Disabled (and read as off) while Accept join requests is off. Default off. Toasts “Members must request now” / “Members can join right away”. Data: `QueueSession.alwaysRequireRequest`, `queue_sessions.always_require_request Boolean @default(false)`, `PublicSessionPage.alwaysRequireRequest`; `useSetAlwaysRequireRequest` modelled on `useSetAcceptJoinRequests` (same `PATCH /api/sessions/[sessionId]`).
  2. **Club member** = a registered Player linked to one of the session club's **current** saved player records (`club_players.player_id = player`, `removed_at IS NULL`). Guests and unclaimed profiles are never members. Mock: `linkedClubPlayerIds` / `memberClubPlayer`. A saved record without a playing level sends a request like a non-member, so the Queue Master sets the level.
  3. **Upcoming vs ongoing.** Upcoming = session state `prepared`; ongoing = `active` (after Start session). Online join requests already close at Start ([D-2026-11-11-11](#d-2026-11-11-11); the page shows “The session has started, so online join requests are closed. Ask the Queue Master at the venue to add you.”). Nothing changes after Start: no self-join, the notice stays.
  4. **Full slots.** When every slot is taken, a member's direct join puts them straight on the **waitlist** (a real waitlist entry, not a request), consistent with #706 / [D-2026-11-11-02](#d-2026-11-11-02). The **Join a slot** / **Be waitlisted** choice stays on the member card; both are direct for a member. **Join from waitlist** stays a request (the Queue Master gives slots).
  5. **What a direct join writes.** A confirmed roster row for the member's club player record (level from that record's playing level, present false, the same fields as when the Queue Master confirms a join request to a slot), or a waitlist entry at the end when full. No join request row. The same placement code path as confirming a request, so Queue's sync, revisions and roster counts see it exactly like a confirmed request. Refused with the existing conflict errors when the Player already has a slot or waitlist place.
  - **Player-facing UI:** for a signed-in member on a prepared session with Accept join requests on and Always require a request off, the Want to play? card reads “You're a member of CLUB, so you get your place right away.”, the button **Join as NAME** (slot) or **Join the waitlist as NAME** (waitlist placement or full), toast “You're in” / “You're on the waitlist”; afterwards the My night card shows the confirmed / waitlisted state as if the QM had confirmed them. The access read carries `isClubMember`. Non-members and members with the setting on keep today's request flow and copy. The Queue Master sees the row like any confirmed request; no new marker.
- **Still open:**
  - Whether online join requests should reopen during a live session (the owner wrote “ongoing sessions would be a request still”; [D-2026-11-11-11](#d-2026-11-11-11) closes them at Start, and that stands for now).
  - The **How do you want to join?** hint under the member's choice still reads “A slot is yours once the Queue Master confirms…”; the member card's own copy was not specified beyond the sentence and the button.
- **Amends:** [D-2026-11-09-02](#d-2026-11-09-02) (a signed-in member's tap on an upcoming session is a place, not a request, unless the session always requires one); #284–#287 (public viewers never self-admit: members on upcoming sessions now do, under the default setting).
- **References:** [mockup log](../mockup-changes/2026-11-12-queue-member-join.md), [players module](../business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link), [sessions-roster design](../database_design/product/queue/modules/sessions-roster.md), [real-mode ticket status](README.md).
<a id="d-2026-11-12-03"></a>
### D-2026-11-12-03 — Profile banner: 5:2, nothing overlaps it, banner dialog (#765)
- **Decision status:** approved (owner's words logged in #765, November 12, 2026; open points decided by the implementing agent, to be confirmed by the owner)
- **Implementation status:** in the mockups and the mock app (#765). The banner save and the Admin upload go through the existing services (the server's PNG ratio check now expects 5:2), so real mode follows; not run against a production database.
- **Ticket:** [#765](https://github.com/jose-codegourmet/rotra-v2/issues/765)
- **Roadmap:** MVP — [Player](workstreams/player.md), [Admin](workstreams/admin.md)
- **Decision:** the owner asked that nothing overlap the banner, that it use the 5:2 ratio of his banner photo (2560 × 1024), that the edit-banner control sit on the banner (top-right, "if possible"), and that the banner picker be a dialog with the same behaviour as the profile picture, on the profile and on Edit profile. The open points, as built:
  - **Layout of the profile hero:** the banner sits at the top, edge to edge, at 5:2 with no fixed height. Below it, a row with the 88 px circular picture (left, with its pencil) and the name, nickname and badges to its right, 14 px apart. No negative margin and no surface ring: nothing overlaps the banner. The profile card and the Edit profile preview both use it.
  - **Banner pencil:** a 34 px round accent button (the same as the picture pencil) in the banner's top-right corner, inset 10 px, “Change banner”. Only the own profile and the Edit profile preview show it; another player's profile never does. It is the one approved exception to “nothing on the banner”.
  - **Compact profile cards** (the profile dialog, the Queue participant card, the private profile card, the player profile sheet) keep their small banner strip; only the profile hero changes.
  - **Admin uploads move to 5:2 too:** uploads are centre-cropped to 5:2 and saved at 1000 × 400; the A-BANNERS copy says “cropped to 5:2” and its tiles are 5:2. Earlier 3:1 uploads keep working, centre-cropped to fill.
  - **Banner dialog:** **Profile banner**, a grid of 5:2 tiles (2 across on phones, 3 from 640 px) with the draft outlined, the line “Public. Pick one of ROTRA's banners; your own images can't be uploaded.”, and **Cancel** / **Done**. Done is disabled until the pick changes and while saving; it saves with the toast “Banner updated”. Cancel or dismissing discards the draft.
  - **Edit profile:** the inline banner swatches are gone; the preview's banner pencil opens the same dialog. Helper text: “This is how the top of your profile card looks. Tap a pencil to change your picture or banner.”
- **Amends:** [D-2026-11-12-01](#d-2026-11-12-01) (profile banners) and the #751 design (ProfileHero's overlapping picture, the inline banner picker, 3:1 Admin crop). The D-2026-11-12-01 leftover “The Edit profile banner swatches cannot show a banner Admin later hid” now applies to the dialog.
- **References:** [mockup log 2026-11-12-player-profile-banner-layout-dialog](../mockup-changes/2026-11-12-player-profile-banner-layout-dialog.md), [mockup log 2026-11-12-admin-banner-crop-5-2](../mockup-changes/2026-11-12-admin-banner-crop-5-2.md), [profile screen doc](../screens/product/modules/player-information/profile.md#profile-banner).
<a id="d-2026-11-12-04"></a>
### D-2026-11-12-04 — Clubs on every readable profile; Leave club on the club page; no Report a problem (#766)
- **Decision status:** approved (owner's words logged in #766, November 12, 2026; open points decided by the implementing agent, to be confirmed by the owner)
- **Implementation status:** in progress — built in the mockup, the mock app and real-mode source on #766; not run against a database.
- **Ticket:** [#766](https://github.com/jose-codegourmet/rotra-v2/issues/766)
- **Roadmap:** MVP — [Player](workstreams/player.md)
- **Decision:**
  - **Clubs card:** headed **Your clubs** on the own profile and **Clubs** on another player's. Each club is one row that links to the club page (`/clubs/[clubId]`): a 40 px club logo, then the club name in bold; on the own profile only, the muted “Joined via club link” / “Joined via session link” / “Added by the club” line under the name; a chevron at the right. The **Club page**, **Leave club** and **Report a problem** buttons and the “Report a problem opens your email app.” hint are removed. Empty: own “You're not in any club's saved players yet.”; another player's “No clubs yet.”
  - **Another player's clubs:** a public read of that player's current `club_players` rows (club id, name, initials, logo). Visible whenever the profile itself is readable for that viewer, under the same rules as the profile read: a public profile for anyone, signed out included; a private profile with the same sign-in requirement as the profile; an always-private profile shows the private card, which hides everything (the read returns no clubs). How a player joined never leaves the server for anyone but that player.
  - **Profile page:** the clubs card shows for every readable profile, own and others, in the left column; the profile no longer offers Leave club.
  - **Leave club on the club page:** for a signed-in viewer who is a current member, the club page hero shows **Leave club** (secondary button) in place of **Join this club**, next to Share club page. It opens the existing confirm sheet unchanged (“Leave <club>?”, “You're removed from the club's saved players. Your past games stay.”, **Cancel** / **Leave club**); on success the toast is “You left <club>” and Join this club returns. The club page read adds `viewerIsMember`.
  - **Report a problem** is removed from the Player app, with its email link and the placeholder support address.
- **Amends:** [D-2026-11-09-06](#d-2026-11-09-06) (Your clubs card, Report a problem).
- **References:** [mockup log](../mockup-changes/2026-11-12-player-profile-clubs-box.md), [profile screen](../screens/product/modules/player-information/profile.md), [club page screen](../screens/product/modules/player-information/club-page.md), [identity module](../business_logic/product/player-information/modules/identity/README.md).

<a id="d-2026-11-12-05"></a>
### D-2026-11-12-05 — Playwright regression suite on a throwaway local Supabase
- **Decision status:** approved by the owner, November 12, 2026.
- **Implementation status:** in progress on branch `feat/e2e-regression`.
- **Ticket:** none
- **Roadmap:** MVP — Queue (verification).
- **Decision:**
  - **Dependency:** `@playwright/test` 1.64.1 is the only new dependency. It lives in `apps/e2e` (`@rotra/e2e`).
  - **What runs:** the three apps in real mode on ports 9100, 9101 and 9102, against a local Supabase (`supabase start`, database `rotra_disposable_e2e`). Never a hosted project.
  - **Guardrails:** `src/guard.ts` refuses any database that is not `127.0.0.1:54322/rotra_disposable_e2e`, and any Supabase URL that is not `http://127.0.0.1:54321`. Explicit env on the app servers beats `.env` files. Nothing uses `--linked`.
  - **Test clock:** the server test clock is loaded only by the e2e runner, through `NODE_OPTIONS`, and only when `ROTRA_E2E_CLOCK=1` and the guard passes. It never runs earlier than real time.
  - **Pass rule:** every player reaches floor(minimum × minutes Present ÷ session minutes) counted games.
  - **Fairness:** players Present for the whole session differ by at most 2 games.
  - **Done review:** the below-minimum list at Session done must match the expected list.
  - **Excluded:** offline mode.
  - **Not in `make check`.** It runs on demand: `make e2e` locally, or the manual GitHub workflow "Regression" (`workflow_dispatch`, inputs `suite` = all | sim | ui and `seeds`, no secrets).
  - **App defects:** fixes for app defects the suite finds are the owner's. The suite marks them `test.fail`.
- **Related product changes in this branch:**
  - Real-mode match requests (migration `20261112000400_session_match_requests`).
  - Real-mode My night read (`/api/public-sessions/[slug]/my-night`).
  - Cross-app origins from `NEXT_PUBLIC_ROTRA_QUEUE_URL`, `NEXT_PUBLIC_ROTRA_PLAYER_URL` and `NEXT_PUBLIC_ROTRA_ADMIN_URL`. Unset in production, so behaviour is unchanged.
- **References:** [regression suite](../regression.md), `apps/e2e`, `.github/workflows/regression.yml`, `Makefile` (`e2e`, `e2e-ui`, `e2e-down`).

<a id="d-2026-11-13-01"></a>
### D-2026-11-13-01 — Go API on Railway: API, database, sign-in and pictures off Vercel functions and Supabase; live updates
- **Decision status:** approved (planning session, November 13, 2026; B-02 as agreed with the partner; B-10 to B-19 answered the same day). Nothing is open in [backend open decisions](../backend/open-decisions.md).
- **Implementation status:** not started
- **Ticket:** needed
- **Roadmap:** built and tested side by side with the current stack, shipped when ready for production (B-10) — [Backend](workstreams/backend.md)
- **Decision:**
  - **Go API (B-01).** Server code moves from Next.js Route Handlers + `packages/db` to one Go API, one area at a time. Each Route Handler keeps running until its area moves. Mock mode stays the default; screen and hook contracts don't change.
  - **Rules (B-02).** Rules stay in TypeScript for the device. Their test cases live as JSON in a shared package; Vitest and the Go tests both run them. No rule moves to Go until Go passes every case; money and ranking rules need sign-off on their cases.
  - **Hosting (B-03).** Go API and Postgres on Railway, Singapore region. The Next.js apps stay on Vercel.
  - **Sign-in (B-04).** Owned by the Go API, with rate limits (per account, IP and device), a signed-in device list (owner or Admin can sign a device out), and offline device enrollment. Club usernames, Admin-reviewed player recovery, host-only cookies per app and no social login stay.
  - **Transport (B-05).** Each app rewrites `/api/*` to the Go API; fetcher URLs and cookies stay unchanged.
  - **Pictures (B-06).** Railway Buckets, served by presigned URL (bucket egress is free; service egress isn't). No CDN for now. Keep current + previous stays.
  - **Jobs (B-07).** None. Scheduled jobs stay parked ([D-2026-11-11-10](#d-2026-11-11-10)).
  - **Live updates (B-08).** The reason for the Go API: every app gets server-pushed updates. Refresh, pull-down and tab-return refresh stay as the fallback. What each person may see doesn't change.
  - **Cost (B-09).** Start on the existing Railway Hobby plan and monitor.
  - **Rollout (B-10).** A second Vercel project deploys the same apps from `main` with `/api/*` rewritten to the Go API on Railway; the current project keeps running. Separate data while testing; a final data copy and a domain switch ship it. See [infrastructure](../backend/infrastructure.md#side-by-side-with-the-current-apps-b-10).
  - **Sign-in tables (B-11).** Designed in [database design › sign-in](../database_design/product/sign-in.md) (proposed design, not migration SQL).
  - **Live transport (B-12).** Try the stream through the rewrite on staging; fall back to a short single-use ticket and the API's own domain.
  - **CDN (B-13).** None for now. **Hobby limits (B-14).** Just monitor.
  - **Infrastructure.** Railway Infrastructure as Code (`.railway/railway.ts`), since Railway's `railway.json` / `railway.toml` stop working after 2026-12-01 ([infrastructure](../backend/infrastructure.md)). Monitoring goes to the same Grafana Cloud stack ([observability](../observability.md#planned-go-api-postgres-and-pictures-on-railway)).
- **Amends:** the Hosting row in [architecture §12](../architecture.md#12-open-architecture-decisions) (API and database); real-mode data flow and "No Supabase Realtime" in [architecture §5](../architecture.md#5-data-flow); [D-2026-11-08-03](#d-2026-11-08-03) (B-06); [D-2026-11-09-04](#d-2026-11-09-04) and [D-2026-11-09-09](#d-2026-11-09-09) (B-08); [D-2026-11-11-04](#d-2026-11-11-04) (B-04, device enrollment).
  - **Rule cases (B-15).** [D-2026-11-13-02](#d-2026-11-13-02) approved.
  - **Monitoring (B-16).** Plan approved with the Grafana Alloy service and starting thresholds ([observability](../observability.md#planned-go-api-postgres-and-pictures-on-railway)).
  - **IaC dependency (B-17).** The `railway` npm package, root dev dependency, only for `.railway/railway.ts`.
  - **Domains (B-18).** `queue-beta`, `player-beta`, `admin-beta`.rotra.club for the side-by-side project; `api-beta.rotra.club` (staging) and `api.rotra.club` (production) for the Go API.
  - **Query statistics (B-19).** `pg_stat_statements` is an opt-in on Railway Postgres (Database › Stats › Query Statistics › Enable); turn it on for each ROTRA database.
- **Not decided yet:** nothing in [backend open decisions](../backend/open-decisions.md).
- **References:** [proposal](../backend/decisions/2026-11-13-go-railway-backend/01-proposal.md), [backend open decisions](../backend/open-decisions.md), [backend docs](../backend/README.md).

<a id="d-2026-11-13-02"></a>
### D-2026-11-13-02 — Shared rule-cases package `@rotra/rule-cases` (for the partner)
- **Decision status:** approved (November 13, 2026; suggested for the partner, approved in the planning session as B-15 of [D-2026-11-13-01](#d-2026-11-13-01)).
- **Implementation status:** done on `feat/rule-cases` (package, cases, Vitest runner, derived cases and the duplicate deletion), awaiting merge of PR #785
- **Ticket:** #789 (package and cases), #790 (Vitest runner), #791 (remaining cases), #792 (delete duplicated checks); epic #788
- **Roadmap:** first ticket of the Go API epic (useful even before any Go code) — [Backend](workstreams/backend.md)
- **Decision:**
  - **What it is.** A new package `packages/rule-cases` (`@rotra/rule-cases`). It holds **only test cases as JSON**: no code and no rules. The rules stay in `packages/data` and `packages/schema` (TypeScript, also used by the device offline).
  - **Layout.** One file per rule: `cases/<area>/<rule>.json`, where `<area>` matches the source folder (`match`, `session-cost`, `session-roster`, `session-result`, `ranking-settings`, `license`, `club`, `player`, `money`, `phone`, `court-window`, …). Exposed as `exports` subpaths (`@rotra/rule-cases/match/auto-queue.json`), with no barrel file (AGENTS non-negotiable 8).
  - **File shape.** `{ "rule": "<id>", "version": <n>, "cases": [{ "name": "…", "input": {…}, "expected": {…} }] }`, with money in integer minor units and ids as strings ([conventions](../database_design/product/conventions.md)).
  - **Who runs them.** The existing Vitest `*.rules.test.ts` files read the cases next to their own tests. The Go tests read the same files from the repo path; Go's `embed` can't reach outside its module, and tests don't need it.
  - **Which rules.** Every rule that the Go API also has to implement: cost, payments, minimum games, queue generation and fills, results and standings, ranking settings, licenses, money/phone/court-window parsing, and (added November 13, 2026, because a shared rule needs one test for both sides) player, admin player, club player stats, contact change requests, feature flags, queue session and sales rules. Rules that only shape the UI (for example profile banner choice, which takes a lookup function) stay as they are.
  - **Change rule.** A rule change edits its case file first, so both sides fail until both are fixed. A money or ranking case changes only with the owner's sign-off ([stop and ask](../ways-of-working.md#10-stop-and-ask)); the #247 ranking constants are still open.
  - **First step.** Move the existing decided-math cases out of a few `*.rules.test.ts` files into JSON without changing what they test, and prove Vitest still passes.
  - **Owner answers to the first PR's open concerns (November 13, 2026).**
    - **Comparison:** `expected` is a deep subset of the result (optionally at `input.select`); the Go runner compares the same way.
    - **Dates:** a `Date` argument is a tagged value `{"$date": "<ISO 8601 UTC>"}`; plain instants stay epoch ms. Built in #791.
    - **Court window:** split by zone. Zone-free rules move with fixed UTC instants; the device-local-time helpers stay in TypeScript until the club time zone (Asia/Manila, T6) is built. #791.
    - **Checks that don't fit one call → expected** are rewritten in #791, Auto Queue first, before Auto Queue moves to Go.
    - **Duplicated TypeScript checks** are deleted in their own PR, #792.
    - **Shape check** runs on `node:test`, so the package adds no dependency.
  - **Case-file conventions (settled by the team, November 13, 2026; see [#789](https://github.com/jose-codegourmet/rotra-v2/issues/789)).** Both runners implement exactly these; the full rules are in `case.schema.json`.
    - `{"$constant": n}` is an `rng` function that always returns `n`. A seeded sequence (`$sequence`) is added only when a rule needs it; none does today.
    - `{"$undefined": true}` and JSON `null` are **different** inputs, because TypeScript treats them differently. The Go runner must check for the `$undefined` tag before `encoding/json` folds both into nil: `$undefined` becomes an absent argument, and `null` stays an explicit null.
    - `{"$number": "NaN" | "Infinity" | "-Infinity"}` carries the non-finite numbers JSON can't.
    - A list length is an array of `{}` (`toHaveLength(6)` → six `{}`). We keep it instead of a `$length` tag so there is one fewer convention to implement twice.
    - The tagged values also work inside `expected`; the Go runner decodes both.
    - A result that is a `Map` or `Set` is written in `expected` as `{"$map": [[key, value], …]}` or `{"$set": [item, …]}` (insertion order); a Go map or set is turned into the same shape before comparing.
    - Checks that are derived from a result (`toContain`, `.some`, `Set` size) are written as a case that pins the whole result of the rule call.
    - `expected` is a subset match, so an extra key in a result is not caught. This is intentional.
    - **Court-window boundary for #791.** Only `sessionWindowError`, `courtWindowError` and `courtTimeOnSession` (fixed epoch ms) are in JSON. `courtWindowPreview`, `courtNextDay`, `instantOnDate`, `clockTimeFrom` and the locale-formatted `courtAfterSessionEndError` copy stay in TypeScript until the club time zone (T6, Asia/Manila) exists.
    - Money and ranking cases are not restructured without the owner's sign-off, as before.
- **References:** [D-2026-11-13-01](#d-2026-11-13-01) (B-02), [backend proposal](../backend/decisions/2026-11-13-go-railway-backend/01-proposal.md#the-biggest-cost-two-copies-of-the-rules-b-02), [architecture §2–3](../architecture.md#2-the-shape-of-the-system) (new packages need a decision).
