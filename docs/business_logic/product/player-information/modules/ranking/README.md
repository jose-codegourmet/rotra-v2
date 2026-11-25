# Shared rank and overall leaderboard

**Last verified:** 2026-11-25 (four periods, club leaderboards, shared places, full names; [D-2026-11-25-04](../../../../../mvp/decisions/2026-11-25.md#d-2026-11-25-04)); 2026-11-18 (Player leaderboard rules).

**Status:** Engine decided November 11, 2026 ([D-2026-11-11-05](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-05), from the [ranking-by-wins proposal](../../../../../decisions/2026-11-11-ranking-by-wins/01-proposal.md)): rank comes from **wins, weighted by who you beat**. The constants (band edges, step sizes) and the worked examples are chosen in #247; do not pick them from this document alone.

## Visible skill ladder

Operators assign one of **nine levels** (decided October 26, 2026; the earlier I–V subdivisions are dropped):

| Group | Levels, low to high |
|---|---|
| Beginner | Beginner Low, Beginner Mid, Beginner High |
| Intermediate | Intermediate Low, Intermediate Mid, Intermediate High |
| Advanced | Advanced Low, Advanced Mid, Advanced High |

The nine are ordered; a difference between two levels is counted in whole levels (e.g. “2 levels below suggestion”). The nine levels are **bands on the hidden rating** (below): a player's shown level is read off their rating, nobody assigns it globally. The band edges are chosen in #247.

City/National/World competition categories are deferred. A player has a skill label and can place on the annual, quarterly, monthly and weekly leaderboards, ROTRA-wide and per club. Singles and doubles share one rank.

## Club assessment authority: the level for the night

The shared rank is a **hint**; the Queue Master sets each player's **level for the night** during roster preparation, and that level is what Generate matches pairs on. An Advanced player may be set as Beginner in a stronger club. Do not replace the club's judgment with a rule that forces global rank into local pairing.

- Reassess only during roster preparation.
- Levels lock during the session; late arrivals are assigned and locked when added.
- The level for the night is **local to that session**. It never feeds the shared rank, with one exception: a **new player's first night** seeds their starting rating (below). After that, assessments have **zero** influence on shared rank (owner decision, November 11, 2026, [D-2026-11-11-05](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-05)).
- A level saved for a roster player who is removed before the session starts is dropped ([D-2026-11-11-06](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-06)).

Superseded on November 11, 2026: the 70% assessments / 30% performance blend, "saving a roster assessment immediately influences shared rank", equal club weighting and "latest assessment per club within three months".

## Rating by wins, weighted by who you beat

Decided November 11, 2026 ([D-2026-11-11-05](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-05)). Every player has **one hidden number**, the rating. Clubs do not vote on it.

- Before a counted game, compare the two teams; a team's strength is the **average of its two players**. The gap says who is expected to win.
- After the game, each player moves up or down by a **step**: beat a stronger team → up a lot; beat a weaker team → up a little; lose to a stronger team → almost nothing; lose to a weaker team → down a lot.
- **Score does not change the step** in v1. A game with only a winner counts the same as a game with a score.
- **What counts:** only full participation in valid singles/doubles games from valid finished sessions. Fun games, games from a **not-ranked** session (Record games off; owner, November 20, 2026, [D-2026-11-20-02](../../../../../mvp/decisions/2026-11-20.md#d-2026-11-20-02); real mode reads skip them since #1080, the Player app's Not ranked list and note are still mockup only), invalid games or sessions, and both outgoing/incoming participants in a mid-game substitution are excluded, even when the Queue Master gave one of them the game for the session (owner decision, November 6, 2026).
- **New players are Provisional** until about 10 counted games, with a bigger step so the number settles fast. The starting rating is seeded from the Queue Master's **first level for the night**. The rank card says "Provisional". Players at any stage of skill-rank progress can place on the leaderboards.
- **Window and clock:** three months means **90 rolling days**; the day boundary is **Asia/Manila midnight**.
- **Admin settings** (replacing the 70/30 weights): normal step size, Provisional step size, Provisional game count, leaderboard game count, window length. Saving new settings **recomputes everyone** from the stored game facts; rank is a projection and the facts never change.
- **Constants** (band edges, step sizes) and the worked examples (a level-matched night, an upset, a padded win, a returning player, a Provisional newcomer, a substituted game, an invalid session) are chosen in #247.
- **Accepted risks:** clubs that never mix are islands until players travel; padding earns little because beating weak teams earns little; partner luck averages out over 10+ games.

Years/months of experience is optional context, not rating points.

## Inactivity

After 90 rolling days without a counted game:

- Keep the old rank visible as **Needs reassessment**.
- On return, the player is **Provisional** again for a few games, with the bigger step, so the rating catches up. The Queue Master still sets a level for the night as usual; it does not feed the rating.

Do not silently reset old visible ranks to Beginner. Without a daily job (jobs are parked for MVP, [D-2026-11-11-10](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-10)), the skill-rank reassessment state is computed when a page is read.

## What a player may share

A player can share, as a link, a QR code or a post/story image ([D-2026-11-09-08](../../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-08)): their **rank card** (level, Top annual place if present, ladder), their **result in a session** (position in the published Standings, games, W–L) and their **games in a session** (partner, opponents, score, W–L).

- **Published only.** Session results and games can be shared only after the Queue Master publishes the session's results. Until then there is nothing to share and the player sees “Results not shared yet by the club.”
- **Own results only.** A player shares their own profile's data; the shared link opens their profile (since November 13, 2026 share images carry no QR; only the Session and club invites keep one; [log](../../../../../mockup-changes/2026-11-13-share-images-no-grid-no-qr.md)), which follows the profile privacy setting ([D-2026-11-09-07](../../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-07)). Exception since November 25, 2026: **Share game** (one game) links to that game's public match page, `/matches/[matchId]` ([public match page](../../README.md#public-match-page)); its share icon still shows on the player's own games only.
- **Other players' names** on images are shown as a visitor would see them: Private and Always private players and guests masked, public registered players in full.
- **Share profile** ([D-2026-11-11-11](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11), #738). Separate from the three cards above and not tied to a published session: the player's own **profile card** with the picture, name and nickname, level (or **Not ranked yet**), the Top annual place when the player is in that list, and **In YEAR** with the number of **wins** counted this calendar year, reset on January 1 (or **No games yet this year**; [D-2026-11-13-03](../../../../../mvp/decisions/2026-11-13.md#d-2026-11-13-03), was Last 90 days). Games played, losses and win rate are not on the card. The screen shows the profile link with a copy icon. Its wins count the calendar year; the rank keeps its own 90-day window. Always available on the own profile, even with no photo, level or games.

## Overall leaderboard

**Top annual**, **Top quarterly**, **Top monthly** and **Top weekly** each show the top 50 players across clubs (the **ROTRA leaderboard**). The year begins on January 1, the quarter on January 1, April 1, July 1 or October 1 (Q1 January to March, Q2 April to June, Q3 July to September, Q4 October to December), the month on its first day and the week on Monday. All four start at 00:00 Asia/Manila. Approved November 16, clarified November 18, 2026 ([D-2026-11-16-05](../../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-05)); quarterly, club leaderboards, shared places, the podium and full names added November 25, 2026 ([D-2026-11-25-04](../../../../../mvp/decisions/2026-11-25.md#d-2026-11-25-04)).

- Count wins and losses from full participation in valid standard matches (singles or doubles) in valid finished sessions. A match with a confirmed winner counts even without a score or published standings. Exclude fun games, games from a not-ranked session (Record games off, [D-2026-11-20-02](../../../../../mvp/decisions/2026-11-20.md#d-2026-11-20-02): they stay in the player's history but never count toward the leaderboards' wins or the win rate), either side of a mid-game substitution for the affected slot, and invalid matches or sessions.
- A player enters the period's standings with their first qualifying match, including a loss. Sort by most wins, then higher win rate. Skill rating, rank state and recent 10-match progress only describe the skill rank.
- **Shared places** (D-2026-11-25-04): players with the same wins **and** the same win rate share a place. Places run without gaps (1, 1, 2), like the Queue session standings ([D-2026-11-18-05](../../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-05)). Inside a shared place, rows are ordered by the account nickname alphabetically (full name when there is none), then the stable ROTRA player identity; that order never changes the place. This replaces “win rate breaks a tie, then nickname” as a place decider.
- **Top 50 with shared places:** a list holds the first 50 players in that order, plus anyone who shares the 50th player's place. Proposed by the mockup; the owner has not confirmed it (D-2026-11-25-04, Open).
- **Full names and pictures** (D-2026-11-25-04): every leaderboard (ROTRA, club and session) shows each player's full name, nickname and picture to everyone, signed in or not, whatever their profile visibility (Public, Private or Always private). This overrides the masking rule for leaderboards only; profiles, member lists, search outside the leaderboard and share images keep [their rules](../../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-07). The leaderboard's name search finds every listed player. A row or podium place whose profile the viewer may not open still shows the name and picture but opens nothing.
- A single-club unclaimed player is public. When more than one club saves them, they leave all lists until they register. Private players keep their places.
- Compare each place with the same player's top-50 place in the previous calendar period (last year, last quarter, last month, last week). A player who was outside the top 50 or had no qualifying matches then shows **New**. Otherwise show the change in places, including no change.
- Use the original playing date when a session syncs late. Recompute the preceding period from those facts so its final standings and movement marks include the result.
- **Podium** (D-2026-11-25-04): the leaderboard always shows the podium of places 1, 2 and 3, also when fewer than three places exist (an empty place keeps its step) and when the list is empty (three empty steps above the empty message). Several players in one place are stacked on that step; selecting it opens a dialog listing everyone in that place (picture, full name, nickname, wins, win rate), and each row opens the profile as list rows do.
- A profile, Compare and share cards may show public top-50 places (a profile shows one box per list the player is in, up to four). Only the signed-in player's own position card can show their place below 50, their wins and the wins of the last player in the top 50. Mention a better win rate only when that player actually has the same wins and a better win rate.

### Club leaderboard

Decided November 25, 2026 ([D-2026-11-25-04](../../../../../mvp/decisions/2026-11-25.md#d-2026-11-25-04)). Each club has its own leaderboard with the same four periods, boundaries, counting rules, shared places, top 50, podium, movement marks and full names as the ROTRA leaderboard.

- It counts **only standard-match wins and losses in that club's own sessions**. Anyone who played in them can appear, members or not.
- It lives on the Player app's club page as a Leaderboard card (period tabs, podium, then the next 7 players) with **See all**, which opens the club's leaderboard page with the whole top 50.
- A club place is not a ROTRA place: profiles, Compare and share cards name ROTRA places only.

Mock and real-mode period reads share one standings function. The database reader uses finalized match facts, confirmed history links and active club saves. [Database design](../../../../../database_design/product/player-information/modules/ranking.md#period-leaderboards).

Session standings follow their own wins/losses/head-to-head/name order.

**Session awards** (Most Improved, Off Day) are separate from the rating: the prototype formula is approved **as is** for v1. **Generate matches** keeps the prototype's draft weights as the official v1 pairing rule (both decided November 11, 2026, [D-2026-11-11-05](../../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-05)).

See [rank update flow](flow/update-rank.md), [Queue results](../../../queue/modules/results/README.md), and [open decisions](../../../open-decisions.md).
