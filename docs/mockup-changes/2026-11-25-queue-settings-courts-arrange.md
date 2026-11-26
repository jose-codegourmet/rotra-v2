# Queue app: the Settings tab's courts reorder by drag, rename from the label, and show how long they've been playing or free

Status: IN MOCK APP — #1105
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()` › `courtMini()` (Settings tab › Courts box); Change court label dialog (`SHEETS.courtLabel`)
Route: /queue/sessions/s-tonight?tab=settings
Screen ID: Q-CONSOLE
Artifact: none
Components: settings-courts-box, settings-court-card, add-court-tile, court-label-form, chip
Supersedes: none
Superseded by: none

## What changed
- Before: each court card in the Settings tab › Courts box showed the label as plain bold text, then the status chip.
  The court order was the order the courts were added. The chip read Playing, Getting ready, Not open yet or Free, with
  no time. Change court label refused a label another court already had.
- After:
  - **Drag to reorder.** Each court card's header starts with a drag handle (⠿, the queue card's grip), then the label.
    Dragging starts only from the handle, so the phone carousel still swipes. While dragging, the card lifts (shadow,
    follows the pointer) and the other cards move aside to show the drop spot. Dropping saves the new order at once and
    toasts “COURT moved to position N”. Escape drops the card back where it was. With the handle focused, Left or Up moves
    the court one place earlier, Right or Down one place later (same toast; focus stays on the handle). On phones, holding
    the card near the carousel edge shows the next or previous court. The Add court tile stays last and doesn't move.
  - The new order is the session's court order everywhere: the Courts tab, the public page, and Auto Queue, which fills
    free courts in court order.
  - **Rename from the label.** The label is a button (looks like the bold label; a dotted underline on hover) that opens
    the same Change COURT label? dialog the Courts tab's ⋯ menu opens.
  - **Duplicate labels are allowed.** Change court label no longer checks other courts' labels. It still needs a label of
    20 characters or fewer. (Add court and the session setup court dialog had no such check.)
  - **Timers in the chip.** Playing reads “Playing · 14 min”, counted from the match's start. Free reads “Free · 6 min”,
    counted from the latest of the court's open moment (opened early, else its planned start, else the session start) and
    the end of the last done or invalid match on that court. Getting ready and Not open yet have no timer. Whole minutes;
    under 1 min reads “0 min”; from 60 min it reads “1 h 5 min”. The console's 30-second refresh keeps them current.

## Why
- Owner request, November 25, 2026: reorder the courts in the Settings tab by dragging, rename a court by clicking its
  label, allow two courts with the same label, and show on the chip how long a court has been playing or free.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: handle default, hover, focus, dragging (lifted card, others moved aside), dropped, cancelled with Escape;
  keyboard move at the first and last place (no change); label button default, hover (dotted underline), focus; chips
  Playing · N min, Free · N min, 60+ minutes (“1 h 5 min”), Getting ready, Not open yet; phone carousel with the handle
  dragged near the edge.
- Copy: “Move COURT” (handle aria-label), “Drag to reorder” (handle title), “Change COURT label” (label button aria-label),
  “COURT moved to position N” (toast), “Playing · N min”, “Free · N min”, “N h N min”. Removed: “Another court already has
  this label.”
- Tokens: none (the lifted card uses the same shadow as a dragged queue card).
- Known differences: none

## Reuse plan
- Reuses as is: court-label-form — the Change court label dialog, opened from the card label; chip — status chip with the
  time text; the queue card's grip glyph (⠿) and drag lift.
- Extends: settings-courts-box — drag and keyboard reorder of its court cards, Add court tile excluded;
  settings-court-card — a drag handle slot and a label button before the chip, timer text in the chip.
- New: none
- Shares work with: 2026-11-19-queue-live-settings-cards.md (the same Courts box)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — the Queue Master sets the court order by
  dragging in Settings; that order is used everywhere, Auto Queue fill included; court labels may repeat.
- Database design: owned by another change in this round (court order kept with the session's courts) | none here
- Screen docs: docs/screens/product/modules/queue/session-console.md — Settings › Courts box (handle, label button, timers)
  and Change court label (no uniqueness rule); session-setup.md, dialogs.md — no uniqueness rule for court labels.

## Real app work
- packages/ui settings-courts-box and settings-court-card: the drag handle, pointer and keyboard reorder, label button,
  timer chips. packages/schema court-label rule and the court label form: drop the “unique within the session” check.
  apps/queue: save the court order to the session (mock store and real mode) so every view and Auto Queue fill follow it.
