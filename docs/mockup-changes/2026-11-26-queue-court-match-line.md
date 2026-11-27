# Queue app: court card match line as #N header and pills

Status: IN REAL MODE — #1124
Date: 2026-11-26
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `courtsPane` (`.ct-meta`, `.ct-num`, `.ct-time`)
Route: /sessions/[id] (live, Courts tab)
Screen ID: Q-CONSOLE (court cards)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court card
Supersedes: none
Superseded by: none

## What changed
- Before: one muted line, "Genderless Doubles · Match 17 · 1 min" (or "· waiting to start").
- After: a green **#17** in the mono font, a "Genderless Doubles" pill, and a time pill with a clock ("1 min"), or a
  "Waiting to start" pill on a Getting ready court. Substitutions follow as muted text.
- Then, same day: the court's top-right status became Free · Waiting (was Getting ready) · Playing · Ending · Ending
  soon, Ending and Ending soon as pulse pills (owner: "put ending label in the same league as playing in the top right"),
  and the separate estimate pill under the court was removed. Before that, briefly, the finish estimate under it was a pulse pill: "Ending · ~14 min" (was "Ends in about 14 min"), Finishing soon / Almost
  done in the accent, Running long in the warning colour (owner, same day: "should be a 'ending', make it a pulse pill").

- On phones the court's action buttons stack full width, 44 px tall, the primary one on top (owner, same day: "expand
  this on mobile", then "stack these buttons").

- A Grid / Slide switch on the right of the Manual Queue / Auto Queue row; Slide is an Embla carousel of the court
  cards with arrows and dots (owner, same day: "add a button or switch on the right, grid or slide mode, slide mode should
  use embla carousel"). In Slide, dragging the court picture swipes; dragging a match to another court works in Grid
  only (owner: "court dragging to another court should not work in mobile slider but grid mode it should work").

- The Courts view's chip (tab row and phone views menu) reads "Vacant N" in the warning colour while N courts are
  vacant, and "3/3 full" in green when none are (owner, same day).

## Why
- Owner artifact comment, November 26, 2026: "make genderless doubles as a pill, match 17 should just be a header green
  and #17, 1 min is a time pill label".

## Like for like
- Compare at: 375 px and 1280 px, dark and light. States: Getting ready, Playing, with substitutions, merged 5v5.

## Docs updated
- screens/product/modules/queue/session-console.md (match line under the court).
