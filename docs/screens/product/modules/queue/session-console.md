# Active session console

**Last verified:** 2026-11-06.

**Surfaces:** `Q-CONSOLE`, `Q-COURTS`, `Q-POOL`, `Q-LEADERBOARD`, `Q-SESSION-ADJUST`, `Q-ADD-COURT`.

**Sources:** [session rules](../../../../business_logic/product/queue/modules/sessions/README.md), [queue rules](../../../../business_logic/product/queue/modules/queueing/README.md), [results](../../../../business_logic/product/queue/modules/results/README.md). **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html).

## Q-CONSOLE — Operator workspace

**Entry:** Start session, **Continue session** from home or the calendar, or the license gate's **Continue active session**. Private operator UI, not the public page.

**Header:** “Live session” with chips for mode, formats, and “Min N games”; title; “VENUE · Started 6:02 PM · Ends 9:00 PM · 1 h 20 min left”, every time with its day (“Started yesterday 10:42 PM”; see [times and days](../../experience-contract.md#times-and-days)). After the planned end the last part reads “Planned end passed 15 min ago” in the warning color. Actions: **Home**, **Session settings** (opens the read-only Q-PREPARE summary during play), **Public page**, **Copy Facebook post**, **Courts and time** (was **Extend time**), and **Requests · N** (primary; N = join requests + drop-out notices + match requests; [D-2026-11-09-05](../../../../mvp/decisions.md#d-2026-11-09-05)) while anything is waiting; it opens the sheet **Requests** with the same **Join · N** and **Match · N** tabs as the preparation card ([session-setup.md](session-setup.md), Requests card), where confirmed players are added present with their level locked and **Add to queue** makes a match request a waiting match. Self check-ins show on the roster, not here ([players-roster.md](players-roster.md), Q-ROSTER).

**Overdue banner (owner decision, November 6, 2026):** on the Session view, once the planned end has passed, a warning notice “**Planned end passed 15 min ago.**” with **Set end time** (opens Q-SESSION-ADJUST focused on the end picker) and **Session done** (disabled offline). The session never closes by itself.

**Short-on-players banner (owner decision, November 6, 2026):** on the Session view, above Courts, a warning notice when the present players who aren't busy can't fill every free open court with the session's standard format (doubles 4 a court, singles 2; doubles first when both are on). It counts all present players against the open courts: “7 players present: enough for 1 doubles court. 3 sit out each game.”; with both formats on, “… enough for 1 doubles court and 1 singles court.”; with no one left over, the second sentence is dropped; with too few for any game, “3 players present: not enough for a doubles game.” It has no buttons and disappears once the free players can fill every free open court. Rules: [Queueing › Short on players](../../../../business_logic/product/queue/modules/queueing/README.md#short-on-players).

Offline notice: “Working offline on this device. Matches, results and roster changes save here and sync when you reconnect. Session done needs internet.”

**Views (tabs), each with a live count chip:**

| Tab | Chip | Content |
|---|---|---|
| Session | “X/Y courts in use” | Q-COURTS, then one row of upcoming queued matches |
| Queue | “N waiting”, plus “N need attention” in warning | [Q-QUEUE](match-queue.md) |
| Players | “P/R present” | Q-POOL |
| Leaderboard | “NAME leads” once a game is done | Q-LEADERBOARD |
| Payments | “P/N paid” | The session's payments checklist ([financials](financials-inventory.md)) |

These are operator workspace views. They do not reintroduce the prohibited public Matches tab.

**Footer bar (always visible):** “G games recorded · A in play · W waiting” and **Session done** — disabled offline with “Connect to finish and sync this session.”

The console refreshes every 30 seconds (wait times, minutes in game, court closing times) unless a sheet is open, a field has focus, or a card is being dragged.

No live score-tapping interface, chat, spectator sockets, or named-manager collaboration UI.

## Q-COURTS — Court cards

Header “Courts” with “F of C free” and the **Manual Queue | Auto Queue** switch (owner decision, November 6, 2026; [rules](../../../../business_logic/product/queue/modules/queueing/README.md#auto-queue-and-manual-queue-court-filling)). The switch starts on **Manual Queue** for every session and can change at any time. With Auto Queue on, helper copy: “Free courts get the next ready match. You still start each one.” Turning it on fills every free open court at once, in court order; turning it off leaves Getting ready matches where they are. Cards flow in a responsive grid.

Each card has one of three states. The state is always written as a chip, so color is never the only signal; colors and the glow use tokens only.

| State | Look |
|---|---|
| Free | Plain card, chip **Free** (or **Not open yet** before its planned start) |
| Getting ready (On court) | Normal border, chip **Getting ready**, the court drawing with the players, primary **Start match**, secondary **Open match** ([Q-ON-COURT](match-control.md#q-on-court--getting-ready)) |
| Playing | **Steady accent border glow** (no pulse), chip **Playing** with the minutes, **Open match** ([Q-ACTIVE-MATCH](match-control.md)) |

**Court drawing (Getting ready and Playing):** label (both labels for 5v5, e.g. “Court 1 + Court 2”), “Until HH:MM” — or **Booking ended HH:MM** in warning once its closing time has passed, as on a free court (was always “Until”) — then a court drawn to real proportions with each team's pictures and short names on its side of the net, stacked top to bottom (P1 over P2 | P3 over P4; larger fun teams wrap into a second column). Pictures and names grow with the court card's width so they stay readable from arm's length: on a phone-width card a doubles picture is about 40 px with 12–13 px names, up to about 52 px with 15 px names on a wide card; names sit on a dark pill for contrast. Each picture carries a small round badge at its top right, filled with the same color as the picture's ring and no border of its own (white with dark text at rest; the accent with its matching text on hover), with the player's **completed games this session** (the same count as “G/MIN games”, so a credited substitute counts and the match being played does not until Match done); the player's accessible name reads “NAME, Team A, G of MIN games”. Tapping a player opens their full profile dialog; 5v5 draws two stacked courts as one area. Playing line: “FORMAT · Match N · M min · S substitutions”. A Getting ready card has no minutes, because the timer starts at Start match. If a player in it is not present, the card shows the reason and **Start match** is disabled until the lineup is fixed or the match is sent back.

**Free court:** label, “Until HH:MM” — or **Booking ended HH:MM** in warning after its closing time — chip **Free**, and **Remove** (disabled with “A session needs at least one court” when it is the last). Body:

- With a ready match: “Skipped #1: REASON.” when earlier matches are blocked; “Next eligible: #P · FORMAT”; the two teams; **Put on court** (opens [Q-DISPATCH](match-control.md#q-dispatch--put-a-waiting-match-on-court)); **Pick another** when more than one match is waiting. In Auto Queue a free open court is filled straight away, so this view shows only when the only ready match is a 5v5 (always placed by hand).
- With none ready: “Not enough free players.” when fewer players are free than the smallest standard match needs (owner decision, November 6, 2026); otherwise “No waiting match can go on: REASON.” or “The queue is empty.” Then **Add match**.

A last tile **+ Add court** (“Set a planned court window”) opens Q-ADD-COURT.

Footer copy: “A match never starts by itself when a court frees up. You start each one.”

Removing an occupied court (Getting ready or Playing) is refused with “Only a free court can be removed”. Editing a court is blocked the same way while a match is on it.

**Upcoming queued matches (Session tab):** header with “N waiting” and attention count; the first few queue cards (one row: as many 220 px+ tiles as fit the content width, minus one for More queues, so wider screens show more); a last tile **More queues** (“+N more waiting”, or “Reorder, add or regenerate”) that opens the Queue tab. Empty: “No matches queued yet.”

## Q-POOL — Players view

Header “Players”, “Tap players to pick them, then make a match. P present of R.”, action **Add late player**.

- Filter: **Available · N** (present and off court; default), **Present · N**, **Everyone · N**.
- Sort: longest wait (default), least games, most games, level high to low.
- Player card (owner request, November 9, 2026; [log](../../../../mockup-changes/2026-11-09-queue-player-cards-games.md)): picture, name, level, then two big numbers side by side: **played** (games played tonight) and **for the night** (played + queued matches, accent tinted). Under them the status (**On Court X**, **Away**, **Queued · #P**, or **Free**), with “· M min wait” appended for available players, and a Present switch. No queued or suggested counts on the card. Cards are roomier (14 px padding, 176 px minimum width, 12 px gaps). Playing and away cards are styled distinctly.
- Tapping a card selects it; selected cards show their pick order. A selection bar shows the faces, “N selected · FORMAT” (or why not: “pick 2, 3, 4, 6, 8 or 10 players”, “singles is off for this session”), **Clear**, and **Make match**. Fun formats add “counts toward session games only”.
- **Make match** opens [D-MAKE-MATCH](../../dialogs.md#d-make-match--confirm-a-match-from-picked-players) instead of adding the match straight away (owner request, November 9, 2026; [log](../../../../mockup-changes/2026-11-09-queue-make-match-confirm.md)).
- Empty Available: “No one is free right now. Try Present or Everyone.”

When anyone is waiting or the session is full, the same **Waitlist** panel as preparation appears under the grid; giving a slot during play makes the player present with a locked level.

Footer copy: “Make match shows the teams on a court first; Arrange to balance splits them by level before you add it to the end of the queue. Present controls who can be paired automatically; turning someone off never ends their current game.”

**Presence saving (Jose, November 1, 2026, #324).** Switches, status and Available/Present/Everyone counts change immediately. The grid stays interactive. Save wanted end states in one batch 800 ms after the last tap; returning a player to their accepted state within that window produces no write. Show “Saving presence…” on pending cards. A card leaving its current filter stays in place, greyed when away, until its batch settles or the operator changes filter/sort. Counts already reflect the new state.

One success toast per batch: “N player(s) marked present, M away” (omit a zero group); append “ · K waiting match(es) need(s) attention”, counting each affected waiting match once. Existing offline-save wording still applies. One existing error toast per failed batch; roll back only that batch's unchanged revisions and preserve newer taps. Pending presence is flushed before console/preparation tab changes, Make match, Add late player/Add player, and other roster writes, and on unmount, pagehide or hiding the page. A browser leave warns while a flush is outstanding; this in-memory mock cannot promise durable saves after the browser is destroyed. No per-player toast and no optimistic “saved” claim.

## Q-LEADERBOARD — Tonight's standings

Copy: “Tonight's standings from completed games: most wins, then fewest losses, then head-to-head. It updates each time you confirm a result. Partial and invalid games don't count.”

Table: rank (top three highlighted), player picture, name and level, W, L, Games “g/min”, Win %. Empty: “No completed games yet. Standings appear after the first confirmed result.”

## Q-SESSION-ADJUST — Courts and time

Sheet **Courts and time**, opened by **Courts and time** in the header or Session settings, and by **Set end time** on the overdue banner (focused on the end picker):

- Courts: current booking windows with **Edit**, guarded **Remove**, and **Add a court…** (opens Q-ADD-COURT).
- “Ends 9:00 PM” (with its day), plus “· Planned end passed N ago” in warning when overdue. A **New end** [date-and-time picker](session-setup.md#date-and-time-picker): times after now and up to 24 h after play began, later or earlier than the current end; day buttons when that spans two days. **Set end time** (primary, disabled until the choice is after now), **Extend 30 min** and **Extend 60 min** as shortcuts. Hint: “The public page shows the new end time after it syncs.” Toast: “Session ends at 9:30 PM · public page updates after sync” (another day: “Session ends tomorrow 1:00 AM · …”).
- Courts that follow the session end move with it; a court with its own set time does not. Errors under the picker: “Choose an end time after now.”; “Court 3 opens 9:30 PM. Pick a later end, or edit that court first.” (a court not open before the new end); “Court 2 is booked until 10:00 PM. Pick a later end, or edit that court first.” (a set booking past the new end).
- Copy: “Start time is fixed: it records when play began.”
- Copy: “Occupied courts can't be removed, and running matches aren't changed here. Changing mode, formats or the minimum during play hasn't been decided.”

Add player uses [Q-ADD-PLAYER](players-roster.md); the late player's level locks immediately.

## Q-ADD-COURT — Add a court

Sheet titled “Add LABEL?” or “Edit LABEL?”.

| Control | Behavior |
|---|---|
| Court label | Defaults to the next “Court N” |
| Planned start | [Date-and-time picker](session-setup.md#date-and-time-picker): not before the session start, before the session end. The court is unavailable before this time unless opened early (Start anyway); fixed after the court has hosted a match or been opened early (“Start is fixed after use.”) |
| Open until | **Until the session ends** (“HH:MM · moves if the session end changes”) or **Until a set time** (“For a court booked for less time”) with a date-and-time picker: after the planned start, not after the session end |

Errors: “Choose a closing time.”; “Choose a planned start within the session.”; “Choose an end after the planned start.”; “That's after the session ends at HH:MM. Pick an earlier time, or extend the session first.” Times on another day carry their day. A passed end may still be edited.

Preview updates immediately when Planned start, Open until, or the label changes. It validates the same window as submit and marks the offending field with the same inline error; an invalid window never shows the green success notice.

- Future fixed booking: “LABEL opens 9:30 PM and closes 10:30 PM (1 h booking). Opens in 9 h 18 min.” Booking length measures **planned start → close**; the countdown measures **now → planned start**.
- Already open: “LABEL is open now until 10:30 PM (about 2 h 15 min left).”
- Future session-end booking: “LABEL opens 6:00 PM and stays open until the session ends at 9:00 PM (3 h). Moves if the session end changes. Opens in ….” An already-open session-end booking also says it follows extensions.
- Every time carries its day: “tomorrow 1:00 AM”, “Sat, Nov 1 · 9:00 PM”.
- Passed end: a neutral “LABEL booking ended at HH:MM (… booking).” notice; the advisory booking remains editable.

**Early start (owner decision, November 1, 2026, #320):** once live, new court windows use the actual session start as their lower bound. Courts using the default session start open at the actual start; deliberately staggered starts keep their times. The scheduled session time is retained. Existing earlier bookings retain their original starts when edited, including a used court's locked start.

Note: “Courts show their closing time on the card. ROTRA doesn't stop a game at that time; it's a reminder for you.” Primary **Add LABEL** or **Save court**. Toast: “LABEL added · open until HH:MM”.

## State behavior

| State | Console behavior |
|---|---|
| Online and synced | Current accepted data; Session done available subject to the checks |
| Offline downloaded session | All match, roster, court, and time operations continue; Session done disabled with explanation |
| Device recovery with missing work | Prominent incomplete-record notice; new work allowed, finalization blocked |
| Local persistence failure | Stop claiming new operations succeeded; preserve last durable state |
| License expires mid-session | Continue this session only; no other club screens |
| Session finalized/invalidated elsewhere | Reconcile status before allowing further operations |

## Acceptance examples

- No game begins just because a court becomes free, in Manual Queue or Auto Queue.
- With Auto Queue on, a court freed by Match done shows the next ready match as **Getting ready**; the Queue Master still taps Start match.
- A new session's console starts on Manual Queue.
- A Playing card has the steady glow and the **Playing** chip; a Getting ready card has neither the glow nor minutes.
- Turning Auto Queue off leaves Getting ready matches on their courts.
- A full fun game increments minimum progress but does not imply global performance credit.
- Extending time moves the closing time of courts set to “until the session ends”, not of courts with a set time.
- An occupied court (Getting ready or Playing) has no Remove action.
- A court past its closing time shows Booking ended but its game continues.

### Court windows and live admission

Q-COURTS shows each booking window, including courts not yet available. Before planned start the card says “Opens at HH:MM. The court is unavailable before this time.” and offers **Start anyway**, which confirms (“Open Court 4 now?” · “It's booked from 8:30 PM.” · “Opening early makes it available for matches and Auto Queue now.” · “The booking time and costs don't change.” · **Cancel** / **Open now**) and then shows the court as Free with “Opened early · planned HH:MM – HH:MM”. The Courts header shows **Open all courts now** (same confirmation, listing every court) while any court is not open yet. Each court card keeps one visible action for its state; on a Getting ready court the ⋯ menu starts with **Swap with #P · Match N** (disabled “No other waiting match is ready” when none; see [Q-ON-COURT](match-control.md#q-on-court--getting-ready)); **Edit**, **Undo early open** (only before planned start; disabled “A match is on this court” while a match is Getting ready or Playing on it) and **Remove** sit in its ⋯ menu. The Put on court sheet (Q-DISPATCH) lists not-yet-open courts under “Not open yet” with Start anyway, and a match that only waits for a court keeps Put on court enabled while such a court exists. Auto Queue never fills a not-yet-open court; opening it early lets Auto Queue fill it. The end is advisory: show Booking ended but continue to allow placing a match, by hand or by Auto Queue, until the Queue Master removes the free court. Q-ADD-COURT and editing expose planned start and an end that follows session end or a fixed time. Start becomes fixed after the court has hosted a match; the planned end may be extended. Reject windows outside the session, indicate next-day times, and retain the free-court and at-least-one-court restrictions.

Q-POOL allows adding a late player or admitting any selected waitlisted player directly above budget. The admitted player is present with a locked level; waiting players are not automatically admitted at session start. Display played, queued and suggested counts separately; only Main Queue waiting matches contribute queued counts.

The mock Courts and time sheet edits each court's label, planned start and advisory end. A used court's start is fixed; its end remains editable after the booking passes. Court cards and dispatch use shared planned-start eligibility. Explicit ends stay fixed on session extension; session-end bookings follow it. No cost or fixed-minimum recalculation is attached to these live edits.
