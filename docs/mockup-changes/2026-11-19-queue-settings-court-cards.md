# Queue app: Settings › Courts shows court cards with editable times

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()` (`courtMini`), `CHANGE.courtTime`, `CHANGE.courtFollow`
Route: /queue/sessions/s-tonight?tab=settings
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: small court card (reuse the court drawing and status chips), time inputs, checkbox
Supersedes: none
Superseded by: none

## What changed
- The **Courts · N** card on the Settings tab spans the full width, with **Courts and time** in its header.
- Inside, one small card per court, laid out like the Courts tab: the court label, a status chip (Playing, Getting ready,
  Free, Not open yet), and the court drawing with its players (grey with “FREE” when free). A playing court has the
  accent border and glow.
- Under each drawing the times are inputs, not text:
  - **From** and **Until** time fields; **Follows session end** checkbox (on: Until is greyed out and follows the session's
    end; off: the court gets its own end time).
  - Changes save at once with a toast (“Court 1 open until 11:15 PM”). A From at or after Until is refused with “Court 1
    has to open before it closes.”; an Until earlier than From means the next day.

## Why
- Owner, November 19, 2026, in the session with screenshots of the Courts tab and the Settings Courts card: “the courts
  box should have a similar layout but the below info is a input with time”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; free, getting ready and playing courts; Follows session end on and off;
  an invalid From.

## Open
- Whether changing a time here should ask for confirmation when a match is on that court (the mockup saves at once).

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table, Settings)
