# Example sessions, Demo scenarios, Cancelled sessions, and the short-on-players banner

Status: ALREADY A TICKET — #408
Date: 2026-11-06
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Dashboard calendar, Preparation, Session record, Public page, Live console (Session view), Prototype menu
Screen ID: Q-HOME, Q-PREPARE, D-CANCEL-SESSION, Q-HISTORY, Q-PUBLIC-JOIN, Q-CONSOLE, Q-COURTS

## What changed
- **Example sessions (prototype-only demo data, not a product feature).** The dashboard calendar now shows,
  relative to today: an ordinary finished night (**Open Play Night**, 2 days ago); a full house (**Lahug Smash
  Night**, 24 of 24 slots); over the slot budget (**Payday Open Play**, 27 of 24, “3 additional players
  admitted”); few players for the courts, everyone well above the minimum (**Rainy Morning Doubles**); a
  cancelled session (**Morning Doubles**, 4 days ago, reason “Not enough players”, six joiners, one on the
  waitlist, one marked paid); and two upcoming prepared sessions (**Club Doubles Night** tomorrow, full with
  4 on the waitlist; **Beginners and Friends** in 3 days, about 60% joined). The existing seeds stay.
- **Prototype › Demo scenarios (prototype only).** A chip-marked block in the Prototype menu loads one live
  example at a time: **Full house**, **Short on players**, **Players over the minimum**, **Five-court booking
  example**, **36 to 37 admission example**, or **No live example**. Loading one replaces the live example
  running now, so one session is live at a time. Disabled while a session the club started itself is live
  (“One session at a time: finish it with Session done to load a demo scenario.”).
- **New session status, Cancelled.** Preparation header (prepared sessions only, never in Session settings)
  gains **Cancel session** (danger). It opens a confirm sheet **Cancel TITLE?**: date · time, “N players
  joined · M on the waitlist”, a warning “P players are marked paid. Refunds happen outside ROTRA.” when any
  are, **Reason (optional)** (120 characters), “This can't be undone. To play anyway, create a new session.”,
  **Keep session** / **Cancel session**. Toast “TITLE cancelled”; the session record opens.
- **Cancelled session record.** No tabs: chip **Cancelled** with “Cancelled WHEN” (“Cancelled yesterday 9:00 PM”, “Cancelled Mon, Nov 2 · 6:00 PM”), the reason (or “No
  reason given.”), “This session was cancelled before it started. It has no games, standings or result
  slides, and it doesn't count toward player records or rankings.” (plus “N players were marked paid;
  refunds happen outside ROTRA.”), totals Joined / Waitlist / Marked paid / Courts, **Open public page**,
  the roster with Paid ₱X / Not paid, and the waitlist. Opening a cancelled session's preparation shows
  its record.
- **Calendar:** a **Cancelled** legend key and dot (hollow ring, muted, struck-through title), distinct
  from Invalid (red) and Completed (filled grey). Day dialog and peek sheet chip **Cancelled**.
- **Public page:** chip **Cancelled**; in place of the join card, “**This session is cancelled.** REASON.”
  No Request to join.
- **Cancel side effects:** pending join requests close; payment marks are refused (“Payments are not
  available for this session.”); cancelled sessions are ignored for clashes and offline downloads.
- **Short on players (live).** The Session view shows a warning banner above Courts when the present players
  can't fill every free open court: “7 players present: enough for 1 doubles court. 3 sit out each game.”
  A free court that can't get a match says **“Not enough free players.”** instead of “No waiting match can
  go on: …” / “The queue is empty.”

## Why
- Owner request and decisions, 2026-11-06 (Jose): example sessions on the Queue dashboard, one live example
  at a time and switchable; Cancelled as a new status (not Invalid), only before Start session and final;
  keep records, refunds outside ROTRA; short on players gets a banner and honest courts. Summary in the
  [business open decisions](../business_logic/product/open-decisions.md#cancelled-sessions).

## Docs updated
- Business logic:
  - docs/business_logic/product/queue/modules/sessions/README.md — Cancelled state; “Cancelling a session”
    rules; clashes exclude cancelled; short-on-players pointer
  - docs/business_logic/product/queue/modules/sessions/flow/session-lifecycle.md — cancel before start
  - docs/business_logic/product/queue/modules/queueing/README.md — new “Short on players” section
  - docs/business_logic/product/queue/modules/financials/README.md — marks kept read-only, no refunds
  - docs/business_logic/product/queue/modules/players/README.md — join requests close; public page Cancelled
  - docs/business_logic/product/queue/modules/results/README.md — cancelled session record
  - docs/business_logic/product/queue/README.md — calendar marks cancelled sessions
  - docs/business_logic/product/open-decisions.md — “Cancelled sessions” (C1–C7) under November 6, 2026
- Database design (all proposals, nothing migrated):
  - docs/database_design/product/queue/modules/sessions-roster.md — `cancelled` state, `cancelled_at`,
    `cancel_reason`; overlap exclusion; join requests `closed`
  - docs/database_design/product/queue/modules/financials-inventory.md — marks retained, read-only, no refunds
  - docs/database_design/product/physical-schema.md — Group D proposal note
  - docs/database_design/product/command-contracts.md — proposed `cancelSession`; payment and public
    request guards
  - docs/database_design/product/open-decisions.md — cancelled-session proposals; offline cancel open
- Screen docs:
  - docs/screens/product/dialogs.md — new D-CANCEL-SESSION
  - docs/screens/product/modules/queue/session-setup.md — Cancel session in the Preparation header;
    `/edit` redirect
  - docs/screens/product/modules/queue/results-sharing.md — cancelled form of Q-HISTORY
  - docs/screens/product/modules/queue/public-session.md — Cancelled chip and notice, no join card
  - docs/screens/product/modules/queue/access-home.md — legend, hollow dot, struck-through title
  - docs/screens/product/modules/queue/session-console.md — short-on-players banner; “Not enough free
    players.”; “No waiting match can go on” copy matched to the mockup
  - docs/screens/product/state-matrix.md — cancel, cancelled record, payments, public page, short on
    players, counting row
  - docs/screens/product/navigation.md — cancelled sessions open only as their record
  - docs/screens/product/open-decisions.md — settled rows; open: offline cancel, Delete session next to
    Cancel session
  - docs/screens/product/modules/queue/README.md — index wording
- Other: docs/product-terms.md — Cancelled session, Cancel session, Short on players, `cancelled` code
  value, join request `closed` proposal, Invalid session ↔ Cancelled session; apps/mockup/queue-app/README.md
  — Demo scenarios and example sessions listed as prototype-only
- Demo data (example sessions, Demo scenarios) is prototype-only and needs no business or database change.

## Real app work
- Session status `cancelled` in `packages/data` types, mock store, rules and real-mode services, with
  `cancelledAt` and `cancelReason`; cancel allowed only from prepared, final.
- `cancelSession` command and hook (idempotent), closing pending join requests in the same write.
- **Cancel session** button on Q-PREPARE and the D-CANCEL-SESSION sheet in `@rotra/ui`, with stories in
  both themes.
- Cancelled session record (Q-HISTORY cancelled form), and the preparation / edit routes redirecting to it.
- Calendar Cancelled legend key, hollow dot and struck-through title, in every calendar view.
- Public page Cancelled chip and notice; no join card; request submission refused.
- Payment marks refused on a cancelled session; cancelled sessions excluded from clash checks and
  downloads.
- Short-on-players banner on the Session view and the “Not enough free players.” free-court copy.
- DB migration for `cancelled`, `cancelled_at`, `cancel_reason`, the overlap exclusion change and the
  join-request `closed` status.
- Not for the real app: example sessions and Demo scenarios (prototype-only demo data).
