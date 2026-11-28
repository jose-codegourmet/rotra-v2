# Player app: Win chance on finished games, with a breakdown dialog

Status: IN MOCK APP — PR #1175
Date: 2026-11-27
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `wcGame`, `wcPlayer`, `gameRow` (pills), `viewMatch` (team chips), `SHEETS_WINCHANCE`
Route: /player/matches/<matchId>; profile › Recent games; Games (match history); Sessions › session matches dialog
Screen ID: P-MATCH-PAGE, P-MATCH-HISTORY, P-WIN-CHANCE (new)
Artifact: none
Components: win-chance-chip, game-court (the game row court), match-page team cards, a new win chance dialog
Decision: [D-2026-11-27-03](../mvp/decisions/2026-11-27.md#d-2026-11-27-03)
Supersedes: none
Superseded by: none

## What changed
- Every finished game court the Player app draws (Games list, Recent games and match history on own and other profiles, the session matches dialog, the match page court) gets a second corner pill after the format pill, "41% · 59%", left pair first, plus an **Upset** pill (warn colour) when the Favored pair (65% or more) lost. No pill on a game with no two sides or one that is not counted as a result (partial).
- Match page: the win chance pill is a button, and the right panel's Won / Lost team cards each get the pair's own percent as a small chip beside the header (accent tone at 65% or more). The pill and both chips open the new **Win chance** dialog (P-WIN-CHANCE). In lists the pill is display only; the court still opens the match page.
- The dialog shows both pairs side by side from 640 px (stacked below): the pair's short names, the percent large (accent plus a Favored chip at 65% or more), then per player the avatar, name, form rating and rows label, detail, signed value. Pill, chips and dialog rows come from one function (`wcGame`).
- Read from the lasting signals only: level, club win rate, best day, club leaderboard place and direction. A guest or a player with no record counts as level only. Same formula and sample numbers as the Queue mockup.

## Why
- Owner, November 27, 2026: "these places should have win rates · win rates should be clickable with exaplanation in a dialog · and sshould alsso see in player profile matches"; for the Player app, "Yes, full breakdown". Amends D-2026-11-27-02's Queue Master only rule.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Even, an edge, Favored, Upset; fun games (pill shown); partial games (no pill); a pair with a guest or no-record player (level only); masked names in the dialog follow the match page's privacy rules; hover and focus ring on the pill and chips on the match page.
- Copy: "41% · 59%" (the numbers vary), "Upset", "Win chance" (dialog title, Upset chip beside it), "Favored", "Form rating 4.5", "Level", "Club win rate", "Best day", "Club leaderboard", "Leaderboard direction", "Team average 4.6", "Plays best on this weekday", "Top quarter", "Bottom quarter", "Rising", "Falling", "No record · counts as 50%", "Close". Footer text: "Each pair's chance comes from the gap between the two team averages: one level apart is about 76%. Favored means 65% or more. An Upset is a match the Favored pair lost. A finished match is read from the lasting signals only: level, club win rate, best day and leaderboard." Accessible names: "Win chance 41% and 59%. Explain", "Win chance 67%, favored. Explain".
- Tokens: none (existing accent, warn and elevation tokens).
- Known differences: none. The mockup's club win rate, best day and leaderboard place are sample values made from the player id.

## Reuse plan
- Reuses as is: the dialog (sheet) shell, the chip, the game court.
- Extends: the game court (second and third corner pills; the pill becomes a button on the match page); the match page team card header (percent chip).
- New: the Win chance dialog.
- Shares work with: [2026-11-27-queue-win-chance.md](2026-11-27-queue-win-chance.md) (same formula, `win-chance-chip`).

## Docs updated
- Business logic: `docs/business_logic/product/player-information/README.md` — Win chance section.
- Database design: none needed (nothing stored; derived from finalized sessions).
- Screen docs: none yet; add P-WIN-CHANCE with the ticket.

## Real app work
- Real app follows in the same batch: Player app game courts, match page team chips, the Win chance dialog, reusing the `@rotra/data` win chance rules with the lasting signals.
- Never on the public session page, in results slides or in exports.
