# Queue app: the live Players card shows the level as a ring and the nickname in place of the level text

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console Players tab (`playersPane()`, `.pc3`)
Route: /queue/sessions/s-tonight?tab=roster
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: live player card (reuse the level ring used on public tiles and Add bagging pair)
Supersedes: none
Superseded by: none

## What changed
- **Level.** Before: a line of level text under the name (“Intermediate Mid”). After: no level text; the picture has a
  ring in the level band colour (Beginner, Intermediate, Advanced; grey with no level), the same ring the public tiles
  and Add bagging pair use. Hovering the picture names the level, and the card's screen-reader label still says it.
- **Nickname.** Under the name, in quotes: the club nickname, else the account nickname. No line when there is none.
- **Name.** Clamped at two lines with an ellipsis; hovering shows the full name. The nickname is one line with an ellipsis.

## Why
- Owner artifact comment, November 19, 2026, on a live Players card: the avatar ring already shows the skill level, so
  drop “Intermediate Mid” and use the nickname; names at most two lines, then clamped.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: each band's ring, no level (grey), with and without a nickname, a long name that clamps.

## Copy
- Nickname line: “NICKNAME” in curly quotes.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Player card)
