# Sessions

**Last verified:** 2026-11-06.

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../../apps/mockup/queue-app/rotra-queue.html).

## Session states

| State | Meaning |
|---|---|
| Prepared | Created online; roster, levels, and settings can still change |
| Active | Started; levels locked; matches run from the console |
| Finalized | Valid Session done; results exist |
| Invalid | Records could not be trusted; no official results |
| Cancelled | Called off before **Start session**; final; no games, no results; counts nowhere (owner decision, November 6, 2026) |

Only one session per club can be **Active** at a time. Preparing future sessions while one is active is allowed.

## Creating and editing

Sessions are created and edited online. An operator can fill in the setup form offline, but it cannot be saved, so an unsaved draft cannot be run offline.

Setup is **three pages** (decided October 26, 2026, to make setting up a queue faster), each holding two sections. Only page 1 has required fields: **Create session** is available on every page and fills everything else with the defaults below, so a quick session takes one page. The operator can jump between pages at any time.

| Page · section | Fields and rules |
|---|---|
| 1 · Details | **Title** (required), date, start time, end time, **venue** (required, one field chosen from the club's saved venues). The end is on the session date or the next day, chosen with day buttons (never guessed), after the start and at most 24 hours later. The duration is shown |
| 1 · Courts | Number of courts booked (at least 1) and a label for each, defaulting to "Court 1", "Court 2", … |
| 2 · Formats and mode | Singles and Doubles switches for automatic generation; one session-wide mode: Chill, Fair, or Hard |
| 2 · Minimum games | Minimum completed games per player: calculated by default, or set by the operator. Expected players defaults to the slot budget (courts × players per court) and follows it until the operator types a number; clearing it follows the slot budget again. An untouched value is saved empty, so the session keeps following its slots |
| 3 · Financials | Optional cost estimate; see [Financials](../financials/README.md) |
| 3 · Notes and review | Optional notes shown on the public page, plus a summary with an Edit link per section |

A new session defaults to tomorrow, 7:00–10:00 PM, two courts, Doubles on, Singles off, Fair mode, and expected players = the slot budget (courts × players per court) until the operator changes it.

The venue may differ from the club's fixed founding address and never changes it.

### Times and days (owner decision, November 6, 2026)

Every time carries its day; ROTRA never guesses "next day" from a clock time.

- **One date-and-time picker** for every time field: session start and end, each court's planned start and
  end (setup and Add / Edit court), the new end in Start session, and the live end in Courts and time. Day
  buttons appear only when the field can fall on more than one day; then a time field that opens a dialog with AM/PM, hour and minute buttons
  (owner decision, November 8, 2026) in 15-minute steps offering **only valid times**. An existing value off
  the grid (a court opened at 10:42 PM) stays pickable so it can be kept. Before start, the session date itself is chosen with the calendar.
- Valid times: a session end is after its start and at most 24 hours later; a court's planned start is not
  before the session start and before the session end; a court's end is after its start and not after the
  session end; a live session end is after now.
- **Every time shows its day:** today is a plain time; yesterday and tomorrow get a word ("Yesterday 10:42 PM",
  lower-case mid-sentence); other days get the date ("Sat, Nov 1 · 9:00 PM"). A range whose end falls on the
  next day marks it "· next day". Where a date is shown next to the time, plain times are fine.
- **Club time zone:** times are shown and entered in the club's time zone (Asia/Manila for v1), not the
  device's. Not built yet: the single-device prototype assumes device time is club time. How rank windows and
  ID dates cut over is a separate, still-open decision.

### Recurring sessions and clashes

When creating a session, the operator can repeat it every week, every 2 weeks or every month (same date, clamped to the month's last day) for 2–12 sessions. Each date becomes its own prepared session with the same settings, roster empty, editable one by one.

No session may overlap another of the club's sessions (invalid and cancelled sessions excepted):
- Same venue and overlapping times is a **venue clash**.
- Different venue but overlapping times is a **time clash**, because a club runs one session at a time.

A single clashing session cannot be saved. In a series, clashing dates are skipped and listed as skipped; if every date clashes, nothing is created. Editing a saved session's time or venue is checked the same way.

### Saved venues

The club keeps a list of venues it books: name (required, unique within the club), optional address, an optional **court fee per hour, per court**, and an optional **entrance fee per head** for venues that charge each player to get in. In setup the operator picks a venue from this list (searchable by name or area) or types a new name and saves it with its address and fee, so it appears next time. Venues can also be added and edited from the **Venues** page in the sidebar, which also shows each venue's rate, how many sessions were held there, the next one booked, and **Create session here**. Picking a venue fills in the session's venue name and address, its court fee when one is saved, and its entrance fee per head (a misc cost in the [estimate](../financials/README.md)) when one is saved. A venue's entrance fee takes priority over the club default.

### Formats

- Singles, Doubles, or both can be on. Automatic generation uses only the formats that are on.
- With both off, the session can still be saved. The operator is warned that Generate matches (formerly called Auto Queue) has nothing to generate and only manual fun games are possible.
- A standard format that is off **cannot** be added manually either. Fun formats (1v2, 3v3, 4v4, 5v5) are always available for manual matches.

### Minimum games

The minimum is a target, not a guarantee and not a closing rule. Full fun games count toward it; partial and invalid games do not.

**Calculated minimum (default).** ROTRA estimates games per player and uses the low end:

- Players on court per game: doubles 4, singles 2, both formats on about 3.33 (generation runs roughly two doubles for every singles game).
- Usable courts = the smaller of booked courts and (players ÷ players per game, rounded down), at least 1.
- Games per player = usable courts × (session minutes ÷ game length, rounded down) × players per game ÷ players, rounded down.
- The low end uses 20-minute games; the high end uses 15-minute games. The **minimum is the low end**, so everyone can reach it.
- Player count is the roster size. Before anyone is added, the operator enters **expected players** (whole number, at least 1).
- While the session is prepared, the calculated minimum updates as the roster changes. It is fixed once the session starts.

**Set by the operator.** The operator can switch to a manual whole number (0 or more), with the estimate still shown for reference, and can switch back with **Use the estimate**.

### Preparation

The preparation overview shows setup, the estimate, this device's download state, roster and levels, and Start. The operator can edit the preparation, preview the public page, download for offline use, add or remove roster players, set levels, mark players present (one at a time or **Mark all present**), and start.

**Deleting a session.** A prepared session can be deleted while nobody is confirmed in it. Any confirmed player (roster slot) blocks the delete: the operator removes them from the roster first. Waitlist entries and pending join requests do not block it and are removed with the session, as are its courts, cost estimate and public link. Deleting needs internet and cannot be undone. A session that has started cannot be deleted; in a recurring set, only that one date is deleted.

### Cancelling a session (owner decision, November 6, 2026)

A **prepared** session can be **cancelled** from its Preparation page (**Cancel session**, destructive, away
from Start session). Cancel is the way to call off a session that already has joiners; deleting stays for a
session nobody is confirmed in.

- **Only before Start session.** An active, finalized or invalid session cannot be cancelled. A started
  session ends with Session done (or is invalid), never Cancelled.
- **Final.** There is no undo. To play anyway, the club creates a new session.
- **Confirm first.** The confirmation names the session, its date and time, how many players joined and how many
  are on the waitlist, warns when any are marked paid ("Refunds happen outside ROTRA."), and takes an optional
  **reason** (up to 120 characters). See [D-CANCEL-SESSION](../../../../../screens/product/dialogs.md#d-cancel-session--cancel-session).
- **What it keeps.** The cancelled time and the reason (if any) are recorded. The roster, waitlist and payment
  marks stay on the session, read-only. ROTRA does not refund anyone: refunds happen outside ROTRA, as with
  every payment ([Financials](../financials/README.md#payments-checklist)). Payment marks can no longer change.
- **What it closes.** Pending join requests close; the public page shows **Cancelled** and the reason, and no
  join form. The session no longer counts toward venue or time clashes, and is not offered for download.
- **What it counts toward.** Nothing: no games, standings, result slides, minimum, player records or ranking.
- The session opens as a read-only **session record** with a **Cancelled** chip
  ([Results › Session record](../results/README.md#session-record)). Opening its Preparation leads to that record.
- **Cancelled ≠ Invalid.** Invalid is a session that ran but whose records can't be trusted. Cancelled is a
  session that never ran.

## Starting

Start session is blocked when any of these is true:

- A roster player has no level.
- Another session at the club is active.
- The device is offline and has no downloaded copy.
- The club license has ended.

An empty roster or no present players does not block the start.

Starting locks every roster level and starts no match. The console opens on the Session view.

**Late or other-day start (owner decision, November 6, 2026).** When now is after the planned end, or on a
different calendar day than the planned start, Start session first asks for a **New end**: "This session was
planned for 6:00–9:00 PM yesterday. Set a new end time to start." It is pre-filled with now plus the planned
length, rounded up to the next 15 minutes, and must be after now (at most 24 hours ahead). Start stays disabled
until it is. Starting saves the new end; courts that follow the session end move with it, courts with their own
set times do not.

The actual start time (`startedAt`) is fixed once play begins: "Start time is fixed: it records when play began."

## Running

**Owner decision, November 1, 2026 (#323):** active sessions expose **Session settings**, the read-only preparation summary. Mode, formats, minimum, saved fee/costs, notes and roster levels can be inspected; fixed fields explain that they lock after start. Existing live controls remain available through their current sheets (courts/time, adding players, join requests, payments). This does not authorize editing preparation during play.

- The operator can add players at any time, including offline; late players get a level that locks immediately.
- **Add court:** label (defaults to the next "Court N") and **Open until** — either until the session ends (moves when the end time changes) or until a set time within the session; the planned start determines when the court becomes available, unless the operator opens it early with **Start anyway**.
- **Remove court:** only a free court, and a session keeps at least one court. Removing or editing a court is blocked while any match (On court or Playing) is on it.
- **Manual Queue | Auto Queue:** a per-session switch for how free courts get matches, starting on Manual Queue and changeable at any time. Neither mode starts a match. See [court filling](../queueing/README.md#auto-queue-and-manual-queue-court-filling).
- Each court shows its closing time. After that time it shows **Booking ended**, whether the court is free or has a match on it. ROTRA never stops a game at a closing time; it is a reminder for the operator.
- **Set end time** (owner decision, November 6, 2026): in **Courts and time** the end can move to any time after now, later or earlier, up to 24 hours after play began. **Extend 30 min** and **Extend 60 min** stay as shortcuts. Courts that follow the session end move with it; a court with its own set time does not, and blocks a new end before its booking ends or before it opens (edit that court first). The public page shows the new end after it syncs.
- **Overdue reminder:** after the planned end the console says "Planned end passed N ago" and offers **Set end time** and **Session done**. The session never closes by itself; Session done stays the operator's call.
- Changing mode, formats, or the minimum during play has not been decided. These values stay visible and fixed.
- Players below the minimum take priority in automatic scheduling. The operator can still override lineups.
- Show an indicator when a player **exceeds** the minimum.
- Presence is an operator switch, not a resting/eating workflow.
- **Short on players** (owner decision, November 6, 2026): when the present players can't fill every open
  court, the console says so honestly instead of suggesting courts are about to fill. See
  [Queueing › Short on players](../queueing/README.md#short-on-players).

## Ending

**Match done** ends one game; **Session done** ends the event.

Session done requires internet and records that are fully synced and reconciled. The review shows games recorded, participants, sync state, waiting matches never played, and players below the minimum.

- **Games still in play block Session done.** Any **Playing** match blocks it: the operator must finish or invalidate it first. This is the agreed v1 behavior until a policy for closing unfinished games is decided.
- **On court matches never started** are dropped like waiting matches (owner decision, November 6, 2026). The confirmation says "N matches on court weren't started and will be dropped."
- **Waiting matches never played** are dropped from results. What else happens to them is still open.
- **Minimum shortfall:** the operator sees each player below the minimum (completed of target) and can continue anyway. Low game counts alone never suggest a sync problem or invalidate a session.
- **Pending sync:** confirmation stays disabled until all changes on this device have synced.

See [lifecycle](flow/session-lifecycle.md), [offline recovery](../offline/README.md), and [results](../results/README.md).

## Individual court windows (owner decision, October 31, 2026)

Each court has a planned start and end within the Queue Session, including an explicitly indicated next-day end for an overnight session. Before its start the court is shown but excluded from dispatch, unless the Queue Master opens it early: **Start anyway** on the court (or **Open all courts now** for every court not open yet, or Start anyway in the Put on court sheet) asks for confirmation, then makes the court available for matches and Auto Queue at once, with no time window. The planned start stays as booked; the early open is recorded separately, counts as use (so the start becomes fixed) and lasts for the rest of the session. **Undo early open** returns a free court to Not open yet (amended November 1, 2026, #325). The end is advisory: it neither interrupts an active match nor prevents a new one; the Queue Master may move it later, even after it passes. A start can be edited until the court has hosted a match, then is fixed. Session-end courts follow every change to the session end; explicit ends do not. Manual closure removes only a free court, retaining at least one court. No abort or reopen lifecycle is implied. These windows do not change the approved cost or minimum-games formulas.

## Actual start and court previews (owner decision, November 1, 2026, #320)

Once the Queue Session is live, new court windows are bounded by the actual start (`startedAt`),
not the scheduled start. Courts using the default session start open at Start session; deliberately
staggered court starts keep their times. Retain the scheduled session time and existing earlier
court starts when editing a booking (used starts remain fixed). This does not change cost or
minimum-games calculations. Closing times remain advisory.

The Add / Edit court preview validates the same window as submit, immediately marks the offending
field, and never shows success for a rejected window. Booking duration is planned start to close;
“opens in” counts down to the planned start. An already-open booking shows time left; a passed
booking shows Booking ended. Session-end bookings explain that they follow the session end, and every time shows its
day (see [Times and days](#times-and-days-owner-decision-november-6-2026)).
