# Tabs: no thick focus border after a tap or click; thin ring for the keyboard (#736, proposed)

Status: NEW
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Shared tab styles (.tabs and segmented controls), e.g. Preparation › Roster and levels and Waitlist tabs
Route: /queue/sessions/s-tonight/preparation?tab=roster (any tab row)
Screen ID: none (shared tab style)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: tabs
Supersedes: none
Superseded by: none

## What changed
- Before: the selected tab, for example **Roster and levels · 24/24**, showed a thick green border after a tap or click.
- After: no focus border after a tap or click on any tab in the row or on any tab bar and segmented control that behaves the same way; reaching a tab with the Tab or arrow keys still shows a thin 1 px accent ring (inset, so the scrolling tab row does not clip it). One change in the shared tab styles, plus a keyboard-or-pointer flag so a tab re-focused by the app after a tap stays quiet.

## Why
- Owner decision pack, ticket #736 (recommended options): every tab in the row and every tab bar that behaves the same way, one fix in the shared tab style; no border after a tap or click, a thin one for keyboard focus.
- Ticket text: “The selected Roster and levels tab, showing a 24/24 count, has a thick green focus border around it … Remove that focus border.”
- Proposed, built to the recommended option of the owner decision pack. The owner has not approved it yet.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: tab after a tap or click (no ring), tab reached with Tab (thin ring), arrow keys (thin ring), selected and not selected, mobile tab grid, phone dropdown unchanged.
- Copy: none
- Tokens: none (reuses --accent)
- Known differences: none

## Reuse plan
- Reuses as is: tabs, segmented control.
- Extends: tabs (focus style only).
- New: none
- Shares work with: none

## Docs updated
- Business logic: none needed.
- Database design: none needed.
- Screen docs: `docs/screens/product/modules/queue/session-setup.md` › Tabs row (focus rule). The shared rule belongs in `docs/screens/product/experience-contract.md`, which is outside this change's ownership; it is flagged for the owner of that file.

## Real app work
- Focus style in the shared Tabs component (:focus-visible thin ring, no outline for pointer focus); apply the same to the segmented control. Player and Admin tab bars follow the same component.
