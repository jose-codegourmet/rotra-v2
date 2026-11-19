# Queue app: a club nickname the Queue Master sets for a registered player, shown on Queue Master screens only

Status: TICKETED — #900
Date: 2026-11-18
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheets `profile`, `clubNick` (new); Saved players card; `short()`, `acctShort()`, `clubNickOf()`; Saved players, Add player and Main Queue search; seed player Miguel Santos
Route: /queue/players (Saved players, a registered player's profile, Club nickname); /queue/sessions/s-tonight (console); /queue/sessions/s-tonight/preparation?tab=roster
Screen ID: Q-SAVED-PLAYERS, Q-ROSTER, Q-CONSOLE
Artifact: none
Components: player-profile-sheet, saved-player-card, club-nickname-form (new)
Supersedes: none
Superseded by: none

## What changed
- A registered player's profile dialog (opened from Saved players) gets a **Club nickname** button and a
  **Club nickname** row under **In your club** ("“Kuya Migs” · only your club sees it", or "None").
  Before, a club could set nothing on a registered player.
- **Club nickname** sheet: one optional field. Save returns to the profile dialog. Saving it empty removes
  the club nickname.
- The club nickname is kept by the club and used in every session of that club until it is changed.
- **Queue Master screens show it** in place of the player's own nickname: court tiles, Main Queue and Auto
  Queue tiles, pickers, bagging pairs, toasts and the Saved players card (marked "· club nickname").
- **Everything players see keeps the account nickname:** the public session page, the signed-in player's
  own bar and match request, Match history and the results of a finished session (including the replayed
  courts), leaderboards, awards and share images.
- Search by name or nickname (Saved players, Add player, Main Queue search, the swap and match pickers)
  also matches the club nickname.
- Guests and unclaimed players are unchanged: they have no account, so the one nickname in **Edit details**
  is already the club's.
- Prototype: Miguel Santos (account nickname "Migs") has the club nickname "Kuya Migs". Reset the demo data
  to see it on an older saved prototype.

## Why
- Owner, November 18, 2026: "in a session they can have their own nickname set by the QM but in the
  leaderboards and results it will pickup their Account Nicknames". Asked how long it lasts: "Club nickname
  .. I like it" (kept by the club, not per session). Asked where it shows: Queue Master screens only.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: registered player with no club nickname (row "None"); with one (profile row, Saved players card,
  console tiles); the sheet empty, filled, and saved empty; a registered player with no account nickname
  (the hint names "the name on their ROTRA account"); guest and unclaimed profiles (no button, no row).
- Copy:
  - Button: "Club nickname"
  - Profile row: "Club nickname" → "“NICK” · only your club sees it" or "None"
  - Sheet title: "Club nickname for NAME"
  - Sheet text: "What your club calls FIRSTNAME. Only you see it: on the console, the roster and Saved players."
  - Field: "Club nickname (optional)"
  - Hint: "The session page, results and leaderboards show the nickname on their ROTRA account, “NICK”. Leave this empty to use that here too." (without an account nickname: "…show the name on their ROTRA account. Leave this empty to use that here too.")
  - Buttons: "Cancel", "Save nickname"
  - Toasts: "Club nickname saved · NAME", "Club nickname removed · NAME", "No club nickname · NAME"
  - Saved players card: "“NICK” · club nickname"
- Tokens: none
- Known differences: none

## Reuse plan
- Extends: player-profile-sheet — a Club nickname row and button for registered players
- Extends: saved-player-card — the club nickname line with its "· club nickname" mark
- New: club-nickname-form — one optional text field with a hint; no existing form has just this field
- Shares work with: 2026-11-16-queue-unclaimed-email-lookup.md (player-profile-sheet, saved-player-card)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — club nickname rule; where each nickname shows
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — the club's `nickname` on a linked row is the club nickname
- Screen docs: docs/screens/product/modules/queue/players-roster.md — Club nickname button, row and sheet
- Also: docs/product-terms.md (Club nickname), docs/mvp/decisions/README.md (D-2026-11-18-03)

## Real app work
- `@rotra/ui`: the form, the profile sheet row and button, the saved-player card line.
- `@rotra/data` and `apps/queue`: a club nickname on a registered saved player; Queue Master screens name
  the player by it; search matches it; player-facing pages, results and leaderboards do not read it.
- Real mode: store and read it with the club's saved-player record.
