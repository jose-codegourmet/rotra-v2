# MVP decisions and tracking

**Last verified:** 2026-11-08 (code trace of `main` @ `aca899f2`); decisions added 2026-11-09. This is the short decision register
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
| [D-2026-11-09-02](#d-2026-11-09-02) | Signed-in Players on the session page: full names and one-tap join | approved | not started | needed | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-09-03](#d-2026-11-09-03) | Players check themselves in, leave, and say they can't make it | approved | in progress | #617, #619, #624, #626 | [Queue](workstreams/queue.md) |
| [D-2026-11-09-04](#d-2026-11-09-04) | The player's live view: My night, Courts now, own standing, refresh only | approved | not started | needed | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-09-05](#d-2026-11-09-05) | Match requests | approved | not started | needed | [Queue](workstreams/queue.md) |
| [D-2026-11-09-06](#d-2026-11-09-06) | Registration from session and club links, guest linking and club membership | approved | in progress | #622, #625, #627 | [Player](workstreams/player.md), [Queue](workstreams/queue.md) |
| [D-2026-11-09-07](#d-2026-11-09-07) | Public or private player profile | approved | not started | needed | [Player](workstreams/player.md) |
| [D-2026-11-09-08](#d-2026-11-09-08) | Sharing: links, QR codes and post/story images | approved | in progress | #620, #621, #624, #626 | [Player](workstreams/player.md), [Queue](workstreams/queue.md) |
| [D-2026-11-09-09](#d-2026-11-09-09) | Keeping the session page cheap to serve | approved | not started | needed | [Queue](workstreams/queue.md), [Backend](workstreams/backend.md) |
| [D-2026-11-09-10](#d-2026-11-09-10) | Uploaded pictures: keep only the current and the previous | approved | in progress | #619, #624, #626 | [Player](workstreams/player.md), [Queue](workstreams/queue.md), [Backend](workstreams/backend.md) |
| [D-2026-11-09-11](#d-2026-11-09-11) | Session page and Queue refinements from the owner's artifact review | approved | in progress (Q18 Queue Master side in the mock app; request-format defaults decided 2026-11-10) | needed | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-09-12](#d-2026-11-09-12) | Club-set pictures for guests and unclaimed players | approved | in progress | #623, #628 | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |
| [D-2026-11-09-13](#d-2026-11-09-13) | Admin-managed profile character library | approved | not started | needed | [Admin](workstreams/admin.md), [Player](workstreams/player.md) |
| [D-2026-11-09-14](#d-2026-11-09-14) | Admin edits everything on a player, with a beta-only password field | approved for MVP or beta only; needs owner sign-off on the D-2026-11-07-01 conflict | not started | needed | [Admin](workstreams/admin.md) |

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
- **Amended by:** [D-2026-11-09-14](#d-2026-11-09-14) (an admin-typed password for the beta only; needs the owner's sign-off).
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
- **Implementation status:** not started — mockups updated November 9, 2026 (`NEW` logs dated 2026-11-09 in [mockup-changes](../mockup-changes/README.md))
- **Ticket:** needed (mockup change first, then tickets from its `NEW` logs)
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
- **Implementation status:** not started — mockups updated November 9, 2026 (`NEW` logs dated 2026-11-09 in [mockup-changes](../mockup-changes/README.md))
- **Ticket:** needed
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Queue](workstreams/queue.md), [Player](workstreams/player.md)
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
- **Implementation status:** in progress — the Queue club side (club invite link, invite card, Share club invite on Home: #620, #621, #624, #626) is in the mock app; the Player side is in the mock app too (epic P06, #588); the Admin parts are not started. Real mode does not persist it.
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
- **Amended by:** [D-2026-11-09-11](#d-2026-11-09-11) (a player can invite only before the session starts).
- **References:** [session QR share card log](../mockup-changes/2026-11-08-queue-session-qr-share-card.md), [results sharing screens](../screens/product/modules/queue/results-sharing.md).

<a id="d-2026-11-09-09"></a>
### D-2026-11-09-09 — Keeping the session page cheap to serve
- **Decision status:** approved (owner discussion, November 9, 2026). The owner's priorities: "less server stress", "less server costs", "optimal QM and Player UX".
- **Implementation status:** not started — mockups updated November 9, 2026 (`NEW` logs dated 2026-11-09 in [mockup-changes](../mockup-changes/README.md))
- **Ticket:** needed
- **Roadmap:** MVP (owner, November 9, 2026: added to the scope frozen by [D-2026-11-07-04](#d-2026-11-07-04)) — [Queue](workstreams/queue.md), [Backend](workstreams/backend.md)
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
- **Implementation status:** not started — mockups updated November 9, 2026 (`NEW` logs dated 2026-11-09 in [mockup-changes](../mockup-changes/README.md))
- **Ticket:** needed
- **Roadmap:** MVP — [Admin](workstreams/admin.md), [Player](workstreams/player.md)
- **Decision:**
  - **Admin › Settings › Profile characters** is a plain grid of images. The admin adds images by dragging them in (images only, up to 1 MB each, cropped to a square). Clicking an image hides or shows it (hidden images are dimmed). A small x deletes one, with a short Undo.
  - At least **8** images must stay shown. There is no generated character, no names and no ordering: players see the shown images in upload order.
  - **Players' picker** shows only the shown images, **8 per page** with a pager. A player who already uses an image that is later hidden or deleted keeps showing it. Admin's edit-player sheet and the club's picture editor ([D-2026-11-09-12](#d-2026-11-09-12)) use the same list.
- **Storage:** a character library (image reference, shown, position, created) in Supabase Storage plus one small table; images are admin uploads only, so the keep-two rule of [D-2026-11-09-10](#d-2026-11-09-10) does not apply.
- **References:** [Admin screens](../screens/product/modules/admin/README.md), [mockup logs](../mockup-changes/README.md).

<a id="d-2026-11-09-14"></a>
### D-2026-11-09-14 — Admin edits everything on a player, with a beta-only password field
- **Decision status:** approved by the owner for **MVP or beta only** (November 9, 2026): "since admin, you should be able to edit everything. also password (for now) wrap it with *(for mvp or beta only)*". It conflicts with [D-2026-11-07-01](#d-2026-11-07-01) and needs the owner's explicit sign-off before it is built.
- **Implementation status:** not started — mockups updated November 9, 2026 (`NEW` logs dated 2026-11-09 in [mockup-changes](../mockup-changes/README.md))
- **Ticket:** needed
- **Roadmap:** MVP or beta — [Admin](workstreams/admin.md)
- **Amends:** [D-2026-11-07-01](#d-2026-11-07-01) for the beta only.
- **Decision:**
  - **Admin › Players › Edit** can change the player's picture ([D-2026-11-09-13](#d-2026-11-09-13)), name, nickname, playing style, experience, playing since, the four social links, Private profile, Hide phone from clubs, and phone and email (checked for format and uniqueness). A reason is required, and the change is written to the player's Activity log.
  - **Read-only:** RTR ID, created-by club, registered/unclaimed status, rank, level and match history (ranking math is not editable by Admin).
  - **Password.** The field is labelled **Password *(for MVP or beta only)***. The admin types a new password (at least 8 characters); empty leaves it unchanged; it is not available for unclaimed players. Only that it was set, and by whom, is recorded, never the password.
- **Conflict to resolve:** [D-2026-11-07-01](#d-2026-11-07-01) says "the Admin never sees" a player's password and the player chooses it. Setting one by hand needs the owner's confirmation, and an end date for removing the field.
- **Not decided:** editing phone or email directly skips the contact-change request flow; an open request is not closed automatically.
- **References:** [Admin screens](../screens/product/modules/admin/README.md), [mockup logs](../mockup-changes/README.md).
