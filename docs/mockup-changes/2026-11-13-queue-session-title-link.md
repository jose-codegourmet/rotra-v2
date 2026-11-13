# Session title opens the public page in a new tab

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sessTitle, publicPageUrl, ACT.openPublicTab; used in the preparation, live session (console), session record and session results headers
Route: /queue/sessions/<id>, /preparation, /record, /results
Screen ID: Q-PREP, Q-CONSOLE, Q-RECORD, Q-RESULTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: session-page-header
Supersedes: the separate Open public page icon button next to the preparation title (2026-11-10-queue-prep-header-icons.md)
Superseded by: none

## What changed
- Before: the session title in page headers was plain text; only preparation had an Open public page icon button after it, which opened the preview in the same tab.
- After: in every Queue page header (preparation, live session, session record, session results) the title is a link to the session's public page (`/queue/sessions/<id>/public-page`, the club's preview) that opens in a new tab, with a small external-link icon after it (muted, accent on hover; underline on hover). The separate icon button in preparation is gone. Accessible name “TITLE. Open the public page in a new tab”. In the single-file prototype (outside the routed `/queue` paths) it opens the preview in place with the toast “In the app, this opens the public page in a new tab”.
- Unchanged: Session link card's Preview public page, the public page itself, titles in lists.

## Why
- Owner artifact comment, November 13, 2026: “the title of the session will always be clickable and will take to public page (new tab)”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: prepared, live, finished (record and results), cancelled; long titles wrap with the icon at the end.
- Copy: “Open the public page in a new tab”.
- Tokens: none
- Known differences: the prototype's in-place fallback; the real app always opens a new tab.

## Reuse plan
- New: session-page-header title link, shared by the four headers.
