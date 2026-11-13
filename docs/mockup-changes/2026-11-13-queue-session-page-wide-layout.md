# Session page: two columns on wide screens

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › public session page (viewPublic); `.pub-page`, `.pub-two`, `.pub-side`, `.pub-main`
Route: /queue/s/<session>
Screen ID: Q-PUBLIC
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: public-session-page (layout only)
Supersedes: none
Superseded by: none

## What changed
- Before: at every width the page was a single column of at most 760 px, so a desktop screen showed a thin column with wide empty sides, and 120 px of empty space at the bottom.
- After: from 1100 px the page widens to 1180 px. Hero and the Updated/Refresh line span the top; the tabs and their content take the left column; the join card (or the started/cancelled notice) and My night sit in a 360 px right column that stays in view (sticky) while scrolling. Below 1100 px nothing changes (same order: hero, join card, My night, tabs). Bottom padding is 48 px.
- Unchanged: every section's content and order on phones and tablets.

## Why
- Owner artifact comment, November 13, 2026: “so much white space”.

## Like for like
- Compare at: 375 px, 1024 px and 1440 px, dark and light.
- States: prepared (join card), active (started notice), finalized with and without shared results (Leaderboard tab), cancelled, visitor and signed-in player; a page with an empty side column stays one column.
- Copy: none
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: every section component; only the page layout changes.

## Pass 2 (artifact comment, November 13, 2026: “put the my night on top of the tabs”)
- My night moved out of the side column to sit right above the tabs, in the main column, at every width. The side column now holds only the join card or the started/cancelled notice. With no side column the page is one column of at most 960 px from 1100 px up (instead of 760 px).
