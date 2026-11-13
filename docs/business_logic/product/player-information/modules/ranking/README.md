# Shared rank and overall leaderboard

**Status:** Engine decided November 11, 2026 ([D-2026-11-11-05](../../../../../mvp/decisions.md#d-2026-11-11-05), from the [ranking-by-wins proposal](../../../../../decisions/2026-11-11-ranking-by-wins/01-proposal.md)): rank comes from **wins, weighted by who you beat**. The constants (band edges, step sizes) and the worked examples are chosen in #247; do not pick them from this document alone.

## Visible skill ladder

Operators assign one of **nine levels** (decided October 26, 2026; the earlier I–V subdivisions are dropped):

| Group | Levels, low to high |
|---|---|
| Beginner | Beginner Low, Beginner Mid, Beginner High |
| Intermediate | Intermediate Low, Intermediate Mid, Intermediate High |
| Advanced | Advanced Low, Advanced Mid, Advanced High |

The nine are ordered; a difference between two levels is counted in whole levels (e.g. “2 levels below suggestion”). The nine levels are **bands on the hidden rating** (below): a player's shown level is read off their rating, nobody assigns it globally. The band edges are chosen in #247.

City/National/World competition categories are deferred. A player has a skill label and, when eligible, an overall ROTRA leaderboard position. Singles and doubles share one rank.

## Club assessment authority: the level for the night

The shared rank is a **hint**; the Queue Master sets each player's **level for the night** during roster preparation, and that level is what Generate matches pairs on. An Advanced player may be set as Beginner in a stronger club. Do not replace the club's judgment with a rule that forces global rank into local pairing.

- Reassess only during roster preparation.
- Levels lock during the session; late arrivals are assigned and locked when added.
- The level for the night is **local to that session**. It never feeds the shared rank, with one exception: a **new player's first night** seeds their starting rating (below). After that, assessments have **zero** influence on shared rank (owner decision, November 11, 2026, [D-2026-11-11-05](../../../../../mvp/decisions.md#d-2026-11-11-05)).
- A level saved for a roster player who is removed before the session starts is dropped ([D-2026-11-11-06](../../../../../mvp/decisions.md#d-2026-11-11-06)).

Superseded on November 11, 2026: the 70% assessments / 30% performance blend, "saving a roster assessment immediately influences shared rank", equal club weighting and "latest assessment per club within three months".

## Rating by wins, weighted by who you beat

Decided November 11, 2026 ([D-2026-11-11-05](../../../../../mvp/decisions.md#d-2026-11-11-05)). Every player has **one hidden number**, the rating. Clubs do not vote on it.

- Before a counted game, compare the two teams; a team's strength is the **average of its two players**. The gap says who is expected to win.
- After the game, each player moves up or down by a **step**: beat a stronger team → up a lot; beat a weaker team → up a little; lose to a stronger team → almost nothing; lose to a weaker team → down a lot.
- **Score does not change the step** in v1. A game with only a winner counts the same as a game with a score.
- **What counts:** only full participation in valid singles/doubles games from valid finished sessions. Fun games, invalid games or sessions, and both outgoing/incoming participants in a mid-game substitution are excluded, even when the Queue Master gave one of them the game for the session (owner decision, November 6, 2026).
- **New players are Provisional** until about 10 counted games, with a bigger step so the number settles fast. The starting rating is seeded from the Queue Master's **first level for the night**. The rank card says "Provisional"; no leaderboard position yet.
- **Window and clock:** three months means **90 rolling days**; the day boundary is **Asia/Manila midnight**.
- **Admin settings** (replacing the 70/30 weights): normal step size, Provisional step size, Provisional game count, leaderboard game count, window length. Saving new settings **recomputes everyone** from the stored game facts; rank is a projection and the facts never change.
- **Constants** (band edges, step sizes) and the worked examples (a level-matched night, an upset, a padded win, a returning player, a Provisional newcomer, a substituted game, an invalid session) are chosen in #247.
- **Accepted risks:** clubs that never mix are islands until players travel; padding earns little because beating weak teams earns little; partner luck averages out over 10+ games.

Years/months of experience is optional context, not rating points.

## Inactivity

After 90 rolling days without a counted game:

- Keep the old rank visible as **Needs reassessment**.
- Remove the player from the overall leaderboard.
- On return, the player is **Provisional** again for a few games, with the bigger step, so the rating catches up. The Queue Master still sets a level for the night as usual; it does not feed the rating.
- The rolling game-count requirement below still applies to the leaderboard.

Do not silently reset old visible ranks to Beginner. Without a daily job (jobs are parked for MVP, [D-2026-11-11-10](../../../../../mvp/decisions.md#d-2026-11-11-10)), "Needs reassessment" and leaderboard eligibility are computed when a page is read.

## What a player may share

A player can share, as a link, a QR code or a post/story image ([D-2026-11-09-08](../../../../../mvp/decisions.md#d-2026-11-09-08)): their **rank card** (level, overall position, ladder), their **result in a session** (position in the published Standings, games, W–L) and their **games in a session** (partner, opponents, score, W–L).

- **Published only.** Session results and games can be shared only after the Queue Master publishes the session's results. Until then there is nothing to share and the player sees “Results not shared yet by the club.”
- **Own results only.** A player shares their own profile's data; the shared link opens their profile (since November 13, 2026 share images carry no QR; only the Session and club invites keep one; [log](../../../../../mockup-changes/2026-11-13-share-images-no-grid-no-qr.md)), which follows the profile privacy setting ([D-2026-11-09-07](../../../../../mvp/decisions.md#d-2026-11-09-07)).
- **Other players' names** on images are shown as a visitor would see them: Private and Always private players and guests masked, public registered players in full.
- **Share profile** ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11), #738). Separate from the three cards above and not tied to a published session: the player's own **profile card** with the picture, name and nickname, level (or **Not ranked yet**), overall leaderboard position whenever the player has one, and **In YEAR** with the number of **wins** counted this calendar year, reset on January 1 (or **No games yet this year**; [D-2026-11-13-03](../../../../../mvp/decisions.md#d-2026-11-13-03), was Last 90 days). Games played, losses and win rate are not on the card. The image carries a QR to the public profile and the screen shows the profile link with a **Copy** button. Its wins count the calendar year; the rank keeps its own 90-day window. Always available on the own profile, even with no photo, level or games.

## Overall leaderboard

A newcomer can have a public profile and provisional rank before qualifying for a leaderboard position.

- Public, overall ROTRA only; no city/club filters in v1.
- Require **10 counted singles/doubles games within the last 90 days**.
- The threshold is adjustable in Admin.
- Ordered by rating. **Ties:** more counted games in the window first, then name (decided November 11, 2026).
- Private players keep their position with a masked name ([D-2026-11-09-07](../../../../../mvp/decisions.md#d-2026-11-09-07)); an Always private player's name is masked for everyone but themselves, and their picture stays visible ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11)).
- Exclude fun games, invalid matches, and partial games from that count.
- Ten is a rolling requirement, not a lifetime milestone. Falling below it removes eligibility even if a profile/rank remains visible.
- The fresh-assessment rule does not waive the match-count requirement.
- Valid Session done updates performance/eligibility automatically; publishing club slides is irrelevant to this update.

Session standings use wins/losses/head-to-head/name; they are a different ranking from this global rating leaderboard.

**Session awards** (Most Improved, Off Day) are separate from the rating: the prototype formula is approved **as is** for v1. **Generate matches** keeps the prototype's draft weights as the official v1 pairing rule (both decided November 11, 2026, [D-2026-11-11-05](../../../../../mvp/decisions.md#d-2026-11-11-05)).

See [rank update flow](flow/update-rank.md), [Queue results](../../../queue/modules/results/README.md), and [open decisions](../../../open-decisions.md).
