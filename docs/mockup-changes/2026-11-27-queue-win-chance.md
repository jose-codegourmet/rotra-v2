# Queue match cards: Win chance per pair, Upset mark, Even game by win chance

Status: NEW
Date: 2026-11-27
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `wcChip`, `wcOf`, `wcRating`, `wcBase`, `wcUpset`; `draftTile`, `queueCard`, the Session tab and Courts tab court cards, `historyMatch`
Route: live console › Session, Courts, Main Queue, Generate matches; session record › matches
Screen ID: Queue live console (Session, Courts, Queue), session record
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: win-chance-chip (new), match-card, court-card, match-court, live-match-history, record-court-columns, auto-queue-workspace
Decision: [D-2026-11-27-02](../mvp/decisions/2026-11-27.md#d-2026-11-27-02)
Supersedes: none
Superseded by: none

## What changed
- Every Queue Master match card shows a small **Win chance** chip: drafts in Generate matches, Main Queue cards (full and compact), the court cards on the Session and Courts tabs, and finished matches in the session record and the player's games.
- Each pair carries its own percent (owner, November 27, 2026: "can you put the percentage per pair"); the two add up to 100. On draft and Main Queue tiles the chip sits beside each pair (under the names on compact tiles). On court cards and finished matches one chip reads "39% · 61%", left pair first. The stronger pair reads brighter; a pair at 65% or more (Favored) takes the accent colour. The tooltip gives both teams' numbers.
- A finished match where the Favored team lost gets an **Upset** pill beside the chip.
- Owner, November 27, 2026 ("these places should have win rates"): the per-pair chip also sits beside each team's "TEAM A" / "TEAM B" label, right-aligned, in three sheets: **Suggested match**, the **on-court / playing match** sheet (for example "Match 18 · Court 2 · Getting ready") and **Edit lineup**. It updates live as the lineup changes and is hidden while either team is empty.
- Owner, November 27, 2026 ("win rates should be clickable with explanation in a dialog"): every win chance chip and pill (per-pair chips, the court chip, the percent pill and the Upset pill in the session record, the sheet chips) is a button that opens the **D-WIN-CHANCE** dialog. It opens on top of an open sheet; Close, x, Escape and the scrim return to that sheet with its state intact.
- **D-WIN-CHANCE** "Win chance" (an "Upset" warn chip beside the title for a finished Upset): two team blocks side by side from 640 px, stacked below. Each block: the pair's short names, the percent large (accent at 65% or more, with a "Favored" chip), then per player the avatar, name and "Form rating 4.5", and rows of label, detail and signed value (2 decimals; Level shows the plain step): Level, Club win rate (a guest reads "No record · counts as 50%", 0), Best day, Club leaderboard, Leaderboard direction, Tonight, Upsets tonight, Games in a row, Handicap tonight (all but Level and Club win rate only when not zero), then "Team average 4.6". A finished match shows only Level, Club win rate, Best day, Club leaderboard and Leaderboard direction. The rows and the chip come from one function, so the numbers always match.
- Generate matches' **Even game** now splits teams by the form rating behind Win chance (`wcRating`), so the split is the closest to 50%.
- Owner, November 27, 2026 ("Yes, use win chance"): **Suggest** (one match, and its Reshuffle and Skip) splits teams by the same form rating. The sheet's note reads "Teams are split by win chance to suit MODE mode." Main Queue regeneration keeps the assigned level.

## Why
- Owner, November 27, 2026: "I want to introduct the feature called Odds in the Queue app · this will make it easier for the QMs to know what the odds will be per match", shown on "match cards . all match cards . small indicator", Queue Master only, with a better name than Odds. Proposed name: **Win chance**.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Even, an edge, Favored, Upset on a finished match; no chip on a free court or an invalid match.
- Copy: "N%" per pair, "N% · N%" on courts and finished matches, "Upset", "Win chance · NAMES N% · NAMES N%" (tooltip), "The favored team lost" (Upset tooltip).
- Copy, D-WIN-CHANCE: title "Win chance"; "Favored"; "Upset"; row labels "Level", "Club win rate", "Best day", "Club leaderboard", "Leaderboard direction", "Tonight", "Upsets tonight", "Games in a row", "Handicap tonight"; details "No record · counts as 50%", "Plays best on this weekday", "Top quarter" / "Bottom quarter", "Rising" / "Falling", "2 won · 1 lost", "1 upset win" / "1 upset loss", "2 before this match"; "Form rating 4.5"; "Team average 4.6"; button "Close". Footer, exactly: "Each pair's chance comes from the gap between the two team averages: one level apart is about 76%. Favored means 65% or more. An Upset is a match the Favored pair lost." and, for a finished match: "A finished match is read from the lasting signals only: level, club win rate, best day and leaderboard."
- Tokens: none (the existing chip, accent and warning tokens).
- Known differences: the mockup's club win rate, best day and leaderboard place are sample values made from the player id. A finished match is read from the lasting signals only.

## Reuse plan
- Extends: the chip. New: one win-chance chip component used by every match card.

## Docs updated
- Business logic: `docs/business_logic/product/queue/modules/queueing/README.md` — Win chance, Even game.
- Database design: none. Nothing is stored; the roster read derives each player's signals from the club's finalized sessions.
- Screen docs: none yet; add with the ticket.

## Real app work
- Built with the mockup change, on the owner's word ("please update mockup and real mode · mockup is real ssource of truth"): `@rotra/data` match/winChance.rules.ts, WinChanceChip, and the Queue console's Session, Courts, Main Queue, Generate matches and History views. Not compared in a browser yet.
- The completed session record (How the night ran) shows the pill, the Upset pill and the dialog too; only the Queue Master's record read carries it, the public reads do not.
- Left: leaderboard place and direction in real mode (rank calculation is not real).
- Never shown on the public page, in the Player app, in results or in exports.
