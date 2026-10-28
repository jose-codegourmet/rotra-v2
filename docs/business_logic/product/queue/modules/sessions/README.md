# Sessions

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../frames/queue-app/rotra-queue.html).

## Session states

| State | Meaning |
|---|---|
| Prepared | Created online; roster, levels, and settings can still change |
| Active | Started; levels locked; matches run from the console |
| Finalized | Valid Session done; results exist |
| Invalid | Records could not be trusted; no official results |

Only one session per club can be **Active** at a time. Preparing future sessions while one is active is allowed.

## Creating and editing

Sessions are created and edited online. An operator can fill in the setup form offline, but it cannot be saved, so an unsaved draft cannot be run offline.

Setup is **three pages** (decided October 26, 2026, to make setting up a queue faster), each holding two sections. Only page 1 has required fields: **Create session** is available on every page and fills everything else with the defaults below, so a quick session takes one page. The operator can jump between pages at any time.

| Page · section | Fields and rules |
|---|---|
| 1 · Details | **Title** (required), date, start time, end time, **venue** (required, one field chosen from the club's saved venues). An end time at or before the start time means the session ends the next day. The duration is shown |
| 1 · Courts | Number of courts booked (at least 1) and a label for each, defaulting to "Court 1", "Court 2", … |
| 2 · Formats and mode | Singles and Doubles switches for automatic generation; one session-wide mode: Chill, Fair, or Hard |
| 2 · Minimum games | Minimum completed games per player: calculated by default, or set by the operator. Expected players is optional; left empty it uses the slot budget (courts × players per court) |
| 3 · Financials | Optional cost estimate; see [Financials](../financials/README.md) |
| 3 · Notes and review | Optional notes shown on the public page, plus a summary with an Edit link per section |

A new session defaults to tomorrow, 7:00–10:00 PM, two courts, Doubles on, Singles off, Fair mode, and 12 expected players.

The venue may differ from the club's fixed founding address and never changes it.

### Recurring sessions and clashes

When creating a session, the operator can repeat it every week, every 2 weeks or every month (same date, clamped to the month's last day) for 2–12 sessions. Each date becomes its own prepared session with the same settings, roster empty, editable one by one.

No session may overlap another of the club's sessions (invalid sessions excepted):
- Same venue and overlapping times is a **venue clash**.
- Different venue but overlapping times is a **time clash**, because a club runs one session at a time.

A single clashing session cannot be saved. In a series, clashing dates are skipped and listed as skipped; if every date clashes, nothing is created. Editing a saved session's time or venue is checked the same way.

### Saved venues

The club keeps a list of venues it books: name (required, unique within the club), optional address, an optional **court fee per hour, per court**, and an optional **entrance fee per head** for venues that charge each player to get in. In setup the operator picks a venue from this list (searchable by name or area) or types a new name and saves it with its address and fee, so it appears next time. Venues can also be added and edited from the **Venues** page in the sidebar, which also shows each venue's rate, how many sessions were held there, the next one booked, and **Create session here**. Picking a venue fills in the session's venue name and address, its court fee when one is saved, and its entrance fee per head (a misc cost in the [estimate](../financials/README.md)) when one is saved. A venue's entrance fee takes priority over the club default.

### Formats

- Singles, Doubles, or both can be on. Automatic generation uses only the formats that are on.
- With both off, the session can still be saved. The operator is warned that Auto queue has nothing to generate and only manual fun games are possible.
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

## Starting

Start session is blocked when any of these is true:

- A roster player has no level.
- Another session at the club is active.
- The device is offline and has no downloaded copy.
- The club license has ended.

An empty roster or no present players does not block the start.

Starting locks every roster level and starts no match. The console opens on the Session view.

## Running

- The operator can add players at any time, including offline; late players get a level that locks immediately.
- **Add court:** label (defaults to the next "Court N") and **Open until** — either until the session ends (moves with extensions) or until a set time that is later than now and not after the session end. A new court is free immediately.
- **Remove court:** only a free court, and a session keeps at least one court.
- Each court shows its closing time. After that time it shows **Booking ended**. ROTRA never stops a game at a closing time; it is a reminder for the operator.
- **Extend time** by 30 or 60 minutes per action. The public page shows the new end after it syncs.
- Changing mode, formats, or the minimum during play has not been decided. These values stay visible and fixed.
- Players below the minimum take priority in automatic scheduling. The operator can still override lineups.
- Show an indicator when a player **exceeds** the minimum.
- Presence is an operator switch, not a resting/eating workflow.

## Ending

**Match done** ends one game; **Session done** ends the event.

Session done requires internet and records that are fully synced and reconciled. The review shows games recorded, participants, sync state, waiting matches never played, and players below the minimum.

- **Games still in play block Session done.** The operator must finish or invalidate them first. This is the agreed v1 behavior until a policy for closing unfinished games is decided.
- **Waiting matches never played** are dropped from results. What else happens to them is still open.
- **Minimum shortfall:** the operator sees each player below the minimum (completed of target) and can continue anyway. Low game counts alone never suggest a sync problem or invalidate a session.
- **Pending sync:** confirmation stays disabled until all changes on this device have synced.

See [lifecycle](flow/session-lifecycle.md), [offline recovery](../offline/README.md), and [results](../results/README.md).
