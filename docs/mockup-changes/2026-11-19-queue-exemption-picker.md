# Queue app: the exemption list uses a player picker, not a select menu

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `exemptCard()`, sheet `exemptPick`, actions `openExempt`, `exToggle`, `exClear`, `exSave`
Route: /queue/sessions/s-tonight?tab=generate
Screen ID: Q-AUTO
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: player picker sheet (reuse the player tiles and level filter), dashed empty-state button
Supersedes: the “Add a player…” select in 2026-11-19-queue-generate-exemption-list
Superseded by: none

## What changed
- The “Add a player…” select is gone. The card has **Choose players** (primary when empty) or **Edit list**.
- Empty state: a dashed button “+ No one is exempt. Choose players to leave out.” that opens the picker.
- The **Exemption list** picker sheet: a search box, a level filter (All levels, Beginner, Intermediate, Advanced), and
  a grid of player tiles (picture with the level ring, short name, games so far, “· away” when not here). Exempt players
  sort first. Tapping a tile toggles it: selected tiles get the accent border and a check badge. “N exempt · Clear all”.
  Buttons **Cancel** and **Save list · N**; toast “Exemption list saved · N players” or “Exemption list cleared”.
- The chips with × under the card stay for quick removal.

## Why
- Owner artifact comment, November 19, 2026, on the exemption list: “you can do better, putting it in a select is just lazy”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; empty list, several exempt; search; level filter; Clear all; Cancel
  leaves the list unchanged.

## Docs updated
- docs/screens/product/modules/queue/match-queue.md (Q-AUTO)
