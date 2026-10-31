# Session results and sharing

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../../app/mocksups-app/queue-app/rotra-queue.html).

## Live leaderboard

During an active session the console has a **Leaderboard** view of tonight's standings. It updates each time a result is confirmed and uses the same order as the standings slide. It lists players with at least one counted game: rank, name and level, wins, losses, games against the minimum, and win %. The top three are highlighted, and the view's tab names the current leader.

Partial (substituted) games and invalid matches do not count. The live leaderboard is a working view for the operator, not official history; official results exist only after a valid Session done.

## Finalization versus publishing

Session done requires internet and complete, reconciled records. Phone-linked profiles and permanent RTR IDs are already matched/created as soon as their entries successfully sync; they do not wait for Session done (owner decision, October 28, 2026). A valid finalization automatically contributes eligible session performance to Player Information, whether or not the club publishes anything.

While finishing, the operator sees four stages: checking session records, finishing the session, updating player records, preparing result slides. The results view then opens.

Result slides are initially private to the Queue Master. Publishing is an optional club-culture action. An invalid session contributes no official player match history, games played, wins, losses, or performance, and has no leaderboard or result slides.

The results view shows three separate statuses: player records and ranks updated; club results private or published; Off Day private or shared. Results are read-only.

## Three-slide wrap-up

Every slide carries the club name and logo, the slide title, the session title and date, the venue, and the footer **“powered by rotra”**.

| Slide | Contents |
|---|---|
| 1 — Standings | Ordered standings: rank, player, wins, losses, games |
| 2 — Awards | MVP and Most Improved; either can be empty |
| 3 — Off Day | Eligible below-baseline performances; can be empty; private by default |

### Session standings

Order by:

1. Most wins.
2. Fewest losses.
3. Head-to-head between the two tied players: whoever won more of the matches where they were on opposite teams.
4. Alphabetical name order if head-to-head does not resolve the tie.

Only players with at least one counted game are listed; players who never completed a counted game are left out. Positions are unique (no shared ranks). Games do not provide an independent tiebreaker. Do not substitute opposition strength as a tiebreaker. Head-to-head is applied pairwise while sorting; exact handling of three-or-more-way ties remains open.

Guests participate in standings. Fun-game wins/losses count. Partial games count for neither substituted player, and invalid matches count for no one.

If no counted games were recorded, the slide says so instead of showing an empty table.

### MVP

MVP rewards performance relative to the player's assigned level, partners, and opponents, rather than simply the most wins. Newcomers and guests may qualify. Fun games count locally but not toward long-term performance. A player needs **at least two counted games** to be considered. If no one qualifies, the slide says there were not enough counted games.

### Most Improved and Off Day

- Require **five previous completed sessions at the same club within the preceding three months**.
- Compare tonight with that club-specific history; exclude the current session from the baseline.
- Returning guests can qualify from the club's saved history.
- A lack of qualifying history may leave these sections empty. Most Improved then reads "Not enough recent club-session history."
- Off Day is a session observation, not a permanent profile label. The private preview shows **Private · not included in sharing**.

The five-session award threshold is distinct from the overall leaderboard's ten-standard-match threshold. No Admin configurability for the five-session threshold has been agreed.

### Reference award formula

The prototype uses this formula and labels it "Prototype formula". The final award math is still [open](../../../open-decisions.md).

- Level is the index of the nine-level list (Beginner Low = 0 … Advanced High = 8).
- For each counted game, expected win chance = 1 ÷ (1 + 10^((opponents' average level − own team's average level) ÷ 2)). (Rescaled from ÷ 8 when the 36-step list became nine levels.)
- Performance score = sum over games of (1 if won, else 0) − expected chance. **MVP** is the highest score.
- For players with five or more prior club sessions and a baseline win rate: tonight's win rate − baseline. **Most Improved** is the largest rise of at least +0.15. **Off Day** lists everyone with a drop of 0.30 or more.

## Publishing

The operator chooses when to publish, online only. The publish review states the audience — **anyone with the session link** — and offers:

- **Standings** and **Awards**, both selected by default the first time, or the previously published selection when updating.
- **Include Off Day**, always **off** each time the review opens, even if Off Day was shared before. It names who would appear.

Publishing needs at least one selection. The operator can publish again later to change the selection (**Update publication**). Withdrawing a publication entirely is not specified.

Published slides appear on the public session page below Details and Participants. Before publication the page says "Results for this session have not been shared."

Publishing does not delay profile, performance, or global leaderboard updates after valid finalization. Public session-page lifetime follows [license retention rules](../../../admin/modules/clubs-licenses/README.md).

## Image downloads

- Two formats: **Story** (tall) and **Feed post** (4:5).
- Choose Standings, Awards, and Include Off Day (off by default for every download).
- Long standings continue onto extra images so every name stays readable: **14 rows per Story image, 10 per Feed image**.
- Each image shows the club name, slide title, rows, and "powered by rotra". The preview shows every image and the count before download.
- Images are files for the operator to share. There is no automatic posting or social login.

Downloads do not require publishing first.

## Session record

Any completed or invalid session opens as a **read-only session record** from the home screen or calendar.

- Tabs: Public page, Results, How the night ran (replay timeline and matches by court), Players, Financials (estimate and payments checklist).
- Valid session: status chips (Completed; results published or private), totals (games, with the invalid count; players; courts; length), **How the night ran** — every match by court in the order played, with time range, winners highlighted, score or "no score", Fun and Invalid markers, and substitution notes — and each player's rank, level, W–L, and games against the minimum. Links to the result slides and public page.
- Invalid session: the reason, a statement that it has no official result and counts toward nothing, no match history, standings, or slides, and players marked "Not counted".

See [finalization and publication flow](flow/finalize-and-publish.md).
