# Flow: complete or invalidate a match

Only a **Playing** match (started with Start match) can be completed or marked invalid. An On court match that never started can be sent back to the queue; one still On court at Session done is dropped like a waiting match.

## Valid completion

1. The Playing match remains assigned to its court(s).
2. The operator enters both final scores or selects the winner directly.
3. Show a confirmation of the winning team and any scores. Do not finalize before confirmation.
4. On confirmation, lock the result permanently and free court(s).
5. Count eligible full-player participation locally, applying standard/fun and substitution rules. A partial player the operator gave the game to counts for the session only (game, minimum, win/loss), never for long-term performance. The game-credit choice locks now.
6. If offline, save for later sync. Long-term session-performance contribution waits for valid Session done.

## Invalid completion

1. The operator selects Mark invalid for a match that cannot finish.
2. Confirm the permanent decision in a dialog.
3. Mark invalid and free court(s).
4. Add no game, win, loss, performance, or minimum credit, for anyone, including a partial player who was given the game. The game-credit choice locks now.

Neither path permits later result editing, including by Admin. Interruption reconciliation must establish which records are authoritative without introducing a normal score-editing feature.
