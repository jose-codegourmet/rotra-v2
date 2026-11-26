# Add player › Saved players: account and skill filters, level on each row, debounced search

Status: TICKETED — #1127
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › SHEETS.add (Add player) › Saved players tab
Route: /queue/sessions/<live session>?tab=roster, then Add player
Screen ID: Q-ADD-PLAYER (players-roster.md)
Artifact: none
Components: add-player-sheet (saved players tab), segmented-control, select, skeleton
Supersedes: none
Superseded by: none

## What changed
- Before: the Saved players tab had the search and one list of every saved player not already in the
  session. After: under the search sits a segmented filter **All · N / Registered · N /
  Unclaimed · N / Guest · N**. Counts are of the players listed for the current search (players
  already in the session are never counted). All is selected every time the sheet opens. A
  lookup-pending player (added offline, not looked up yet) shows under All only.
- A filter with nothing in it shows "No registered saved players to add." (or "No registered saved
  player matches." while searching; the word follows the filter) with a **Show all** button. The
  existing empty states are unchanged.

## Why
- Owner, November 25, 2026, on the real app's Add player sheet: "please add filters All, Registered,
  unclaimed and guest".

## Like for like
- Compare at: 375 px and 1280 px, dark and light. At 375 px the four options wrap onto two lines, like
  the tabs above them; the page never scrolls sideways.
- States: All (default), each filter selected, a filter with no players (with Show all), search plus
  filter, every saved player already in the session, offline (the filter works offline like the list).
- Copy: "All · N", "Registered · N", "Unclaimed · N", "Guest · N"; "No registered saved players to
  add." / "No unclaimed saved players to add." / "No guest saved players to add."; while searching
  "No registered saved player matches." (and unclaimed, guest); "Show all". Group label "Show saved
  players".
- Tokens: none.
- Known differences: none.

## Follow-up, same day (owner, November 25, 2026)
- Owner: "can you please add skill label so I know if the player has a registered skill already and
  also add a skill filter and also add a debounce of 5 seconds add a loading indicator (skeleton
  preferrably)". The owner then chose a **0.5 s** debounce (not 5 s) and a skill filter by **level
  band** (not every exact level).
- **Level on each row.** The second line now reads the RTR ID (or "Guest" / "Details required") and
  the club's level for the player with the Saved players level bars: "Intermediate High", or "No
  level yet" (muted) when the club has none.
- **Skill filter.** A compact dropdown beside the account filter (five options as buttons wrapped
  and squeezed the list): "Skill: All levels · N", "Beginner · N", "Intermediate · N",
  "Advanced · N", "No level · N". Each option's count applies the other filter, so the account
  counts follow the skill pick and the skill counts follow the account pick. All levels on every
  open. The filtered empty state now reads "No saved players to add with these filters." (or "No
  saved player matches these filters." while searching) with **Show all**, which resets both.
- **Debounced search.** The list applies the search 0.5 s after the last keystroke. While it waits,
  four skeleton rows (circle, two lines, pill) stand in for the list, the list is `aria-busy`, and a
  screen-reader status says "Searching saved players…". The shimmer stops for reduced motion. The
  search field keeps focus throughout.
- Copy added: "Skill: All levels · N", "Beginner · N", "Intermediate · N", "Advanced · N",
  "No level · N", "No level yet", "No saved players to add with these filters.", "No saved player
  matches these filters.", "Searching saved players…" (screen readers only). Copy replaced: the
  per-filter empty lines ("No registered saved players to add." …) from the first pass.

## Reuse plan
- Reuses as is: SegmentedControl — the filter (the Payments sheet's "Everyone · N / Not paid · N /
  Paid · N" is the same pattern).
- Extends: the Add player sheet's saved players tab — account and skill filter state, reset on open;
  a debounced search value; the level line on each row.
- Reuses as is: the Select (skill dropdown), Skeleton (waiting rows), and the Saved players level bars.
- Shares work with: none.

## Docs updated
- Business logic: none needed (display filter only).
- Database design: none needed.
- Screen docs: docs/screens/product/modules/queue/players-roster.md — the Saved players tab row.

## Real app work
- Queue Add player › Saved players: the account filter and skill dropdown with cross-applied
  counts, All on every open, the filtered empty state with Show all; the level line on each row;
  the 0.5 s debounced search with skeleton rows.
