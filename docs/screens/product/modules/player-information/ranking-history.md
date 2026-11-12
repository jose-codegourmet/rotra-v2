# Global leaderboard, rank explanation, and game history

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Surfaces:** `P-LEADERBOARD`, `P-RANK-DETAIL`, `P-ELIGIBILITY`, `P-MATCH-HISTORY`.

**Source:** [ranking rules](../../../../business_logic/product/player-information/modules/ranking/README.md).

## P-LEADERBOARD — One overall ROTRA ranking

Public without sign-in. Rows show global position, name/nickname, optional avatar, full skill label, and a link to the correct profile. No city, club, national, world-stage, or separate singles/doubles filters in v1.

Visitors who aren't signed in ([D-2026-11-09-07](../../../../mvp/decisions.md#d-2026-11-09-07)): a private player (or guest) keeps their position and level, but the name shows the first letter of each word followed by `***` ("Jose Adrian" → "J*** A***"), the picture shows the initials of that mask, and the row (or podium step) doesn't open: no button, `aria-disabled`. Name search doesn't match them. Entering a private player's full RTR ID gives the same neutral "Profile not found" as an unknown ID. Signed-in players see everyone as usual, except an **Always private** player ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)): for everyone but that player, signed in or not, the leaderboard row and podium step show the masked name and the player's picture (their picture and banner stay public); the row opens only to the private card of [profile states](profile.md#profile-states) (**This player keeps their profile private.**, no sign-in button). The player sees their own row in full. *Whether an always-private player's level and position still show on the row is not stated in the decision; the prototype's helper text says initials instead of the photo, which the decision overrides (picture stays public).* Podium and row pictures are circles.

Pagination or progressive loading is a proposed presentation choice for scale, not an excuse to truncate the ranking. Keep ordering stable within a coherent refreshed result. Search, if included, searches this public ranking; it is not a hidden contact search or new discovery product.

Eligibility help states the configured recent completed standard-match threshold, initially 10, within the last three months. Fun games, invalid games/sessions, and partial games do not count. Threshold text must use the current Admin configuration, not a hardcoded ten after changes.

States: loading, no eligible players, fetch failure, refresh in progress, stale/cached data, and a profile not appearing due to eligibility. Never populate empty standings with demo people or treat ineligible as last place.

Refresh in progress is reached by pulling the page down from its top (touch) or by coming back to the tab, once every 10 seconds, with the session page's `pull-to-refresh` pill (**Pull to refresh** → **Release to refresh** → **Refreshing…** → **Updated 7:42 PM**; **Refresh again in a few seconds** inside the lock; **You're offline. Reconnect and try again.** offline). It refetches the list, the signed-in player's own position and the match requirement; no polling ([November 12, 2026 mockup change](../../../../mockup-changes/2026-11-12-player-pull-to-refresh.md)).

## P-RANK-DETAIL — Explain the shared rank

Explain the two inputs in plain language:

- Current default 70%: each club's latest assessment within the last three months, with equal weight per club.
- Current default 30%: eligible match performance in the same window, accounting for assigned levels and partner/opposition context; optional scores add evidence.

Use configured weights if changed. Do not publish raw invented numerical components when the underlying formula is unresolved. Global rank is not simply total wins or average category ordinal.

Explain that each club can assign its own local level and that the operator's local judgment controls pairings. Their roster assessment can update shared rank on acceptance/sync; game-performance updates follow valid Session done. Neither is dependent on public slide sharing.

Whether individual clubs' assessments are publicly itemized is undecided. The explanation can describe the method without exposing unapproved club-by-club details or private operator notes.

## P-ELIGIBILITY — Progress and reassessment

For the signed-in owner or permitted public explanation, show actual eligible completed standard matches in the current window and required threshold. Do not count lifetime games toward a rolling requirement.

Below threshold: profile and provisional rank may remain visible, but no overall position. Fun-game local counts cannot inflate this progress.

Three months without play: retain previous label with **Needs reassessment**, remove overall position, and explain return requires a fresh club assessment plus a completed new session and the rolling match threshold. One return session does not waive the threshold.

Define missing/stale calculations as pending, not zero or Beginner. Exact calendar/window boundaries and recalculation behavior are unresolved and must be settled before publishing precise cutoff dates.

## P-MATCH-HISTORY — Read-only recorded games

Show only official records from valid finalized sessions for a linked player. Each supported row can show date, club/session, format, teams/opponents permitted by visibility policy, result, and final score **if supplied**. A missing score is displayed as “Winner recorded; score not entered,” not 0–0.

No Edit result, dispute/void, add score later, or reconstruct-game action. Those old workflows are outside v1's immutable result rule.

Separate club-local fun-game history from long-term performance counting. Whether fun/partial games appear in the public history list and exactly which opponent details are public remain open. Do not hide them from the club's retained operational record or silently claim they contributed to rank.

After a guest's identity is confirmed and linked, include their earlier valid games in personal history and ranking under the existing eligibility/window rules (owner decision, October 28, 2026). A name match alone is insufficient. Show processing truthfully until attribution/recalculation completes; use original game dates and count each game once. Confirmation evidence and mistaken-link handling remain open. Invalid sessions/games do not appear as official wins, losses, or played games; fun/partial-game public visibility remains a separate open detail.

If a public session page expires/deletes, preserve player history with a truthful unavailable-link state. Do not render broken link navigation as if history vanished.

### Share cards

Own profile only ([D-2026-11-09-08](../../../../mvp/decisions.md#d-2026-11-09-08)). One sheet, **Share rank**, **Share result** or **Share games**, with a **Post | Story** switch (4:5, 1080 × 1350; 9:16, 1080 × 1920) above the fixed dark brand card. The card is drawn on the device and looks the same in both themes. Its footer carries “ROTRA · Run the game.” and a small corner QR that opens the player's profile (`/player/players/<id>`). Hint: “The QR opens your profile. Private profiles ask visitors to log in.” (the same sheet also carries **Share profile**, whose card and link field are in [profile.md](profile.md#p-own-profile--signed-in-owner-view)) Buttons: **Copy link**, then **Share** when the browser supports Web Share (the phone's share sheet with the image), otherwise **Download image** (PNG).

- **Share profile** ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)): own profile, a card with level (or **Not ranked yet**), position when there is one and 90-day wins; a read-only **Profile link** field with **Copy** under the card; **Download image** and **Share**. Post is 1080 × 1350 like the other cards, not the 1080 × 1080 in the owner's pack; to confirm with the owner.
- **Share rank:** from the profile, see [profile.md](profile.md#p-own-profile--signed-in-owner-view).
- **Share result:** in My sessions (Finished) and on each session group in Match history. Card: session title, date and club, “#N in Standings”, “G games · W–L”.
- **Share games:** on each session group in Match history. Card: date and club, avatar groups for each team with a prominent score between them, and “Total W–L”. Post shows 3 games, Story 4, then “+N more games”. A missing score shows an em dash and “Winner recorded”.
- **Published only:** a session that is not published shows no button and the muted “Results not shared yet by the club.” Share result and Share games appear only after the Queue Master publishes.
- **Names on images:** other players show as a visitor would see them. Private and Always private players and guests are masked (first letter plus `***` per word), public registered players in full, whoever is signed in.
- **Story** shows 4 avatar rows; **Post** shows 3. Both keep scores prominent and names secondary.

## Acceptance examples

- Nine recent standard games plus twenty fun games still fails a threshold of ten.
- Old lifetime games outside the window do not count toward current eligibility.
- Updating weights changes explanatory copy only when the corresponding configured calculation is in effect.
- Deleting a club's public page leaves the player's retained official record intact.

**Owner revision, November 10, 2026:** Share games uses paired avatar groups with a large score between them. The owner and partners appear on the left, opponents on the right, with short labels below. Public players may show pictures; private players and guests show masked initials only. A missing score shows an em dash and “Winner recorded”. Post shows 3 games, Story 4, with “+N more games” and the full session W–L total.

**Owner follow-up, November 10:** Games share cards use player names rather than “You”. The winning player or pair has green avatar borders; the same borders appear in the PNG export. Masked names remain masked.
