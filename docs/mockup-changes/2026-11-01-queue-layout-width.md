# Queue pages fill the screen width

Status: ALREADY A TICKET — #348
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › every page (`.wrap`, `.top-in`, `.footer-bar .in`, `.proto-bar .in`), Queue tab and Session tab grids
Screen ID: Q-CONSOLE, Q-COURTS, Q-QUEUE, and all Queue pages

## What changed
- Page content was capped at 1240 px and centered → it fills the window beside the rail with side
  padding `clamp(16px, 3vw, 40px)` (never under the safe-area insets), at every width, no maximum.
- The top bar, footer bar and prototype bar use the same padding, so they line up with the page.
- Form pages (`.narrow`: session setup, finishing, recovery and similar) keep a 760 px readable width,
  centered inside the full-width page.
- Queue grid columns (`queueCols()`) come from the content width (window − rail − padding) with
  160 px+ tiles and 10 px gaps, not window breakpoints capped at 5. The Session tab's upcoming row
  shows columns − 1 tiles plus More queues, so wider screens show more queued matches.
- Courts keep `auto-fit minmax(250px)` and gain columns from the wider content.

## Why
- Jose (Nov 1, 2026, #348): pages should use the screen, especially on an iPad. Owner answers: all
  Queue pages; forms keep a readable width; no ultra-wide cap.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: experience-contract.md (layout widths), match-queue.md (grid columns),
  session-console.md (upcoming row)

## Real app work
- Done in #348: `px-page` utility in `@rotra/config/theme.css`; Queue pages, `TopBar width="page"`,
  `ConsoleFooterBar`, `StartSessionBar` and `PublicPreviewBanner` drop the 1240 px cap;
  `useQueueColumns` measures the grid with a ResizeObserver (`queueColumnsFor`).
