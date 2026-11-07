# MVP decisions and tracking

**Updated:** 2026-11-07. This is the short decision register for MVP discussions. The [MVP roadmap](MVP-ROADMAP.md) summarizes delivery; GitHub issues track implementation. Product rules and existing open-decision documents remain authoritative for their domains.

## Status conventions

Every decision entry must include:
- **Decision status:** `proposed` | `approved` | `deferred` | `canceled` | `superseded`.
- **Implementation status:** `not started` | `in progress` | `implemented` | `unknown` | `not applicable`. Only mark `implemented` after locating the code on `main`; otherwise use `unknown`.
- **Ticket:** `none` | `needed` | linked issue(s). A referenced epic does not mean the decision has its own implementation ticket.
- **Roadmap:** `MVP` | `post-MVP` | `out of scope`, plus the related roadmap item.
- **References:** relevant docs, code, issues, and any superseding decision.

**Workflow:** Record owner decisions promptly; do not turn suggestions into approved decisions. Check existing issues before creating a new one. If approved MVP work lacks a ticket, mark `Ticket: needed`; create/attach a ticket only under the repository's issue-creation rules. When code merges, update implementation status and roadmap. Canceled/deferred decisions stay visible for history, and superseded decisions link their replacement. Never equate an approved decision with implemented code.

## Decisions

### D-2026-11-07-01 — Manual player password recovery for MVP
- **Decision status:** approved
- **Implementation status:** not started (the proposed Admin reset-link flow has not been verified on `main`)
- **Ticket:** needed
- **Roadmap:** MVP — Player access, item 1 in [MVP roadmap](MVP-ROADMAP.md)
- **Decision:** Players contact ROTRA support using their preferred channel (e.g. Instagram or Messenger). The platform Admin verifies ownership, then generates a short-lived, single-use password reset link from the player's Admin profile and shares it manually. The Player Forgot Password screen directs players to support.
- **Not in MVP:** automated recovery emails, player-submitted reset requests, a recovery notification inbox, and club-owner access to reset player passwords.
- **Security requirements:** Do not reveal or set the player's password; verify ownership before issuing a link; invalidate used or expired links; log link issuance without storing the token in plaintext.
- **References:** [MVP roadmap](MVP-ROADMAP.md), `apps/player/src/app/(auth)/forgot-password`, `apps/admin/src/app/(admin)/players`.

### D-2026-11-07-02 — Decision and roadmap status tracking
- **Decision status:** approved
- **Implementation status:** implemented (documentation convention in this file)
- **Ticket:** none (documentation-only)
- **Roadmap:** MVP — tracking convention, not a product feature
- **Decision:** Maintain decision status, implementation status, ticket link/need, roadmap scope and references for each new decision. Keep statuses updated as work progresses, is canceled or deferred.
- **References:** [Ways of working](ways-of-working.md), [MVP roadmap](MVP-ROADMAP.md).

### D-2026-11-07-03 — Offline session boundaries and guest reconciliation
- **Decision status:** approved
- **Implementation status:** not started (offline working copy and guest reconciliation are not connected in real mode)
- **Ticket:** needed; related design issue [#246](https://github.com/jose-codegourmet/rotra-v2/issues/246)
- **Roadmap:** MVP — Offline Queue and Player identity
- **Decision:** Session setup and start require internet. During an active session, downloaded club players and newly entered guests may be added offline, alongside offline match and score operations. Global ROTRA player search is online only. Session end/finalization requires reconnection, complete sync, and queue-master review of every unresolved guest.
- **Guest review:** Queue master owns every identity decision. Suggest only lightweight, limited candidate matches: search the club's saved players first, then the global player directory when online. Never scan or fetch every similarly named player, and never auto-link based on a name. The queue master explicitly confirms a match or creates a new unclaimed player; preserve session history for later claiming. No mandatory region filter.
- **Out of scope:** expensive fuzzy matching, exhaustive same-name searches, automatic identity linking.
- **References:** [Queue offline rules](business_logic/product/queue/modules/offline/README.md), [MVP roadmap](MVP-ROADMAP.md), [#246](https://github.com/jose-codegourmet/rotra-v2/issues/246). Existing offline docs still allow offline session start and must be reconciled in the implementation ticket.

## Admin implementation gap index (2026-11-07)

This is an inventory, **not** a claim that each gap has a dedicated implementation ticket.

| Gap | Decision / implementation state | Ticket coverage | MVP relevance |
| --- | --- | --- | --- |
| Contact-change approve, retry, status | Partially connected; decline and reads exist | [#244](https://github.com/jose-codegourmet/rotra-v2/issues/244) and [Admin requests epic #25](https://github.com/jose-codegourmet/rotra-v2/issues/25); confirm dedicated implementation ticket | MVP |
| Manual player reset link from Admin | Approved; not started | **Ticket needed**; see D-2026-11-07-01 | MVP |
| Ranking calculations from saved settings | Settings persist; calculations incomplete | [#247](https://github.com/jose-codegourmet/rotra-v2/issues/247) and [Admin configuration epic #26](https://github.com/jose-codegourmet/rotra-v2/issues/26) | MVP scope under ranking decision |
| Club accent persistence | Open product/data-model decision; not completed | [#395](https://github.com/jose-codegourmet/rotra-v2/issues/395) | Lower priority / defer candidate |

Before agents implement, verify current `main` and the relevant ticket's actual scope. Do not create duplicate issues merely because a related epic is open.

### D-2026-11-07-04 — Freeze the current MVP scope
- **Decision status:** approved
- **Implementation status:** not applicable (scope decision)
- **Ticket:** none (tracking only; missing implementation tickets still need reconciliation)
- **Roadmap:** MVP — all current roadmap items
- **Decision:** The currently agreed Queue, Player, Admin, offline operation, guest reconciliation and ranking work is sufficient MVP scope for now. Prioritize completing and linking existing tickets, not adding unrelated features. A completed ticket backlog is the working feature-completion milestone, **not** proof that no undiscovered gaps exist.
- **Delivery note:** A private regression handoff during November 9–13 was discussed as a *tentative target*, not a committed launch date. Offline is mandatory for MVP; an online-only public launch is not approved. Reassess dates based on actual remaining work.
- **Follow-up:** Reconcile approved MVP decisions against GitHub tickets, avoid duplicates, and mark uncovered implementation work `Ticket: needed`. Keep deferred or canceled items visible.
- **References:** [MVP roadmap](MVP-ROADMAP.md), [Ways of working](ways-of-working.md), D-2026-11-07-01 and D-2026-11-07-03.

### D-2026-11-07-05 — Payment amounts reuse the existing paid mark
- **Decision status:** approved
- **Implementation status:** implemented (fix/466-obvious-queue-bugs)
- **Ticket:** [#479](https://github.com/jose-codegourmet/rotra-v2/issues/479)
- **Roadmap:** MVP — item 5 in [MVP roadmap](MVP-ROADMAP.md)
- **Decision:** `SessionPaymentMark.amountMinor` means the amount received; a quick tick records the current due. Status compares received with the current due: Paid, Partial, Reimburse (tracking only) or Unpaid. Pricing changes never rewrite received amounts. No migration.
- **References:** [Financials](business_logic/product/queue/modules/financials/README.md).

### D-2026-11-07-06 — Public participant names are masked
- **Decision status:** approved
- **Implementation status:** implemented (fix/466-obvious-queue-bugs)
- **Ticket:** [#475](https://github.com/jose-codegourmet/rotra-v2/issues/475), [#474](https://github.com/jose-codegourmet/rotra-v2/issues/474)
- **Roadmap:** MVP — item 5 in [MVP roadmap](MVP-ROADMAP.md)
- **Decision:** On the public session page each name word shows as its first letter plus `***` (`J*** A***`), masked on the server. The public skill mix shows aggregate counts only, never who is which level. Not covered yet: published results and profile pictures.
- **References:** `packages/data/src/public-session/publicSession.rules.ts`, `packages/db/src/queue/public-session.ts`.

### D-2026-11-07-07 — Player invite links use player login until sign-up exists
- **Decision status:** approved
- **Implementation status:** implemented (fix/466-obvious-queue-bugs)
- **Ticket:** [#476](https://github.com/jose-codegourmet/rotra-v2/issues/476), [#478](https://github.com/jose-codegourmet/rotra-v2/issues/478); Downloads page [#477](https://github.com/jose-codegourmet/rotra-v2/issues/477) blocked on #246
- **Roadmap:** MVP — items 1 and 5 in [MVP roadmap](MVP-ROADMAP.md)
- **Decision:** Request to join offers the guest form or "Log in with ROTRA Player" (returns to `/s/<slug>?join=1`); sign-up shows as not open yet. Guest "Invite to ROTRA" copies the player login link. A login never grants a slot, and a join request does not yet carry the signed-in player.
- **References:** [Public session screens](screens/product/modules/queue/public-session.md).
