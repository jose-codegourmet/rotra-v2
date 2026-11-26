# Players tab: sort buttons, All present / All away, and presence from the selection bar

Status: IN REAL MODE — #1134
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › live session › Players (Q-POOL), its selection bar
Route: /queue/sessions/<live session>?tab=roster
Screen ID: Q-POOL (session-console.md)
Artifact: none
Components: segmented-control, select, selection-bar, the Players view container
Supersedes: none
Superseded by: none

## What changed
- **Sort.** Before: one dropdown "Sort: longest wait / least games / most games / level, high to
  low". After, on desktop: a segmented row of buttons at the right of the filter row, **Name · Games
  · Wait · Level**. The active one carries a direction arrow; tapping it again flips the direction;
  another sort starts in its first direction (Name A–Z, Games fewest first, Wait longest first, Level
  high to low). Games counts the card's **Total** (played plus queued). Wait keeps its grouping
  (playing players last, away after present). Phones (≤ 760 px) keep a dropdown, now with both
  directions of each sort. Default stays Wait, longest first.
- **All present / All away** buttons join the header actions (before Set games for all…). Each
  changes every roster player; each is disabled when nobody would change. A game in play carries on.
- **Selection bar** gains **Set present** and **Set away** beside Clear and Make match. They set the
  picked players, clear the picks and toast "N players marked present" / "N players marked away".
  Each is disabled when no pick would change.

- Name sorts by the name the card shows (club nickname, then nickname, then full name), ignoring
  case: "onyot" (a club nickname) sorts under O, not under the player's full name (owner, same day).

## Why
- Owner, November 25, 2026, on the real app's Players tab: "in desktop can we make the sorts be
  buttons and put it in the right side: sort by name asc desc, sort by x games asc desc, sort by
  games length asc desc; and also a button for switch all to present, switch all to away; and when
  they select it can either make match, set to present or set to away". The owner then chose: games
  length = wait time; x games = Total; keep the Level sort.

## Like for like
- Compare at: 375 px and 1280 px, dark and light. At 375 px the dropdown shows, never the buttons.
- States: each sort in each direction; Waitlist filter (no sort controls, as before); All present
  disabled when nobody is away, All away disabled when nobody is present; selection bar with mixed,
  all-present and all-away picks; offline (presence saves as before, "Saved on this device").
- Copy: "Name", "Games", "Wait", "Level"; button names "Sort by name, name A–Z" (and the other
  directions); dropdown "Sort: name A–Z", "Sort: name Z–A", "Sort: fewest games", "Sort: most
  games", "Sort: longest wait", "Sort: shortest wait", "Sort: level, high to low", "Sort: level, low
  to high"; "All present", "All away", "Set present", "Set away"; toasts "Everyone marked present",
  "Everyone marked away", "N player(s) marked present", "N player(s) marked away".
- Tokens: none.
- Known differences: none.

## Reuse plan
- Reuses as is: SegmentedControl (sort buttons, with the existing up / down icons), Select (phone
  sort), Button.
- Extends: the selection bar — two secondary actions; the Players view — sort key + direction state.
- Shares work with: none.

## Docs updated
- Business logic: none needed (presence rules are unchanged; bulk changes go through the same
  presence saving and its batch toast).
- Database design: none needed.
- Screen docs: docs/screens/product/modules/queue/session-console.md — Q-POOL header actions, Sort,
  selection bar.

## Real app work
- Players view: the sort buttons (desktop) and the two-direction dropdown (phone); All present / All
  away; Set present / Set away in the selection bar, through the existing presence batch.
