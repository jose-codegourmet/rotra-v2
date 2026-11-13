# Profile: Leaderboard ranking replaces eligibility once a player qualifies

Status: NEW
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › rankingCard, eligibility, ACT.seeOnBoard; `.rk-head`, `.rk-near`, `.lb-row.cur`, `.lb-row.flash`
Route: /player/players/<id>
Screen ID: P-ELIGIBILITY, P-PUBLIC-PROFILE / P-OWN-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-ranking-card (reuses leaderboard-row)
Supersedes: none
Superseded by: none

## What changed
- Before: every profile showed the Leaderboard eligibility card (count of standard matches, progress bar, Qualifies / Not yet).
- After: when the player qualifies (and isn't in reassessment) and has a position, the card is **Leaderboard ranking**: Qualifies chip, “Overall #N of M ranked players”, **See on leaderboard** (opens the leaderboard expanded to the player's row and flashes it), the five rows around the player (two above, two below, the player highlighted), and one line with the qualifying count. Otherwise the eligibility card shows as before.
- Unchanged: Shared rank card, leaderboard rules.

## Why
- Owner artifact comment, November 13, 2026: “instead of showing this, since the person is eligible show the ranking instead”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: qualifies (middle of board, top three, last place), not yet, reassessment; own and someone else's profile; private neighbours (masked rows).
- Copy: “Leaderboard ranking”, “Overall”, “of N ranked players”, “See on leaderboard”, “X of T standard matches in the last three months. Falling below T removes the leaderboard position, though the rank stays visible.”
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: leaderboard-row, chip.
- New: profile-ranking-card.

## Pass 2 (artifact comment, November 13, 2026, on the Shared rank card: “no need to put this here”)
- The profile no longer has a separate Shared rank card (rank label, chips, overall position, ladder, notes). Its essentials move into the head of the Leaderboard ranking card, and of the eligibility card for players who don't qualify: “Shared rank” label, the rank label (bold, 20 px; muted when not ranked) with its status chips, then **Share** (own profile, ranked) and **How this rank works** (opens the rank page, which keeps the ladder and the full explanation). The eligibility card also shows the rank status line (for example the reassessment note). The overall position now shows only in the ranking card.

## Pass 3 (artifact comment, November 13, 2026: “I just want the leaderboard ranking but just her information · I expect it to be compact”)
- The ranking card is compact and about this player only: no neighbouring rows and no See on leaderboard button. Left: “Shared rank”, the rank label and its chip. Right: a small box with “Overall”, “#N” (accent, 30 px mono) and “of M”, clickable to open the leaderboard at their row. Footer: “X of T standard matches · last three months” with Share (own) and How this rank works. About 210 px tall instead of about 470.
