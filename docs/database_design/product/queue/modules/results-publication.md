# Finalized facts, awards, and publication

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Proposed data structures, not proposed new award formulas.

## Durable result facts

`player_match_facts` contains one finalized-session match/participant record:

| Field | Purpose |
|---|---|
| `match_id`, `session_player_id` | Composite unique identity of the fact |
| `finalization_id`, `session_id`, `club_id` | Provenance to valid finalization and source scope |
| `club_player_id`, `player_id_at_finalization` | Stable club identity; optional global player, supporting guests |
| `played_at`, `format`, `team`, `winning_team` | Frozen result context |
| `full_participation`, `standard_match` | Recomputed from source evidence, not accepted client flags |
| `skill_level_snapshot`, partner/opposition evidence | Session-assigned context for later reproducible math |
| `team_a_score`, `team_b_score` | Optional score pair |
| `fact_version` | Reducer version; not permission to change winner |

Only a valid session finalization can create official facts. Invalid matches produce none. Fun matches can produce club-local facts but are excluded from global performance/standard-match counts. Partial participation can be retained as source evidence, but both outgoing and incoming substitutes receive no game, win, loss, minimum-game or award credit anywhere (settled October 26, 2026).

Guest facts stay linked to the club player even without a profile. **Owner decision, October 28, 2026:** after identity confirmation, include earlier valid guest games in personal history and ranking under the existing eligibility/window rules. Preserve `player_id_at_finalization` as the historical snapshot rather than rewriting it. Implement an auditable, repeat-safe attribution/projection step using original played dates; its physical design and identity-confirmation evidence remain open. Linking does not duplicate facts, change a winner, or make fun/partial games eligible for global performance.

Index `(player_id_at_finalization, played_at DESC, match_id)` for player history, `(club_id, club_player_id, played_at DESC)` for club history, and source finalization/session for deduplication/rebuilds.

## Local summaries and awards

`club_session_player_summaries`: unique `(session_id, session_player_id)`; source finalization; club-player/global-link snapshot; full games, standard games, fun games, wins/losses; level snapshot; summary version. During a live session, use a distinctly provisional projection; do not let it enter global history before finalization.

`session_result_snapshots`: one immutable generated snapshot per session/version, containing standings, MVP evidence, improvement/off-day eligibility and output, calculation version, exact prior-session IDs/baseline window, and generated time. It is private by default. Versioning supports reviewed algorithm changes, not result correction.

Compute local standings from wins, losses, head-to-head when applicable, then name. Include total games. No global rank score replaces this ordering. List only players with at least one counted game; partial participants and invalid matches contribute nothing.

The live console leaderboard uses the same ordering over the provisional projection and adds win % (wins ÷ games). It is a read model only.

MVP needs at least two counted games. The nine-level [business reference formula](../../../../business_logic/product/queue/modules/results/README.md#reference-award-formula) uses a divisor of **2** in its level-index expected win chance; Most Improved uses +0.15 and Off Day −0.30 versus a baseline win rate. This corrects the stale divisor of 8; it does **not** approve production award math. Store the calculation version in the snapshot; final formulas and examples remain gated by [#247](https://github.com/jose-codegourmet/rotra-v2/issues/247).

Most Improved/Off Day need five **previous** qualifying sessions at that same club within three months, excluding the current session. Guests qualify via club-player history. Store actual baseline IDs; a count alone cannot explain an award. Exact award math and which attendance constitutes a qualifying prior session remain open.

## Optional public output

`session_publications`: unique session FK; opaque public page key; safe Details/Participants projection; nullable published result snapshot ID; `published_slides` (subset of standings/awards); explicit `include_off_day`; publication actor/time; publication state; expiry-cycle FK and last synced time. The public details page may exist before result publication.

The public Details projection includes the minimum games per player; Participants include name, permitted picture, and a "has a ROTRA profile" flag only — no level, presence, contact, or cost data.

Re-publication is allowed: each publish command replaces `published_slides` and **must supply `include_off_day` explicitly** (the UI always starts it unchecked); never carry it over from the previous row. Keep an append-only `session_publication_events` log (selection, Off Day choice, actor, time) so earlier consent is auditable. Full withdrawal is not specified.

`result_exports`: UUID PK; result-snapshot FK; requested slide selection; format (story/feed); explicit Off Day choice; club-name/logo snapshot; footer string `powered by rotra`; frame count (standings paginate at 14 rows per story frame, 10 per feed frame); private asset reference; creation/expiry/deletion metadata. Exports do not require publication.

Publication commands do not alter finalization or ranking facts. Public reads require both publication state and explicit Off Day inclusion; omit the private slide from data and downloadable assets otherwise. Avoid publicly readable object storage for unapproved result snapshots.

Deleting expired pages/export assets has no cascading path into source matches, finalizations, or player facts. A renewed license cancels the applicable expiry cycle before a retention worker can delete renewed pages.

Business source: [results and sharing](../../../../business_logic/product/queue/modules/results/README.md).
