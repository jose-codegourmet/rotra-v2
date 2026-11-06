# Roster and levels: level tabs, Group by and a List | Grid view

Status: NEW
Date: 2026-11-06
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation / Session settings › Roster and levels tab
Screen ID: Q-PREPARE

## What changed
- **Level tabs** inside the Roster and levels panel: **All · Advanced · Intermediate · Beginner**, each
  with a count chip. A player's tab is the family of their level for this club (Advanced Low/Mid/High →
  Advanced, and so on). Players with no level yet are under All, and a **No level** tab appears only while
  someone has none. The four (or five) counts add up to All. On a phone the tab row scrolls sideways inside
  itself; the page does not. An empty tab says “No Beginner players on the roster.” Before: one list.
- **Group by** select (“Group by: …”): **None** (default, one list), **Skill group** (Advanced /
  Intermediate / Beginner / No level; offered on the All tab only, a level tab falls back to None),
  **Availability** (Present / Not present), **Returning or first time** (Returning = has played a session at
  this club before; First time here = no earlier session here), **ROTRA profile** (Has a ROTRA profile =
  Registered or Unclaimed; Guest = name only, including a player whose phone lookup is still pending), and
  **Payment** (Paid / Not paid). Each group is a heading with its count (“Present · 10”); empty groups are
  hidden; players keep roster order inside a group.
- **List | Grid** toggle (segmented, labelled “Roster view”). List is the existing rows, unchanged. Grid
  shows player cards: picture, name, identity chip, remove ×, “Suggestion: LEVEL”, the level select before
  start (still sets the level) or “LEVEL · Fixed after start” after start, the suggestion indicator
  (“✓ Matches suggestion”, “▼ May be too low …”), the Present switch before start or Present / Away after,
  and Paid / Not paid.
- The tab, Group by and view are remembered on this device (`S.ui.rv`, like the live Players filters).
- Unchanged: the slots meter, Mark all present / absent, Add player, the missing-level warning, level
  picking before start, “Fixed after start” after start, and all existing copy.

## Why
- Owner request, 2026-11-06 (Jose): tab the roster by level, toggle views by groups, and offer a grid as
  well as the list. The owner said “guest or member”; “member” is not a ROTRA term
  ([product-terms.md](../product-terms.md)), so that grouping became **Returning / First time here**, and
  the account split uses **Has a ROTRA profile / Guest**.

## Docs updated
- Screen docs: docs/screens/product/modules/queue/session-setup.md — new “Roster views” row in Q-PREPARE.
- Business logic: none needed (presentation only; levels, presence and payments behave as before).
- Database design: none needed (the three choices are device-only UI preferences, not stored data).

## Real app work
- `@rotra/ui`: a roster toolbar (level tabs with counts, Group by select, List | Grid toggle) and a
  roster player card for the grid, with stories in both themes at 375 px and 1280 px.
- Queue app Preparation / Session settings › Roster and levels: wire the toolbar to the roster from the
  existing hooks; group and filter on the client; remember the three choices on the device.
- `packages/data`: a per-player "has played a session at this club before" flag for Returning /
  First time here, derived from session history (no new table).
