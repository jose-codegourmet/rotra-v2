# Roster skill mix is one compact bar with hover counts, in non-green colors

Status: TICKETED — #498
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation › Roster and levels tab (the same Skill mix also shows on the public session preview)
Screen ID: Q-PREPARE (roster tab), public session preview
Supersedes: none
Superseded by: 2026-11-08-queue-roster-summary-one-box.md
Route: /queue/sessions/s-tonight/preparation?tab=roster
Components: theme.css, skill-distribution-bar, slot-meter, preparation-roster

## What changed
- **Always visible.** Before: the Skill mix bar showed only after choosing Group by Skill group. After: it
  sits under the slots meter whenever the roster has players, on every tab and Group by setting.
- **One compact bar.** Before: a stacked bar and a dot legend with counts. After: only the bar, one segment
  per group sized by head count, with a small “Skill mix” label (no player total), ordered Beginner, Intermediate, Advanced, then No level from the left. Hovering or focusing a
  segment shows its count (“Beginner: 4 players”). No legend or rows.
- **No green.** Before: three steps of the green accent. After: Beginner blue, Intermediate yellow,
  Advanced red (the owner chose these hues in a later comment; shades tuned to sit beside the green primary), No level grey, as tokens `--lv-beg`, `--lv-int`, `--lv-adv` with dark and light values.

## Why
- Owner comment on the artifact, November 8, 2026: show the skill levels, do not use green, and use a different palette for beginner, intermediate and advanced; then keep it compact: one bar with separated colors and counts on hover.

## Docs updated
- Business logic: none needed (counts and who sees them are unchanged)
- Database design: none needed
- Screen docs:
  - docs/screens/product/modules/queue/players-roster.md — Skill mix paragraph rewritten
  - docs/screens/product/modules/queue/public-session.md — Skill mix bullet describes the compact bar

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `skill-distribution-bar/` (no new component)
- Tokens go in `packages/config/theme.css`; no hardcoded colors
- Extends `slot-meter/` with skill segments; reuses the segment math and tooltip from `skill-distribution-bar/` (import, do not copy)
- Shares work with: `2026-11-08-queue-phone-tabs-dropdown`, `2026-11-08-queue-roster-card-emphasis`, `2026-11-08-queue-roster-summary-one-box`, `2026-11-08-queue-roster-view-toggle-icons`

## Tickets
- Epic: #498 (Q13)
- #505 Q13.1 · Skill level tokens and the compact Skill mix bar
- #506 Q13.2 · Roster summary: slots and skill mix in one bar, pressable segments
- #536 Q13.6 · Roster summary bar drives the level tabs on Preparation and Session settings
