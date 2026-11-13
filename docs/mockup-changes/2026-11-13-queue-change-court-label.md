# Queue: Change court label in the court menu

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › courtMenu, SHEETS.courtLabel, ACT.openCourtLabel / saveCourtLabel
Source: artifact comment on Court 1: “can we add an option called change court label”

## What changed
- The court card's ⋯ menu on the live console starts with **Change court label**, for free and busy courts.
- It opens a small dialog “Change COURT label?”: one **Court label** field, prefilled with the current label, required, up to 20 characters, unique within the session (case-insensitive). Errors: “Enter a court label.”, “Use 20 characters or fewer.”, “Another court already has this label.” Hint: “Shows on the console, the public page and match history after sync.”
- **Cancel** / **Save label**; toast “OLD is now NEW”. Only the label changes; matches, start and end times stay as they are. The label can still also be changed inside Edit / Change time.

## Docs updated
- `docs/screens/product/modules/queue/session-console.md` (court card menu).

## Not changed
- The court label is already a stored field (`label`), so no database change. The 20-character limit is new in the mockup; the real app should apply the same rule to the existing label field in Q-ADD-COURT.
