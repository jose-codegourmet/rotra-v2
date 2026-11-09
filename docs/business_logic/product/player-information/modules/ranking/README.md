# Shared rank and overall leaderboard

**Status:** Agreed business model; exact mathematical engine is not yet specified. Do not implement a numerical rating formula from this document alone.

## Visible skill ladder

Operators assign one of **nine levels** (decided October 26, 2026; the earlier I–V subdivisions are dropped):

| Group | Levels, low to high |
|---|---|
| Beginner | Beginner Low, Beginner Mid, Beginner High |
| Intermediate | Intermediate Low, Intermediate Mid, Intermediate High |
| Advanced | Advanced Low, Advanced Mid, Advanced High |

The nine are ordered; a difference between two levels is counted in whole levels (e.g. “2 levels below suggestion”). Label-to-number mapping for any rating engine and its thresholds are not chosen.

City/National/World competition categories are deferred. A player has a skill label and, when eligible, an overall ROTRA leaderboard position. Singles and doubles share one rank.

## Club assessment authority

Player Information rank is a suggested starting point; the operator chooses the local session level. An Advanced player may be assessed as Beginner in a stronger club. Do not replace the club's judgment with a rule that forces global rank into local pairing or ignores a lower local assessment.

- Reassess only during roster preparation.
- Saving a roster assessment immediately influences shared rank when synced.
- Levels lock during the session; late arrivals are assigned and locked when added.
- Each club contributes its **latest assessment within the last three months**.
- Each contributing club carries **equal weight**, regardless of attendance or match count there.
- Repeated sessions at the same club do not create extra assessment votes.

The saved shared rank is the output/suggestion, not an additional independent club assessment to repeatedly average back into itself.

## Assessment and performance blend

Initial business weighting:

- **70% club assessments**.
- **30% match performance**.

The platform owner can adjust the weighting in Admin. Both components use the preceding three months. The weighting is agreed; normalization between categorical assessments and numerical performance is not. Do not average raw wins with skill-label ordinals or claim a complete formula exists.

Performance considers wins/losses and the strength context of partners and opposition, using the club-assigned levels relevant to the session. Optional scores add evidence of match closeness; missing scores must not make a winner-only match invalid or automatically penalize a player.

Partner strength comes from the recorded lineup and assigned levels rather than an extra manual checkbox. Years/months of experience is optional context, not direct ranking points.

Only full participation in valid singles/doubles matches from valid finalized sessions is eligible for long-term performance. Fun matches, invalid matches/sessions, and both outgoing/incoming participants in a mid-game substitution are excluded from that performance contribution, even when the Queue Master gave one of them the game for the session (owner decision, November 6, 2026).

## Inactivity

After three months without playing:

- Keep the old rank visible as **Needs reassessment**.
- Remove the player from the overall leaderboard.
- On return, the operator assigns a fresh roster assessment.
- A newly completed session with that assessment is needed for return, together with the rolling match-count eligibility requirement below.

Do not silently reset old visible ranks to Beginner. Handling the numerical blend when no recent performance exists remains open.

## What a player may share

A player can share, as a link, a QR code or a post/story image ([D-2026-11-09-08](../../../../mvp/decisions.md#d-2026-11-09-08)): their **rank card** (level, overall position, ladder), their **result in a session** (position in the published Standings, games, W–L) and their **games in a session** (partner, opponents, score, W–L).

- **Published only.** Session results and games can be shared only after the Queue Master publishes the session's results. Until then there is nothing to share and the player sees “Results not shared yet by the club.”
- **Own results only.** A player shares their own profile's data; the image's QR opens their profile, which follows the profile privacy setting ([D-2026-11-09-07](../../../../mvp/decisions.md#d-2026-11-09-07)).
- **Other players' names** on images are shown as a visitor would see them: private players and guests masked, public registered players in full.

## Overall leaderboard

A newcomer can have a public profile and provisional rank before qualifying for a leaderboard position.

- Public, overall ROTRA only; no city/club filters in v1.
- Require **10 completed singles/doubles matches within the last three months**.
- The threshold is adjustable in Admin.
- Exclude fun games, invalid matches, and partial games from that count.
- Ten is a rolling requirement, not a lifetime milestone. Falling below it removes eligibility even if a profile/rank remains visible.
- The fresh-assessment rule does not waive the match-count requirement.
- Valid Session done updates performance/eligibility automatically; publishing club slides is irrelevant to this update.

Session standings use wins/losses/head-to-head/name; they are a different ranking from this global skill/performance leaderboard. Global numerical tie handling is still open.

See [rank update flow](flow/update-rank.md), [Queue results](../../../queue/modules/results/README.md), and [open decisions](../../../open-decisions.md).
