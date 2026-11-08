# MVP decisions and tracking

**Last verified:** 2026-11-08 (code trace of `main` @ `aca899f2`). This is the short decision register
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
| [D-2026-11-08-01](#d-2026-11-08-01) | Where Admin Sales numbers are calculated | approved | not started | #533, #540 (epic #504) | [Admin](workstreams/admin.md) |
| [D-2026-11-08-02](#d-2026-11-08-02) | Player Compare data, rules and route | approved | not started | #525, #526, #541 (epic #502) | [Player](workstreams/player.md) |
| [D-2026-11-08-03](#d-2026-11-08-03) | Profile pictures in Supabase Storage | approved | not started | #522, #542 (epic #502) | [Player](workstreams/player.md) |
| [D-2026-11-08-04](#d-2026-11-08-04) | Scheduled jobs: Supabase pg_cron calls protected Route Handlers | approved | not started | #545; #546, #547 blocked | [Backend](workstreams/backend.md) |

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
- **Implementation status:** not started (offline working copy and guest reconciliation are not connected in real mode)
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
- **Implementation status:** not started (the Sales page and the club Sales tab exist only in the Admin mockup, with sample figures)
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
- **Implementation status:** not started
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
- **Implementation status:** not started
- **Ticket:** [#522](https://github.com/jose-codegourmet/rotra-v2/issues/522) (mock data), [#542](https://github.com/jose-codegourmet/rotra-v2/issues/542) (Storage and real-mode writer), epic [#502](https://github.com/jose-codegourmet/rotra-v2/issues/502)
- **Roadmap:** MVP candidate — [Player workstream](workstreams/player.md)
- **Decision:** Reuse the club-logo pattern (#374) instead of building a new one. The Player app's existing `/api/me/profile` route (behind `requireOwnPlayer`) receives the photo, the server normalizes it to a square PNG (512 px), uploads it to a public **`player-avatars`** Supabase Storage bucket, and saves its immutable URL in `players.avatar_ref`. A character is saved as `character:<id>`; Use my initials saves null. No direct browser upload, no Edge Function, no migration (`avatar_ref` already exists). Old files are kept like club logo snapshots.
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
