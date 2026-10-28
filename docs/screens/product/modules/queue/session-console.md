# Active session console

**Surfaces:** `Q-CONSOLE`, `Q-COURTS`, `Q-POOL`, `Q-LEADERBOARD`, `Q-SESSION-ADJUST`, `Q-ADD-COURT`.

**Sources:** [session rules](../../../../business_logic/product/queue/modules/sessions/README.md), [queue rules](../../../../business_logic/product/queue/modules/queueing/README.md), [results](../../../../business_logic/product/queue/modules/results/README.md). **Reference:** [ROTRA Queue prototype](../../../../frames/queue-app/rotra-queue.html).

## Q-CONSOLE — Operator workspace

**Entry:** Start session, **Continue session** from home or the calendar, or the license gate's **Continue active session**. Private operator UI, not the public page.

**Header:** “Live session” with chips for mode, formats, and “Min N games”; title; “VENUE · Started HH:MM · Ends HH:MM”. Actions: **Home**, **Public page**, **Copy Facebook post**, **Extend time**, and **Join requests · N** (primary) while guest requests are waiting; it opens the same request list as preparation in a sheet, where confirmed guests are added present with their level locked.

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

Header “Courts” with “F of C free”. Cards flow in a responsive grid.

**In-game court:** label (both labels for 5v5, e.g. “Court 1 + Court 2”), “Until HH:MM”, chip **In game** (or **Merged · in game**). A court drawing to real proportions with each team's pictures and short names on its side of the net, stacked top to bottom (P1 over P2 | P3 over P4; larger fun teams wrap into a second column). Tapping a player opens their full profile dialog; 5v5 draws two stacked courts as one area. Line: “FORMAT · Match N · M min · S substitutions”. Action **Open match** ([Q-ACTIVE-MATCH](match-control.md)).

**Free court:** label, “Until HH:MM” — or **Booking ended HH:MM** in warning after its closing time — chip **Free**, and **Remove** (disabled with “A session needs at least one court” when it is the last). Body:

- With a ready match: “Skipped #1: REASON.” when earlier matches are blocked; “Next eligible: #P · FORMAT”; the two teams; **Review and start**; **Pick another** when more than one match is waiting.
- With none ready: “No waiting match can start: REASON.” or “The queue is empty.” and **Add match**.

A last tile **+ Add court** (“Becomes Court N, free right away”) opens Q-ADD-COURT.

Footer copy: “A match never starts by itself when a court frees up. You start each one.”

Removing an occupied court is refused with “Only a free court can be removed”.

**Upcoming queued matches (Session tab):** header with “N waiting” and attention count; the first few queue cards (one row, sized to the screen); a last tile **More queues** (“+N more waiting”, or “Reorder, add or regenerate”) that opens the Queue tab. Empty: “No matches queued yet.”

## Q-POOL — Players view

Header “Players”, “Tap players to pick them, then make a match. P present of R.”, action **Add late player**.

- Filter: **Available · N** (present and off court; default), **Present · N**, **Everyone · N**.
- Sort: longest wait (default), least games, most games, level high to low.
- Player card: picture, name, level, “G/MIN games”, “M min wait” (available players), status (**On Court X**, **Away**, **Queued · #P**, or **Free**), and a Present switch. Playing and away cards are styled distinctly.
- Tapping a card selects it; selected cards show their pick order. A selection bar shows the faces, “N selected · FORMAT” (or why not: “pick 2, 3, 4, 6, 8 or 10 players”, “singles is off for this session”), **Clear**, and **Make match**. Fun formats add “counts toward session games only”.
- Empty Available: “No one is free right now. Try Present or Everyone.”

When anyone is waiting or the session is full, the same **Waitlist** panel as preparation appears under the grid; giving a slot during play makes the player present with a locked level.

Footer copy: “Make match splits the players into teams balanced by level and adds it to the end of the queue. Present controls who can be paired automatically; turning someone off never ends their current game.”

Turning presence off confirms how many waiting matches now need attention.

## Q-LEADERBOARD — Tonight's standings

Copy: “Tonight's standings from completed games: most wins, then fewest losses, then head-to-head. It updates each time you confirm a result. Partial and invalid games don't count.”

Table: rank (top three highlighted), player picture, name and level, W, L, Games “g/min”, Win %. Empty: “No completed games yet. Standings appear after the first confirmed result.”

## Q-SESSION-ADJUST — Courts and time

Sheet **Courts and time**, opened by **Extend time**:

- Courts: current labels and **Add a court…** (opens Q-ADD-COURT).
- “Ends at HH:MM” with **Extend 30 min** and **Extend 60 min**. Hint: “The public page shows the new end time after it syncs.” Toast: “Session now ends HH:MM”.
- Copy: “Occupied courts can't be removed, and running matches aren't changed here. Changing mode, formats or the minimum during play hasn't been decided.”

Add player uses [Q-ADD-PLAYER](players-roster.md); the late player's level locks immediately.

## Q-ADD-COURT — Add a court

Sheet titled “Add LABEL?”.

| Control | Behavior |
|---|---|
| Court label | Defaults to the next “Court N” |
| Open until | **Until the session ends** (“HH:MM · moves if you extend time”) or **Until a set time** (“For a court booked for less time”) with a time field |

Errors: “Choose a closing time.”; “Choose a time later than now.”; “That's after the session ends at HH:MM. Pick an earlier time, or extend the session first.”

Preview: “LABEL will be free right away and open until HH:MM, about DURATION from now.” Note: “Courts show their closing time on the card. ROTRA doesn't stop a game at that time; it's a reminder for you.” Primary **Add LABEL**. Toast: “LABEL added · open until HH:MM”.

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

- No game begins just because a court becomes free.
- A full fun game increments minimum progress but does not imply global performance credit.
- Extending time moves the closing time of courts set to “until the session ends”, not of courts with a set time.
- An occupied court has no Remove action.
- A court past its closing time shows Booking ended but its game continues.
