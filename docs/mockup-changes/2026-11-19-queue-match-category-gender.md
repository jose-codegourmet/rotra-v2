# Queue app: matches show a category (Men's, Women's, Mixed, Genderless), and guests and unclaimed players get an optional gender

Status: IN MOCK APP — #1061
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `matchCategory()`, `matchLabel()`, `genderField()`, Add player › New player, Edit details, profile dialog
Route: /queue/sessions/s-tonight (`?tab=queue`, `generate`, Courts), Saved players
Screen ID: Q-QUEUE, Q-AUTO, Q-CONSOLE, Q-ADD-PLAYER, D-PARTICIPANT-PROFILE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: match card format chip, draft tile, court sheets (reuse); a segmented gender control (reuse the segmented control)
Supersedes: none
Superseded by: none

## What changed
- **Match category.** Every match label puts its category in front of the format: “Mixed Doubles”, “Men's Doubles”,
  “Women's Singles”, “Genderless 3v3 fun”. On queue cards, draft tiles, Put on court, Getting ready, Suggested match,
  Next match and the match lines.
  - All men: Men's. All women: Women's. Both sides with the same mix of men and women: Mixed. Anything else, or any
    player whose gender isn't given: Genderless.
- **Gender (optional)** on Add player › New player and on Edit details (guests and unclaimed players): Male · Female ·
  Not given, with a hint on what it does.
- **Profile dialog:** a Gender row. A registered player without one reads “Not given yet · ROTRA reminds them to add it”.
- Sample data: most players have a gender; a few (Sam, Dani, Gab, Andi, Tin) don't, so some matches show Genderless.

## Why
- Owner, November 19, 2026, in the session: an account should say Male or Female, because MM vs MM is Men's Doubles,
  WW vs WW Women's Doubles, MW vs MW Mixed Doubles, and MM vs WW, MM vs MW, WW vs MW are Genderless Doubles. Optional
  for now, with a reminder; records without one count as Genderless; public; the same rule for every format.
  [D-2026-11-19-01](../mvp/decisions/2026-11-19.md#d-2026-11-19-01).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: one match of each category; a match with a player without a gender; the gender control in Add player and Edit
  details; the profile dialog for a registered player with and without a gender, a guest, an unclaimed player.

## Copy
- Categories: “Men's”, “Women's”, “Mixed”, “Genderless”, before the format label.
- “Gender (optional)”, “Male”, “Female”, “Not given”; hint “Sets the match category: Men's, Women's, Mixed or
  Genderless. Matches with a player whose gender isn't given count as Genderless.”
- Profile row: “Gender”, “Not given yet · ROTRA reminds them to add it”.

## Open
- See D-2026-11-19-01: stored or worked out, required later, Admin edits, use in generation and standings.

## Docs updated
- docs/business_logic/product/queue/modules/matches/README.md (Match category)
- docs/screens/product/modules/queue/match-queue.md, players-roster.md
- docs/database_design/product/queue/modules/sessions-roster.md (`club_players.gender`, proposed)
- docs/product-terms.md (Gender, Match category); docs/mvp/decisions/README.md (D-2026-11-19-01)
