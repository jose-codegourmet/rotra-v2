# Ranking by wins: proposal

Date: 2026-11-11 (Asia/Manila). **Status: DECIDED, November 11, 2026 — all recommended options approved by the owner; recorded as [D-2026-11-11-05](../../mvp/decisions.md#d-2026-11-11-05).** Constants and worked examples follow in #247. Written for the product owner after a
discussion on November 11, 2026. It is recorded in [mvp/decisions.md](../../mvp/decisions.md) and the ranking business module. It does not
authorize database work or code by itself; #247 carries the constants and worked examples.

Ticket: #247 (F07.6, ranking math). Replaces the "70% club assessments / 30% match performance" idea
if approved.

## The problem, in plain words

- Club assessments are biased. Every club rates players differently, and a strong club calls an Advanced
  player a Beginner.
- The owner wants rank to come from **wins**.
- But raw win counts don't work either. In Fair / level-matched queues everyone drifts to about 50% wins.
  Beating Beginners 6 out of 10 looks the same as beating Advanced players 6 out of 10.
- So "based on wins" has to mean: **wins, counting who you beat**. That is a rating system.

## The idea, dumbed down

- Every player has **one hidden number**. Call it the rating.
- Before a game, compare the two teams. A team's strength is the **average of its two players**.
- The gap between the teams tells us who is **expected** to win and by how much.
- After the game, each player moves **up or down** by a step:
  - Beat a stronger team: move up a lot.
  - Beat a weaker team: move up a tiny bit.
  - Lose to a stronger team: lose almost nothing.
  - Lose to a weaker team: lose a lot.
- Over time the number settles where your results put you. Clubs don't vote on it.

## What counts

- Only **valid, full** singles and doubles games in a **valid, finished** session (already decided).
- Fun games: no. Invalid games or sessions: no. Both players in a mid-game substitution: no, even if the
  Queue Master gave one of them the game for the night (already decided, November 6, 2026).
- Scores are optional. A game with only a winner counts the same as a game with a score (already
  decided). Whether a close score softens the step is **open**; proposal: it doesn't, for v1.

## The nine levels stay, but they change meaning

- The nine levels (Beginner Low … Advanced High) become **bands** on the hidden number.
- Your shown level is **read off your rating**. No one assigns it to you globally.
- The Queue Master still sets a **level for the night** so Generate matches can pair people. That level
  is **local to that session only** and never feeds the shared rank.
- The Queue Master sees the shared rank as a **hint** when setting the level for the night.

## New players

- A new player is **Provisional** until about **10 counted games**.
- While Provisional the step is **bigger**, so the number settles fast.
- The rank card says "Provisional". No leaderboard position yet.
- Where the number starts is the **open question for the owner**:
  - **Option A, seed from the first night:** the Queue Master's first level for the night sets the
    starting number. After that, assessments never touch the rank again. Settles faster. Recommended.
  - **Option B, neutral start:** everyone starts in the middle. Zero bias, but a strong newcomer wins
    everything for a few nights before the number catches up.

## Leaderboard

- Overall ROTRA only, no club or city filters (already decided).
- You need **10 counted games in the last 3 months** (already decided; Admin can change the number).
- Ordered by rating. Ties: more counted games in the window first, then name.
- Private players keep their position with a masked name (already decided, November 9, 2026).

## Inactivity

- No counted games for **3 months**: rank stays visible, marked **Needs reassessment**, and you leave the
  leaderboard (already decided).
- On return you are **Provisional** again for a few games, with the bigger step, so the number catches up.
- Nobody is silently reset to Beginner (already decided).

## Admin settings

- The 70 / 30 weight controls go away.
- Replaced by: the normal step size, the Provisional step size, the Provisional game count, the
  leaderboard game count, and the window length.
- Saving new settings **recomputes everyone from the stored game facts**. Rank is a projection; the facts
  never change. No "old world / new world" split.

## Window and clock

- 3 months means **90 rolling days**.
- Day boundary is **Asia/Manila midnight**, the same clock already used for display.

## Honest risks

- **Clubs are islands.** If nobody plays in two clubs, their numbers can't be compared. It fixes itself as
  players travel. Accept for v1.
- **Padding.** A club could feed someone easy wins. Beating weak teams earns almost nothing, so the gain is
  small. Report a problem plus Admin marking sessions invalid covers the rest (accepted risk, November 9,
  2026).
- **Partner luck.** A bad partner costs you in one game. Over 10+ games it averages out. Team average
  handles the expectation side.
- **Small numbers.** Ten games a month is not much. The Provisional phase and the bigger step are what
  make it usable.

## What this overturns in the docs if approved

- Ranking module: 70 / 30 blend, "saving a roster assessment immediately influences shared rank", equal
  club weighting, "latest assessment per club within 3 months".
- Admin configuration screen (A-RANK-CONFIG): the two weight fields and their validation.
- Admin prototype: the same two fields.
- Database design, ranking module: the assessment-vote model and `RankingPolicyVersion` fields.
- Open-decision registers: normalization, label mapping, no-show assessments and sparse data close;
  score influence stays open.

## Session awards (separate)

- Most Improved and Off Day are not part of this. Their prototype formula is still a reference only.
- Decide separately: approve it for v1 as is, or hide awards until a formula is approved.

## Decisions needed from the owner

1. Approve "rank comes from wins counting who you beat" as the engine, replacing 70 / 30.
2. Option A (seed from first night) or Option B (neutral start).
3. Confirm assessments have **zero** influence after the start (recommended), or keep a small prior.
4. Confirm 90 rolling days, Asia/Manila midnight, recompute on settings change.
5. Confirm the score does **not** change the step in v1.

## Next step after approval

- Record the decision in `mvp/decisions.md` and update the docs listed above in one PR.
- Write worked examples for #247: a level-matched night, an upset, a padded win, a returning player, a
  Provisional newcomer, a substituted game, an invalid session.
- Pick the actual constants (band edges, step sizes) in that same ticket, with the examples.
