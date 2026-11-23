# Queue app: Settings courts are a one-court slider on phones (Embla Carousel)

Status: TICKETED — #1072
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()` courts (`.ls-embla`, `.ls-dots`), `setupCourtSlider()`
Route: /queue/sessions/s-tonight?tab=settings
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: settings court cards; a court slider (Embla Carousel)
Supersedes: the phone part of 2026-11-19-queue-settings-court-widths.md (two half-width cards a row)
Superseded by: none

## What changed
- Before: phones showed two cramped court cards a row.
- After, on screens 640 px and narrower: the courts are a swipeable slider with one court a slide (86% wide, so the
  next court peeks in) and dots under it. The active dot is a wider accent pill, and each dot jumps to its court
  ("Show Court 3"). The slide is remembered across re-renders, for example after changing a time.
- Wider screens are unchanged: two a row under a 1000 px box, and 350 px minimum cards that fill the row from 1000 px.
- The mockup loads `embla-carousel@8.5.2` (UMD) from jsDelivr.

## Why
- Owner artifact comment, November 19, 2026: “… and mobile one per row but make it as a slider use embla carousel”.

## Like for like
- Compare at: 375 px and 640 px (slider), 768 px (two a row), 1280 px (fill), dark and light.
- States: swipe, dot tap, edit a time on slide 3 (stays on slide 3), resize across 640 px.

## Copy
- Dots: “Show COURT LABEL”. Dot group label: “Courts”.

## Open
- **New dependency for the real app:** `embla-carousel` (and `embla-carousel-react` in `@rotra/ui`). AGENTS rule 11
  needs a decision entry before the ticket. The owner asked for Embla by name, so this log proposes it. Should the
  Main Queue slide mode use it too, in place of its CSS scroll-snap?

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Settings row, layout)
