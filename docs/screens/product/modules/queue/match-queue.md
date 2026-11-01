# Shared match queue and generation

**Surfaces:** `Q-QUEUE`, `Q-MANUAL`, `Q-PICK-PLAYER`, `Q-SUGGEST`, `Q-AUTO`, `Q-REGENERATE`.

**Source:** [queueing business rules](../../../../business_logic/product/queue/modules/queueing/README.md). **Reference:** [ROTRA Queue prototype](../../../../../app/mocksups-app/queue-app/rotra-queue.html).

## Q-QUEUE — One waiting list

Header “Queued matches” with **Add match**, **Suggest**, **Auto Queue**, and **Regenerate** (primary when something needs attention; disabled when the queue is empty).

Attention notice: “N waiting matches need attention. Edit the lineup to swap the player, or regenerate.” Context: “One waiting list for every court. MODE mode guides suggestions; you can override any of it.”

**Layout:** cards in a grid of 1–5 columns depending on width. Order runs in a **snake**: left to right, then right to left on the next row, with small flow arrows between cards. Copy: “Drag a card by ⠿ to reorder (arrow keys work on the handle too). Drag a player onto someone on the other team to switch sides. Any card marked ready can start now, whatever its place.”

**Queue card:**

- Head: position “#P”, format chip, origin (**Auto**, **Suggested**, or a lock icon for Manual · protected), flow arrow, drag handle ⠿.
- Team A pictures and short names, “VS”, Team B. Tapping a picture opens the profile.
- Status line: **✓ Ready to start**; **⚠ reason** for needs attention (warning style, card highlighted); **ⓘ reason** for blocked or waiting for courts.
- Actions: **Start** (primary, enabled only when ready), **Edit**, Remove ×. No Earlier / Later buttons; reordering is on the drag handle.

Empty: “No waiting matches. Use Auto Queue to generate a few, or add one yourself.”

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

## Q-AUTO — Auto Queue workspace

**UI component:** `AutoQueueWorkspace` in `@rotra/ui/auto-queue-workspace`. Its props carry draft batches and selection order; the later mock-data and screen tickets own generation, transfer validation and persistence.

The Queue view switches between Main Queue and Auto Queue. Auto Queue has Available Players, Plan Ahead, Longest Wait, Fewest Games and Catch Up tabs with retained draft batches. The Queue Master selects a match count (2 / 3 / 4 / 6; no default), explicitly generates, and chooses a Catch Up target when applicable. Cards show reason, lineup, played/queued counts and playing dependencies. No draft starts or enters Main Queue automatically.

Checkbox selections persist across tabs in selection order. **Add selected to Main Queue** opens a review of that order; **Add all from this tab** uses only the current batch. **Regenerate**, **Clear**, **Clear unselected**, and **Regenerate unselected** affect drafts only; selected drafts survive the last action. Main Queue changes leave drafts visible with a stale notice. Revalidation before transfer blocks conflicts and retains the drafts for correction. Distinct rematches are allowed, but the same draft cannot be submitted twice. Counts update from the Main Queue immediately when a waiting match is removed or started; played changes only after eligible Match done.

## Q-REGENERATE — Main Queue rebuild

This separate existing control reviews automatic matches rebuilt, healthy manual matches kept, manual matches needing attention rebuilt and games in play untouched. The Queue Master confirms before changes; failure restores the previous queue. Draft regeneration never silently changes Main Queue.

The Queue mock app now uses `AutoQueueWorkspace` through the `AutoQueue` container. Draft batches and ordered selection live in the in-memory mock store and survive console-view switches. Generation and clearing do not write accepted matches or sync entries. Transfers are atomic: any invalid selection keeps all lineups and the review open; retry uses the same confirmation ID. A valid stale selection can be accepted after revalidation. Non-Plan-Ahead players who began playing need attention. Reload and Reset mock data discard draft state; no durable storage or API is implied.
