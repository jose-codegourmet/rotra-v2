# Shared match queue and generation

**Surfaces:** `Q-QUEUE`, `Q-MANUAL`, `Q-PICK-PLAYER`, `Q-SUGGEST`, `Q-AUTO`, `Q-REGENERATE`.

**Source:** [queueing business rules](../../../../business_logic/product/queue/modules/queueing/README.md). **Reference:** [ROTRA Queue prototype](../../../../../app/mocksups-app/queue-app/rotra-queue.html).

## Q-QUEUE — One waiting list

Header “Queued matches” with **Add match**, **Suggest**, **Auto queue**, and **Regenerate** (primary when something needs attention; disabled when the queue is empty).

Attention notice: “N waiting matches need attention. Edit the lineup to swap the player, or regenerate.” Context: “One waiting list for every court. MODE mode guides suggestions; you can override any of it.”

**Layout:** cards in a grid of 1–5 columns depending on width. Order runs in a **snake**: left to right, then right to left on the next row, with small flow arrows between cards. Copy: “Drag a card by ⠿ to reorder (arrow keys work on the handle too). Drag a player onto someone on the other team to switch sides. Any card marked ready can start now, whatever its place.”

**Queue card:**

- Head: position “#P”, format chip, origin (**Auto**, **Suggested**, or a lock icon for Manual · protected), flow arrow, drag handle ⠿.
- Team A pictures and short names, “VS”, Team B. Tapping a picture opens the profile.
- Status line: **✓ Ready to start**; **⚠ reason** for needs attention (warning style, card highlighted); **ⓘ reason** for blocked or waiting for courts.
- Actions: **Start** (primary, enabled only when ready), **Edit**, Remove ×. No Earlier / Later buttons; reordering is on the drag handle.

Empty: “No waiting matches. Use Auto queue to generate a few, or add one yourself.”

**Switch sides by dragging (decided October 27, 2026).** A player's picture on a queue card, in Q-SUGGEST, in Q-MANUAL and in Q-DISPATCH can be dragged onto a player on the **other** team to swap the two. This works the same in all four places:
- **Mouse or pen:** the drag starts after a few pixels of movement, so a plain click still opens the profile (or, in Q-MANUAL, the slot picker).
- **Touch:** press and hold briefly to lift the player. A quick swipe still scrolls the page.
- **During the drag:** a copy of the card follows the pointer and the source dims. Only players on the other team are highlighted as targets (dashed accent outline). Dropping anywhere else, or on a teammate, changes nothing.
- **Keyboard:** with a player focused, ← or → swaps them with the player opposite (same position on the other team, or its last player when that team is smaller). Focus follows the moved player.
- **Results by place:**
  - On a queue card or in Q-DISPATCH, the waiting match changes and becomes protected (“Match N: Kat and Jo switched sides · protected from regeneration”).
  - In Q-SUGGEST, only the shown lineup changes (toast “Kat and Jo switched sides”). Adding it then puts it in protected.
  - In Q-MANUAL, the slots change until **Save lineup**. Dropping onto an empty slot on the other team moves the player there.
- **Not available:** active matches (Q-ACTIVE-MATCH, Q-INVALID-MATCH) have no dragging. Use Q-SUBSTITUTE.

| Card condition | Status line |
|---|---|
| Ready | Ready to start |
| Lineup incomplete | Needs attention: “Lineup is incomplete” |
| Player not present | Needs attention: “Kat and Jo are not present” |
| Player still playing | Blocked: “Migs is playing on Court 1” |
| No free court | “Waiting for a free court” / “Needs two free courts” |

Reordering works by pointer drag (mouse and touch) on the ⠿ handle, or from the keyboard: with the handle focused, ←/↑ move the match one place earlier and →/↓ one place later, keeping focus on the handle (label “Reorder match N: drag, or use the arrow keys”). Toasts: “Queue order changed”, “Match N moved to #P”. Removing: “Waiting match N removed” — no game is recorded.

Protected cards still show attention problems; protection only affects regeneration.

## Q-MANUAL — Add match / Edit lineup

Sheet titled **Add match** or **Edit lineup**.

- **Format** buttons: enabled standard formats, then 1v2 fun, 3v3 fun, 4v4 fun, 5v5 fun. Fun formats show “Counts toward session games and the minimum; excluded from long-term player performance.” and for 5v5 “5v5 occupies two courts.” Changing format trims extra slots.
- **Team A / Team B** slot columns, sized by format. Empty slot: **+ Choose player**. Filled slot: picture, name, “LEVEL · g/min” plus “· not present” or “· playing now”, **Change**, and clear ×.
- Copy: “Drag a player onto a slot on the other team to switch sides. A player who's playing now can go into a later match. That match can't start until they're free. Saving doesn't take a court.”
- Errors: “Fill every slot. Team sizes are fixed by the format.”; “Each player can only take one slot in a match.”
- Primary **Add to queue** / **Save lineup**. Saving an edit marks the match protected: “Lineup saved · protected from regeneration”. The console switches to the Queue tab.

## Q-PICK-PLAYER — Choose a slot's player

Sheet titled “Choose Team A · player N”.

- Search by name or nickname.
- Filter: **Available now** (default), **All present**, **Everyone**.
- Large player tiles: picture, name, level, “g/min games”, status (“Playing · Court X”, “Not present”, “Resting M min”). Players already in another slot are disabled with “Already in this match”.
- Sorted: off-court first, present first, fewest games, longest rest.
- Copy: “Fewest games first. A player who is playing now can go into a later match, but it can't start until they're free.” Footer **Back to lineup**.

## Q-SUGGEST — One suggested lineup

Sheet **Suggested match**: format chip and “MODE mode” chip, then **Team A** VS **Team B**, each player a clickable card with their picture (or initials), name, level, and games against the minimum (“0/7 games”, amber when below). Tapping a card opens that player's profile dialog, whose footer is **Back to suggestion**; it returns to the same lineup with focus on that player. Then a **Why this lineup** card:

- “Kat and Jo are below the minimum (Kat 2/6, Jo 3/6).” or “Everyone here has met the minimum; they have the fewest games among present players.”
- “Teams are split by assigned levels to suit MODE mode.”

Actions: **Skip suggestion** (shows a new one), **Edit then add** (opens Q-MANUAL; saving protects it), **Add to queue** (adds as Suggested, unprotected unless players were switched). Under the teams: “Drag a player onto someone on the other team to switch sides.” No win probabilities or fatigue scores.

When no lineup is possible, the sheet shows the reason (both formats off, or “Only N players are present. Doubles needs 4. Mark arrivals present in Players.”) with **Close**.

## Q-AUTO — Generate several waiting matches

Sheet **Auto queue**: Mode, Formats, Present “N players”, Priority “Players furthest below N games first”. **Matches to add**: 2, 3, 4, or 6 (3 preselected), with hint “Prototype control. ROTRA hasn't decided the default number of rounds.” Copy: “Only present players are used. Nothing starts by itself, and fun formats are never generated.”

Primary **Generate N matches**. On success the console shows the Queue tab: “N matches added to the queue”. On failure the reason appears in the sheet and the queue is unchanged.

## Q-REGENERATE — Review rebuild scope

Sheet **Regenerate waiting queue?** with counts:

- Automatic waiting matches — N rebuilt
- Healthy manual matches — N kept
- Manual matches needing attention — N rebuilt
- Games in play — N untouched

Actions **Keep current queue** and **Regenerate waiting queue** (disabled when nothing would be rebuilt). Rebuilt matches take the queue slots of the ones they replace. Toast: “Queue regenerated · N rebuilt”. If generation fails, the previous queue is restored and the reason is shown.

## Acceptance examples

- Turning off a participant flags their future lineups; Regenerate rebuilds even a manual flagged lineup.
- Editing an automatic lineup protects it on the next regeneration if healthy.
- Accepting a suggestion without editing leaves it unprotected.
- A blocked first match stays first; a later ready match can start on the free court.
- Regeneration cannot change an active 5v5 match on two courts.
- Singles does not appear in the editor when Singles is off.
