# MVP decisions and tracking

**Last verified:** 2026-11-08 (code trace of `main` @ `aca899f2`). This is the short decision register
for MVP discussions. The [MVP hub](README.md) summarizes delivery; GitHub issues track implementation.
Product rules and existing open-decision documents remain authoritative for their domains.

## Index

| ID | Title | Decision status | Implementation | Ticket | Workstream |
|---|---|---|---|---|---|
| [D-2026-11-07-01](#d-2026-11-07-01) | Manual player password recovery for MVP | approved | not started | needed | [Player](workstreams/player.md), [Admin](workstreams/admin.md) |
| [D-2026-11-07-02](#d-2026-11-07-02) | Decision and roadmap status tracking | approved | implemented | none | Tracking (this folder) |
| [D-2026-11-07-03](#d-2026-11-07-03) | Offline session boundaries and guest reconciliation | approved | not started | needed; #246 | [Queue offline](workstreams/queue-offline.md), [Player](workstreams/player.md) |
| [D-2026-11-07-04](#d-2026-11-07-04) | Freeze the current MVP scope | approved | not applicable | none | All |
| [D-2026-11-07-05](#d-2026-11-07-05) | Payment amounts reuse the existing paid mark | approved | implemented | #479 | [Queue](workstreams/queue.md) |
| [D-2026-11-07-06](#d-2026-11-07-06) | Public participant names are masked | approved | implemented | #475, #474 | [Queue](workstreams/queue.md) |
| [D-2026-11-07-07](#d-2026-11-07-07) | Player invite links use player login until sign-up exists | approved | implemented | #476, #478; #477 blocked | [Queue](workstreams/queue.md), [Player](workstreams/player.md) |

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
### D-2026-11-07-01 — Manual player password recovery for MVP
- **Decision status:** approved
- **Implementation status:** not started (the proposed Admin reset-link flow has not been verified on `main`)
- **Ticket:** needed
- **Roadmap:** MVP — [Player access](workstreams/player.md)
- **Decision:** Players contact ROTRA support using their preferred channel (e.g. Instagram or Messenger). The platform Admin verifies ownership, then generates a short-lived, single-use password reset link from the player's Admin profile and shares it manually. The Player Forgot Password screen directs players to support.
- **Not in MVP:** automated recovery emails, player-submitted reset requests, a recovery notification inbox, and club-owner access to reset player passwords.
- **Security requirements:** Do not reveal or set the player's password; verify ownership before issuing a link; invalidate used or expired links; log link issuance without storing the token in plaintext.
- **References:** [Player workstream](workstreams/player.md), [Admin workstream](workstreams/admin.md), `apps/player/src/app/(auth)/forgot-password`, `apps/admin/src/app/(admin)/players`.
- **Notes (audit 2026-11-07):** "not started" confirmed: no reset UI in `apps/admin/src/app/(admin)/players/**`, no route, service or model. P-FORGOT still renders an email form (`requestPasswordReset`, mock only) and P-RESET has no route. Docs describe email recovery (#244 L2, `claim-and-recover.md`, `access-registration.md` P-FORGOT).
- **Notes (2026-11-08):** `main` ships Supabase email password reset in #483 (`apps/player/src/app/api/auth/{password-reset,reset-password}` → `packages/db/src/player/account-access.ts`), and the docs on `main` describe it. The Admin reset link is still not built. Owner to confirm whether D-01 is superseded ([hub open question 8](README.md#6-open-questions-for-the-owner)).

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
- **References:** [Public session screens](../screens/product/modules/queue/public-session.md).

## Admin implementation gap index

Moved to the [Admin workstream](workstreams/admin.md#admin-implementation-gap-index).
