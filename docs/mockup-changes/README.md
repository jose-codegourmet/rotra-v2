# Mockup changes — ROTRA

**Last verified:** 2026-11-08 · **Audience:** contributors and AI coding agents.

Every change to a mockup in [apps/mockup](../../apps/mockup/README.md) gets **one log file
here**. The log is what turns a design change into work on the real apps: an agent reads the `NEW` logs,
groups them, and writes tickets from them. Three rules hold every log together:

1. **Like for like.** The artifact the owner reviews *is* the mockup, and the real app ends up looking and
   behaving exactly like the mockup (§5).
2. **One true status.** Every log says where its change is right now (§4).
3. **Reuse first.** A log says which `@rotra/ui` components the change reuses or extends, so tickets are
   grouped by component and nothing is built twice (§6).

---

## 1. The flow

1. **A layout or UI change is requested.** Change the mockup first
   (`apps/mockup/<app>/<file>.html`), not the real app. The real app changes later, through a ticket.
2. **Show the owner the mockup itself.** If the change is reviewed as an artifact, publish it from the
   saved mockup file (or its `pnpm --filter @rotra/mockups build` output). Never hand-edit the published
   page or publish a separate copy; a fix asked in an artifact comment goes into the mockup file first,
   then the artifact is republished from it (§5.1).
3. **Write the log.** One new file in this folder, from the template in §3, with `Status: NEW`.
4. **Fix the docs the mockup made untrue, in the same change:**
   - business logic: `docs/business_logic/product/<product>/modules/<module>/`
   - database design: `docs/database_design/product/<product>/modules/`
   - screen docs, if the screen's layout, controls, states or copy changed: `docs/screens/product/`

   If nothing needed updating, say so in the log. If the change touches anything in an
   `open-decisions.md`, money, ranking math, auth or contacts, **ask first** (see
   [ways-of-working.md §10](../ways-of-working.md#10-stop-and-ask)).
5. **Ticket it** the efficient way (§6), then set the status to `TICKETED — #<n>`.
6. **Keep the status true** as the work moves (§4), then run
   `node docs/mockup-changes/status-index.mjs` to refresh the index in §7. Don't delete logs; they're the
   history.

---

## 2. File name

`YYYY-MM-DD-<app>-<short-slug>.md`, where `<app>` is `queue`, `player` or `admin`.

Example: `2026-10-31-queue-court-card-timer.md`. Two changes on the same day get two files. A follow-up
owner comment on the **same** change, the same day, is appended to the same log; a change that replaces an
earlier log's result gets a new log with `Supersedes:` (§3).

---

## 3. Template

```markdown
# <What changed, in one line>

Status: NEW
Date: YYYY-MM-DD
App: queue | player | admin
Mockup: apps/mockup/<app>/<file>.html › <screen / tab / control>
Route: <mockup URL path under pnpm mockups, e.g. /queue/sessions/s-tonight/preparation?tab=roster>
Screen ID: <from docs/screens, if it has one>
Artifact: <claude.ai artifact link the owner commented on> | none
Components: <@rotra/ui component folders touched, comma-separated, e.g. roster-card, skill-mix-bar>
Supersedes: <earlier log file this replaces> | none
Superseded by: none

## What changed
- <Before → after, in plain words>

## Why
- <The request or decision behind it; quote the owner's words>

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: <every state the mockup shows for this change: default, hover/focus, empty, disabled, error,
  loading, long text>
- Copy: <every new or changed string, exactly as the mockup has it>
- Tokens: <new or changed tokens with their dark and light values> | none
- Known differences: none | <a difference the owner approved, with the date>

## Reuse plan
- Reuses as is: <component> — <where>
- Extends: <component> — <new prop, variant or slot>
- New: <component> — only when nothing above fits; say why
- Shares work with: <other logs that touch the same components> | none

## Docs updated
- Business logic: <file> — <what> | none needed
- Database design: <file> — <what> | none needed
- Screen docs: <file> — <what> | none needed

## Real app work
- <What the ticket will change in apps/ and packages/ui> | none (then the status is `MOCKUP ONLY`)
```

The person changing the mockup writes **What changed**, **Why**, **Like for like** and **Docs updated**.
If they can't fill **Reuse plan**, the agent that tickets the log must fill it first (§6, step 2).

---

## 4. Statuses

One `Status:` line per log, always one of these:

| Status line | Meaning | Who sets it, when |
|---|---|---|
| `Status: NEW` | The change is only in the mockup. No ticket yet. | Whoever changes the mockup. |
| `Status: TICKETED — #<n>` | A ticket (or epic) exists; no PR has merged for it yet. | The agent that writes the ticket, in the same change. |
| `Status: IN PROGRESS — #<n> (PR #<m>)` | Being worked on: part of the work has merged, or a PR is open. | The PR that starts the work, when the change needs more than one PR (an epic). A single-PR change goes straight from `TICKETED` to `IN MOCK APP`. |
| `Status: IN MOCK APP — #<n> (PR #<m>)` | The real app (on mock data) matches the mockup like for like (§5.2). | The PR that finishes the work, in its last commit, so it is true the moment it merges. |
| `Status: CANCELLED — <reason>` | The owner dropped it, or a later log replaced it before it was built. Say if the mockup was reverted. | Whoever records the owner's decision, or the ticketing agent for a superseded log. |
| `Status: MOCKUP ONLY — <reason>` | Nothing to build: prototype tooling, hosting, or the real app already behaves this way. | Whoever writes the log. |

- `#<n>` is the ticket, or the epic when the change spans many tickets. `(PR #<m>)` is the last PR that
  merged for it; leave it out until there is one. A change built without a ticket writes `— PR #<m>`.
- Only `NEW` logs are ticketed. Never ticket a log in any other status.
- `IN MOCK APP` is the end for now: real mode, durable offline and rank math arrive through their own
  epics, not through these logs.
- When a later log replaces a change that is already `IN MOCK APP`, the old log keeps its status and gets
  `Superseded by: <new log>`; the new log starts `NEW`.

---

## 5. Like for like

### 5.1 Artifact = mockup

The owner reviews and comments on artifacts. What they see must be the mockup file as committed:

- Publish from the mockup file (or the mockup build), never from a copy or a hand-written page.
- Every change asked in an artifact comment is made in `apps/mockup/…` first, logged, then republished.
- Put the artifact link on the log's `Artifact:` line, and quote the comment in **Why**.

### 5.2 Real app = mockup

A log moves to `IN MOCK APP` only when the real app matches the mockup **like for like**:

- Open the mockup (`nvm use && pnpm mockups`, the log's `Route:`) beside the real app on the same fixture
  data, at **375 px and 1280 px, in dark and light**.
- Same layout, order, sizes, spacing, icons, colors (through tokens), copy and states as listed in the log's
  **Like for like** section. Build to the mockup; don't improve it.
- Any difference is either fixed, or approved by the owner and written under **Known differences**.
- The PR says what was compared and what wasn't ([ways-of-working.md §7](../ways-of-working.md#7-verification)).

---

## 6. Ticketing efficiently

An agent asked to ticket mockup changes does this, in order:

1. **Collect** every log with `Status: NEW` (the index in §7 lists them).
2. **Fill the Reuse plan** where it's missing: look up the components the change touches in
   `packages/ui/src/components/` and write them on the `Components:` line and in **Reuse plan**. Prefer
   extending an existing component (a prop, variant or slot) over a new one; a new component needs a reason.
3. **Resolve supersede chains.** When log B's "before" is log A's "after", A and B are one chain. Ticket
   the **latest** result only. If A was never built and B fully replaces it, set A to
   `CANCELLED — superseded by <B>` and fill A's `Superseded by:`. If B only changes part of A, ticket them
   together and give both the same ticket number.
4. **Group by component, not by log.** Logs that touch the same component become one component ticket
   (component + stories + `.meta.ts` for every new variant), then the screen tickets that wire it. One log
   may feed several tickets, and one ticket may cover several logs. Shared new tokens get one ticket.
5. **Order the tickets** the way every epic runs: components + Storybook → mock data → screens → states
   ([ways-of-working.md §3](../ways-of-working.md#3-how-work-is-organised)). A batch of logs that needs many
   tickets gets one epic (like #408 for the November 6 changes); ask the owner before creating it.
6. **Each ticket** links its logs, copies their **Like for like** section as acceptance criteria, and names
   the components to reuse or extend.
7. **Update every log** you ticketed to `TICKETED — #<n>` in the same change, and refresh the index.

---

## 7. Status index

Regenerate with `node docs/mockup-changes/status-index.mjs`. It fails on a missing or unknown status line;
`--check` only reports whether the index is stale.

<!-- status-index:start -->
IN MOCK APP: 67 · MOCKUP ONLY: 4

| Log | Change | Components | Status |
|---|---|---|---|
| [2026-10-31-queue-routed-prototypes](2026-10-31-queue-routed-prototypes.md) | Give all three prototypes app routes and browser history | — | MOCKUP ONLY — prototype routing; the real apps already have these routes |
| [2026-10-31-queue-saved-player-stats](2026-10-31-queue-saved-player-stats.md) | Saved player statistics carousel | — | IN MOCK APP — #301 (PR #308) |
| [2026-11-01-admin-compact-player-selection](2026-11-01-admin-compact-player-selection.md) | Compact player selection and unclipped actions | — | IN MOCK APP — #392 (PR #394) |
| [2026-11-01-admin-players-management](2026-11-01-admin-players-management.md) | Players management overhaul | — | IN MOCK APP — #335 |
| [2026-11-01-admin-viewport-meta](2026-11-01-admin-viewport-meta.md) | Admin prototype: add the viewport meta | — | MOCKUP ONLY — the real app already sends the viewport meta |
| [2026-11-01-mockup-app-location](2026-11-01-mockup-app-location.md) | Move the canonical mockups into apps/mockup | — | MOCKUP ONLY — repository and hosting move, no UI change |
| [2026-11-01-player-viewport-meta](2026-11-01-player-viewport-meta.md) | Player prototype: add the viewport meta | — | MOCKUP ONLY — the real app already sends the viewport meta |
| [2026-11-01-queue-auto-queue-copy](2026-11-01-queue-auto-queue-copy.md) | Explain Auto Queue choices, Catch Up targets and results | — | IN MOCK APP — #322 (PR #334) |
| [2026-11-01-queue-auto-queue-draft-tiles](2026-11-01-queue-auto-queue-draft-tiles.md) | Auto Queue drafts look like queue tiles and are picked like players | — | IN MOCK APP — #321 (PR #366) |
| [2026-11-01-queue-court-window-preview](2026-11-01-queue-court-window-preview.md) | Add / Edit court previews show the validated booking window | — | IN MOCK APP — #320 (PR #329) |
| [2026-11-01-queue-expected-players-default](2026-11-01-queue-expected-players-default.md) | Session setup: Expected players follows the slot budget until edited | — | IN MOCK APP — #331 (PR #352) |
| [2026-11-01-queue-flexibility](2026-11-01-queue-flexibility.md) | Queue flexibility review prototype | — | IN MOCK APP — #283 (PR #312) |
| [2026-11-01-queue-layout-width](2026-11-01-queue-layout-width.md) | Queue pages fill the screen width | — | IN MOCK APP — #348 (PR #365) |
| [2026-11-01-queue-live-session-settings](2026-11-01-queue-live-session-settings.md) | Live sessions can reopen their preparation settings | — | IN MOCK APP — #323 (PR #347) |
| [2026-11-01-queue-payment-batches](2026-11-01-queue-payment-batches.md) | Debounce payment switches and summarize each batch | — | IN MOCK APP — #300 (PR #372) |
| [2026-11-01-queue-presence-batches](2026-11-01-queue-presence-batches.md) | Presence switches save in a background batch | — | IN MOCK APP — #324 (PR #349) |
| [2026-11-01-queue-saved-players-add-player](2026-11-01-queue-saved-players-add-player.md) | Saved players: Add player without a session | — | IN MOCK APP — #330 (PR #367) |
| [2026-11-01-queue-setup-next-submits](2026-11-01-queue-setup-next-submits.md) | Session setup: only page 3 saves, and Enter acts as Next | — | IN MOCK APP — #332 (PR #350) |
| [2026-11-01-queue-start-court-anyway](2026-11-01-queue-start-court-anyway.md) | Start anyway: open a court before its planned start | — | IN MOCK APP — #325 (PR #333) |
| [2026-11-02-queue-offline-copy-not-connected](2026-11-02-queue-offline-copy-not-connected.md) | Show unavailable device-download evidence truthfully | — | IN MOCK APP — #385 (PR #388) |
| [2026-11-06-queue-court-player-size](2026-11-06-queue-court-player-size.md) | Bigger players, names, game counts and wait timers on court and queue cards | — | IN MOCK APP — #408 |
| [2026-11-06-queue-delete-session](2026-11-06-queue-delete-session.md) | Delete session added to the Preparation header, next to Cancel session | — | IN MOCK APP — #408 |
| [2026-11-06-queue-example-sessions-and-cancel](2026-11-06-queue-example-sessions-and-cancel.md) | Example sessions, Demo scenarios, Cancelled sessions, and the short-on-players banner | — | IN MOCK APP — #408 |
| [2026-11-06-queue-on-court-and-sub-credit](2026-11-06-queue-on-court-and-sub-credit.md) | On court step, Auto Queue / Manual Queue court filling, and substitution game credit | — | IN MOCK APP — #408 |
| [2026-11-06-queue-roster-views](2026-11-06-queue-roster-views.md) | Roster and levels: level tabs, Group by and a List / Grid view | — | IN MOCK APP — #408 |
| [2026-11-06-queue-time-and-day](2026-11-06-queue-time-and-day.md) | Times always carry their day, one date-and-time picker, and live end-time changes | — | IN MOCK APP — #408 |
| [2026-11-07-queue-copy-invite-link](2026-11-07-queue-copy-invite-link.md) | Copy invite link added to the Preparation header, next to Preview public page | — | IN MOCK APP — #470 (PR #482) |
| [2026-11-07-queue-guest-invite-link](2026-11-07-queue-guest-invite-link.md) | Invite to ROTRA section on the guest player details dialog | — | IN MOCK APP — #478 (PR #482) |
| [2026-11-07-queue-join-guest-or-login](2026-11-07-queue-join-guest-or-login.md) | Request to join offers Continue as guest or Log in with ROTRA Player | — | IN MOCK APP — #476 (PR #482) |
| [2026-11-07-queue-payment-amounts](2026-11-07-queue-payment-amounts.md) | Payments: record full or partial amounts and flag reimbursements | — | IN MOCK APP — #479 (PR #482) |
| [2026-11-07-queue-preview-banner-session-link](2026-11-07-queue-preview-banner-session-link.md) | Public page preview banner shows the session link to share, with Copy link | — | IN MOCK APP — #469 (PR #482) |
| [2026-11-07-queue-public-masked-names](2026-11-07-queue-public-masked-names.md) | Public page shows masked participant and waitlist names | — | IN MOCK APP — #475 (PR #482) |
| [2026-11-07-queue-public-skill-mix](2026-11-07-queue-public-skill-mix.md) | Public page shows an aggregate skill mix above the participants | — | IN MOCK APP — #474 (PR #482) |
| [2026-11-07-queue-roster-skill-mix-bar](2026-11-07-queue-roster-skill-mix-bar.md) | Skill mix bar above the roster when grouped by Skill group | — | IN MOCK APP — #472 (PR #482) |
| [2026-11-07-queue-session-qr](2026-11-07-queue-session-qr.md) | Session QR button and sheet added to the Preparation header | — | IN MOCK APP — #471 (PR #482) |
| [2026-11-08-admin-club-sales-tab](2026-11-08-admin-club-sales-tab.md) | Club page gets a Sales tab | sales-stat-card, admin-nav | IN MOCK APP — #504 |
| [2026-11-08-admin-edit-profile-email](2026-11-08-admin-edit-profile-email.md) | Edit profile gets an Email field that sends a contact-change request | player-edit-form, player-review-changes | IN MOCK APP — #564 |
| [2026-11-08-admin-password-reset-requests](2026-11-08-admin-password-reset-requests.md) | Admin-reviewed password reset requests | — | IN MOCK APP — #491 (PR #494) |
| [2026-11-08-admin-players-layout](2026-11-08-admin-players-layout.md) | Admin Players page gets a cleaner layout | admin-player-stats, admin-player-filters, admin-player-card, admin-player-bulk-bar, player-pagination, admin-player-quick-view, admin-player-history | IN MOCK APP — #503 (PR #566) |
| [2026-11-08-admin-sales-page](2026-11-08-admin-sales-page.md) | Admin gets a Sales page | sales-stat-card, admin-nav | IN MOCK APP — #504 |
| [2026-11-08-player-change-avatar](2026-11-08-player-change-avatar.md) | Players can change their profile picture | profile-picture-sheet, player-identity-card, edit-profile-form, player-profile | IN MOCK APP — #502 (superseded by 2026-11-08-player-picture-drafts) |
| [2026-11-08-player-claim-prefill-and-experience](2026-11-08-player-claim-prefill-and-experience.md) | Registration form is prefilled by the club; experience has linked Playing since | — | IN MOCK APP — PR #484 |
| [2026-11-08-player-compare-players](2026-11-08-player-compare-players.md) | Compare yourself with another player | compare-filter-bar | IN MOCK APP — #502 |
| [2026-11-08-player-email-sign-in](2026-11-08-player-email-sign-in.md) | Player sign-in takes an email only, not a phone number | — | IN MOCK APP — PR #483 |
| [2026-11-08-player-guest-registration](2026-11-08-player-guest-registration.md) | Guest invitations open registration | — | IN MOCK APP — #490 (PR #493) |
| [2026-11-08-player-picture-drafts](2026-11-08-player-picture-drafts.md) | Profile picture drafts, framing and save on Done | profile-picture-sheet, avatar | IN MOCK APP — #567 |
| [2026-11-08-queue-delete-player](2026-11-08-queue-delete-player.md) | Saved players: Delete player | — | IN MOCK APP — PR #487 |
| [2026-11-08-queue-edit-player-details](2026-11-08-queue-edit-player-details.md) | Queue Master can edit a guest's or unclaimed player's details before inviting them | — | IN MOCK APP — PR #484 |
| [2026-11-08-queue-invite-cancels-previous-link](2026-11-08-queue-invite-cancels-previous-link.md) | Invite cancels the previous registration link again | — | IN MOCK APP — PR #485 |
| [2026-11-08-queue-partial-payment-switch-yellow](2026-11-08-queue-partial-payment-switch-yellow.md) | Partial payment cards show the paid switch in yellow | switch, payments-checklist, saved-player-stats-carousel | IN MOCK APP — #498 |
| [2026-11-08-queue-phone-header-more-options](2026-11-08-queue-phone-header-more-options.md) | Preparation header keeps Session QR and Facebook post, rest goes under More options on phones | page-header, more-options-sheet, session-preparation | IN MOCK APP — #499 |
| [2026-11-08-queue-phone-tabs-dropdown](2026-11-08-queue-phone-tabs-dropdown.md) | Preparation and level tabs become styled dropdown menus on phones | roster-panel, preparation-roster, tab-menu, tabs, session-preparation | IN MOCK APP — #498 |
| [2026-11-08-queue-player-access](2026-11-08-queue-player-access.md) | Player access to the session queue and roster | public-session-queue, match-card, public-participants, join-request-form | IN MOCK APP — #569 |
| [2026-11-08-queue-public-join-card-layout](2026-11-08-queue-public-join-card-layout.md) | Public page "Want to play?" card gets a stacked layout | join-request-card | IN MOCK APP — #500 (PR #551) |
| [2026-11-08-queue-public-participants-plain-grid](2026-11-08-queue-public-participants-plain-grid.md) | Public page participants become a plain grid, not cards | public-participants | IN MOCK APP — #500 (PR #551) |
| [2026-11-08-queue-public-slots-left](2026-11-08-queue-public-slots-left.md) | Public session remaining-slot copy | join-request-card | IN MOCK APP — #570 |
| [2026-11-08-queue-public-waitlist-tiles](2026-11-08-queue-public-waitlist-tiles.md) | Public page waitlist shows as tiles with queue numbers | public-participants | IN MOCK APP — #500 (PR #551) |
| [2026-11-08-queue-roster-card-emphasis](2026-11-08-queue-roster-card-emphasis.md) | Roster grid card puts presence and level first | roster-card, segmented-control, roster-panel, preparation-roster | IN MOCK APP — #498 |
| [2026-11-08-queue-roster-skill-mix-progress](2026-11-08-queue-roster-skill-mix-progress.md) | Roster skill mix is one compact bar with hover counts, in non-green colors | theme.css, skill-distribution-bar, slot-meter, preparation-roster | IN MOCK APP — #498 (superseded by 2026-11-08-queue-roster-summary-one-box) |
| [2026-11-08-queue-roster-summary-one-box](2026-11-08-queue-roster-summary-one-box.md) | Roster tab: slots and skill mix in one box, one bar | slot-meter, preparation-roster | IN MOCK APP — #498 |
| [2026-11-08-queue-roster-view-toggle-icons](2026-11-08-queue-roster-view-toggle-icons.md) | Roster List / Grid toggle uses icons | roster-card, segmented-control, roster-panel, preparation-roster | IN MOCK APP — #498 |
| [2026-11-08-queue-saved-players-stats-fade](2026-11-08-queue-saved-players-stats-fade.md) | Saved player statistics: edge fade, and arrows only when the cards overflow | switch, payments-checklist, saved-player-stats-carousel | IN MOCK APP — #498 |
| [2026-11-08-queue-session-qr-share-card](2026-11-08-queue-session-qr-share-card.md) | Session QR becomes a branded share card with a logo in the QR | session-join-qr, session-preparation | IN MOCK APP — #499 |
| [2026-11-08-queue-setup-court-pictures](2026-11-08-queue-setup-court-pictures.md) | Session setup shows each court as a court picture that opens an edit dialog | setup-court-picture, session-setup-form, session-setup, add-court-form | IN MOCK APP — #501 |
| [2026-11-08-queue-setup-page1-rearranged](2026-11-08-queue-setup-page1-rearranged.md) | Session setup page 1 rearranged: venue up, steppers side by side, court times folded | session-setup-form, session-setup, add-court-form | IN MOCK APP — #501 |
| [2026-11-08-queue-setup-time-fields-layout](2026-11-08-queue-setup-time-fields-layout.md) | Setup: Starts and Ends side by side, next day becomes a small link | time-field, date-time-picker, session-setup-form, session-setup, add-court-form | IN MOCK APP — #501 (superseded by 2026-11-08-queue-setup-when-block) |
| [2026-11-08-queue-setup-when-block](2026-11-08-queue-setup-when-block.md) | Setup: date, start and end beside a total duration box | session-setup-form, session-setup, add-court-form | IN MOCK APP — #501 |
| [2026-11-08-queue-time-field-dialog](2026-11-08-queue-time-field-dialog.md) | Time fields open a time dialog instead of three dropdowns | time-field, date-time-picker, session-setup, add-court-form | IN MOCK APP — #501 |
| [2026-11-08-queue-time-picker-hour-minute](2026-11-08-queue-time-picker-hour-minute.md) | Time fields pick hour, minute and AM/PM from three short dropdowns | — | IN MOCK APP — PR #489 (superseded by 2026-11-08-queue-time-field-dialog) |
| [2026-11-08-queue-title-public-page-icon](2026-11-08-queue-title-public-page-icon.md) | Preparation title gets an "Open public page" icon button | page-header, more-options-sheet, session-preparation | IN MOCK APP — #499 |
| [2026-11-09-queue-next-match-picker](2026-11-09-queue-next-match-picker.md) | After a result, a next-match picker offers two ready matches (left or right) | sheet, next-match-sheet | IN MOCK APP — #579 |
<!-- status-index:end -->
