# Playing match: Replace player (fix a mistake) next to Substitute

Status: IN MOCK APP — #832
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › SHEETS.match (footer), SHEETS.replace (playing copy), ACT.confirmReplace
Route: /queue/sessions/<id> (console › a Playing match)
Screen ID: Q-MATCH (Playing), Q-SUBSTITUTE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: match-sheet actions, replace-player sheet
Supersedes: “a change during play goes through Substitute only”
Superseded by: none

## What changed
- Before: a Playing match offered Mark invalid, Substitute player and Match done; Replace player existed only before Start (On court).
- After: a Playing match also has **Replace player**. It reuses the replace picker with a notice explaining it fixes a mistake: the replacement is recorded as having played the whole game, the player taken out gets nothing, no substitution is recorded and no game-credit choice is asked. Tooltips tell the two apart (“Fix a mistake: the wrong player was put in” / “A player has to leave mid-game”). Back returns to the match; the sync log says “replaced (mistake fixed)”.
- Unchanged: Substitute player and its credit choice; Replace before Start.

## Why
- Owner artifact comment, November 13, 2026: “there should be a replace player · replace is when a QM makes mistake · substitute is when a player really needs a sub”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: playing singles and doubles, no free player to bring in, the sheet reopened after the match changed (stale check).
- Copy: “Replace player”, the notice text, tooltips.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: replace-player sheet; adds the playing-state notice.
- Results: a replaced player's game counts for the replacement only (business doc updated).

## Pass 2 (artifact comment, November 13, 2026: “clicking on player opens a dialog ‘sub’ or ‘replace’, then another dialog for picking what player”)
- In a Playing match the faces are the way in: tapping a player opens “Change NAME?” with **Substitute** and **Replace** as two choice cards (each with a one-line explanation), a View profile link and Back to match. The choice opens the Substitute or Replace picker with that player already selected as coming out. The separate Replace player / Substitute player footer buttons are gone; the footer keeps Mark invalid and Match done, and a hint under the teams says “Tap a player to substitute or replace them.”

## Pass 3 (artifact comment, November 13, 2026: “make the words big with icons, the info texts don't matter that much”)
- The two choices are big square buttons side by side: an accent icon (swap arrows for Substitute, a circular arrow with a check for Replace), the word in 22 px bold, and a short muted line (“Has to leave” / “Fix a mistake”). The longer explanations moved to the accessible names; the Replace picker keeps its “Replace fixes a mistake” notice.

## Pass 4 (artifact comment, November 13, 2026: a big dialog — who's coming out, suggested, all with search and pagination)
- Replace and Substitute (and Replace before Start) are wide dialogs in three sections of compact player tiles (face, first name, “games/minimum · rest Nm”, or the team for the match's players): **Who's coming out?** / **Who's coming off?** (the match's players), **Suggested** (the eight free present players with the fewest games, longest rest first on ties), and **All players** with a search box and pages of 24 (free players first, then away and busy players greyed out with “Away” / “Playing” / “On court”). The substitution's “Who gets this game?” choice and review step stay below.

## Pass 5 (artifact comment, November 13, 2026: “who's coming out, suggested, who gets this game and actions on the left, all players on the right; make the dialog like 75% of the screen”)
- The picker dialog is about 75% of the screen wide and split in two columns: left — Who's coming out/off (4 per row), Suggested (4 per row, two rows), then the Replace notice or the substitution's “Who gets this game?” (first names), then the actions (Back and Replace player / Review substitution) as the last row; right, behind a divider — All players with the search and pages. No footer bar. Under 900 px the columns stack (All players under the actions).

## Pass 6 (artifact comment, November 13, 2026: “make this side a different background and make sure the distinction is obvious”)
- The All players column is its own panel: page background (darker than the dialog), a strong border, rounded corners and 14 px padding, with the player tiles on the dialog's surface colour so they stand out on it. The divider line is gone.

## Pass 7 (artifact comment, November 13, 2026: “there should be filter by skill level, wait time and least games”)
- All players has two controls under the search: a skill-level filter (All levels · Beginner · Intermediate · Advanced, each with its band dot; players with no level show only under All levels) and a sort (Longest wait — default · Fewest games · Name). Free players still come first; changing either goes back to page 1.

## Pass 8 (artifact comment, November 13, 2026: “this serves as back”)
- In the Replace and Substitute pickers the header × (accessible name “Back to match N”) and a tap on the backdrop return to the match instead of closing everything, so the Back button is gone; the left column ends with the one primary action (Replace player / Review substitution).

## Pass 9 (artifact comment, November 13, 2026: “please occupy the whole right side of the dialog”)
- The All players panel now runs edge to edge: from under the title to the dialog's bottom and right edges (matching the dialog's rounded corner), full height whatever the left column's length, with a divider on its left instead of its own rounded border. Under 900 px it spans the full width at the bottom.

## Pass 10 (artifact comment, November 13, 2026: “tapping this twice means changing asc or desc”)
- Tapping the selected sort again reverses it; the label and an accent arrow show the direction: Longest wait ↓ ⇄ Shortest wait ↑, Fewest games ↑ ⇄ Most games ↓, Name A–Z ↓ ⇄ Name Z–A ↑. Picking another sort starts in its default direction; any change goes back to page 1. Tooltip on the selected sort: “Tap again to reverse”.

## Pass 11 (artifact comment, November 13, 2026, on the search: “this should be full row experience”)
- The search is a full-width row of its own under “All players” (44 px tall, placeholder “Search players by name”), with the level filter and sort below it.

## Pass 12 (artifact comment, November 13, 2026: “the title should live here, in the same box as who's coming off”)
- No header bar: the title (“Substitute in match N” / “Replace a player in match N”, 20 px bold) is the first line of the left column above Who's coming off. The heading stays for screen readers; the × floats in the top-right corner over the All players panel, which now runs the full height from the dialog's top edge to its bottom.

## Pass 13 (artifact comment, November 13, 2026: “suggested will have a button called Other; clicking it expands the dialog and shows All players, but on mobile it stacks another dialog”)
- The picker opens **compact** (about 620 px wide, one column): title, Who's coming out/off, Suggested, the notice or Who gets this game?, actions. Suggested shows seven free players plus a dashed **Other** tile (“+ Other · All players”).
- **900 px and wider:** Other widens the dialog to about 75% of the screen and shows All players on the right (Pass 9 panel); the tile becomes **Hide** (“− Hide”) and collapses it again.
- **Under 900 px:** Other opens **All players** as a second dialog stacked over the picker (bottom sheet, own title and ×, same search, filters, sort and pages). Tapping a player there picks them and closes it; × or the backdrop closes it without picking.
- A player picked from All players takes the first Suggested slot so the compact view always shows the choice.
- Also fixed in passing: the live session's header buttons (Match requests, Courts and time, Payments) wrap on phones instead of widening the page to 484 px.
