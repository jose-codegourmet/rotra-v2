# Finished session page: Match history as courts

Status: IN MOCK APP — #842
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › pubHistoryMatch (uses courtSVG); `.gm*` styles
Route: /queue/s/<session> (finished, Details › Match history)
Screen ID: Q-PUBLIC-RESULTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: game-row court variant (shared with ROTRA Player)
Supersedes: the row layout in 2026-11-13-queue-finished-session-page.md (number/time, Team A, score, Team B)
Superseded by: none

## What changed
- Before: each match was a row: “#N” and time on the left, Team A, score, Team B, the winning side tinted with “Won”.
- After: each match is a small court, the same design as ROTRA Player's game rows: Queue court art (court green, white lines, dashed net), “#N · start–end” (· Fun) as a corner pill, faces with first names on dark pills (winners ringed in the accent), a dark box on the net with the score (or “No score”) and the result. For the viewer's matches their pair sits on the left (“You”) with **Won** / **Lost**; for other matches Team A is on the left and the box says “◀ Won” or “Won ▶”; an invalid match shows **Invalid** on a desaturated court. Faces open the profile card as before. Phones: smaller faces and score.
- Unchanged: Yours / All tabs, counts, publication rules.

## Why
- Owner, November 13, 2026: “with the latest updates I did for the matches in player profile, please apply it in Queue ‘Confirmed finished’ state”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: viewer's win and loss (left side either team), other players' match with each side winning, no score, invalid, Fun, singles.
- Copy: “No score”, “Won”, “Lost”, “◀ Won”, “Won ▶”, “Invalid”.
- Tokens: --court, --court-line, --accent.
- Known differences: none

## Reuse plan
- Reuses as is: Queue court art, pubFace, chips; the same component as ROTRA Player's game row (one shared component in @rotra/ui).

## Pass 2 (artifact comment, November 13, 2026: “can you add the feature like ‘how the night went’ in ALL, where there is a video player like control”)
- When the results are shared, the **All** tab starts with **How the night went**: the session record's replay card (every court at that moment, play/pause, a timeline slider, start and end times, “8:32 PM · 3 games on court · 12 finished so far”), with names and faces following the page's masking and “You” for the viewer. The match cards on court at the current moment get an accent glow. Fixed on the way: the replay crashed when a court was free (`notStarted` was undefined in replayCourts), which also affected the session record's How the night ran tab.

## Pass 3 (artifact comment, November 13, 2026: “as the player progresses the courts below show”)
- On the All tab the match list follows the replay: only matches that have started by the replay's time show (newest first, so the latest appear on top as it plays), the ones on court glow, and the big count shows how many are visible. The replay opens at the end of the night, so all matches show until someone presses play (which starts from the first match) or drags the timeline.
