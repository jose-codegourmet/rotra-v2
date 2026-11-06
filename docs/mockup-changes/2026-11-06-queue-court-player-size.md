# Bigger players, names, game counts and wait timers on court and queue cards

Status: ALREADY A TICKET — #408
Date: 2026-11-06
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live console (Courts, Upcoming queued matches)
Screen ID: Q-COURTS, Q-QUEUE

## What changed
- **Court drawing:** player pictures and name labels now scale with the court card's width instead of a
  fixed size. Doubles pictures go from 28 px to about 40 px on a phone and up to 52 px on a wide card;
  names go from 10 px to 12–15 px, on a darker pill (more contrast). Singles, 3v3 and 4v4/5v5 scale the
  same way within limits that keep every player inside the court at the narrowest card.
- **Game count on court faces:** each player picture on a court shows a small badge with their completed
  games this session (same count as “G/MIN games”; the match in progress counts only after Match done).
  The badge is filled with the picture ring's color and has no border: white with dark text at rest, the
  accent on hover. Before: no count on the court.
- **Queue cards:** wider (tiles of 220 px or more, was 160 px), pictures 28 px → 44 px (46 px on touch),
  names 11 px → 15 px semibold. History rows keep their small faces and 12 px names.
- **Wait timer on queue cards:** under each name, “M min” since the player's last game (or since arriving).
  Under 10 min plain, 10–15 min warning, 16 min or more error. On court / Playing / Not here replace the
  timer for busy or absent players.

## Why
- Owner feedback, 2026-11-06 (Jose): names on the court were hard to read, and the court should show
  each player's game count; queue cards were too narrow, and each name needs a wait timer
  (normal 1–10 min, warning 10–15, error 16+).

## Docs updated
- Screen docs: docs/screens/product/modules/queue/session-console.md — court drawing sizing and the
  game-count badge.
- Screen docs: docs/screens/product/modules/queue/match-queue.md — queue card size (220 px tiles, 44 px
  pictures, 15 px names) and the wait timer with its color steps.
- Business logic: none needed (presentation only; game counts and wait minutes already exist).
- Database design: none needed (nothing new is stored).

## Real app work
- `@rotra/ui` court card: scale player pictures and name pills with the card width (container query
  units), darker name pill, and the game-count badge (white at rest, accent on hover, no border) with
  the count in the picture's accessible name. Stories in both themes at 375 px and 1280 px.
- `@rotra/ui` queue card: 220 px minimum tiles, 44 px pictures (46 px on touch), 15 px semibold names,
  and the per-name wait timer (plain under 10 min, warning 10–15, error 16+; On court / Playing /
  Not here instead), refreshed with the console.
- `packages/data`: expose each player's wait minutes and games this session to both cards from the
  existing hooks; no new fetchers.
