# Finished session page: Match history replaces the Queue; a Leaderboard tab with your position

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › public session page (viewPublic) › pubHistory, pubLeaderboard; My night › Match history
Route: /queue/s/<finished session> as “Confirmed · finished”
Screen ID: Q-PUBLIC
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: public-session-tabs, match-history-card, session-standings, public-queue
Supersedes: none
Superseded by: none

## What changed
- Finished session, Details tab: the read-only **Queue** (still showing waiting matches) → **Match history**: “Match history” with “N matches”, then cards in a grid (min 260 px): “#N”, time range, Fun chip, Team A faces and first names, the score (or “no score”, or **Invalid**), Team B; the winning side tinted with “Won”. The viewer's matches are outlined in the accent with a **Your match** chip and their name reads “You”. Faces open the profile card.
- Before the club shares the results: only the viewer's own matches, with “The club hasn't shared the results yet, so this shows your matches only.” Visitors: “Log in with ROTRA Player to see the match history.”
- My night › **Match history**: was a link to the Player app → removed (artifact comment, same day: “remove match history button since it is already below”).
- **Second pass, same day** (artifact comment on Match history: “please change the layout · 3 matches should be obvious big and green · cards should occupy by row · "your match" should not be seen since you are already logged in · match history should be split into tabs · yours and all”): the count moves to the right of the heading as a 30 px green number with “matches”; a segmented control **Yours · N** (default) / **All · N** sits under the heading; cards are one per row (a 124 px column with “#N” bold and the time range, then Team A right-aligned, a 64 px score column, Team B; 30 px faces), and on phones the number and time go on their own line; the **Your match** chip and the accent outline are gone (the viewer's name still reads “You”). Before the results are shared, **All** shows “The club hasn't shared the results yet. Every match shows here once they do.” and **Yours** with no matches says “You didn't play a match in this session.”
- **Opens on the Leaderboard when shared** (artifact comment, same day: “you should show a view as if the session is published also · so the leaderboard tab gets opened once it is published”): a finished session whose results are shared opens on **Leaderboard**; unpublished, or any other session, opens on Details. The prototype bar's “View published / View unpublished” button becomes a **Results: Not shared · Shared** switch; Shared opens the Leaderboard tab, Not shared goes back to Details. Prototype only for the switch: the real page follows the publication.
- **Your position card** (artifact comment, same day: “show your avatar and clicking on the card scrolls down to your position of the leader board · and this position thing should have a button called share”): the viewer's picture (48 px, accent ring) leads the card; the card is a button (“Your position, number N of M. Go to your row”) that scrolls the table to the viewer's row and flashes it (1.6 s accent fade; none with reduced motion); a **Share** button on the right opens the system share sheet with “I finished #N of M at SESSION · CLUB (NW NL). Played on ROTRA.” and the session link, or copies it (toast “Copied to share” / “Couldn't copy. Try again.”). The unshared **Your night** card also shows the picture, with no jump and no Share.
- **No Leaderboard tab until shared** (artifact comment, same day: “when not shared · this should not show”): the tab appears only when the club has shared the Standings; before that the page has Details and Participants only (My night already shows the viewer's own record). The “Your night” card and “The full leaderboard shows once the club shares the results.” are no longer reachable.
- **Grid design**: tried the same day on My night and Your position, then removed from both at the owner's request (“please get rid of the grid bg”, “remove the grid background”). Both cards keep their earlier look; the grid stays only on the profile cards' Latest stats.
- New third tab **Leaderboard** on finished sessions: a **Your position** card (label, “#N” in 30 px accent, “of M”, then W, L and games), the standings table (#, 28 px face and name as the page shows names, W, L, G; the viewer's row tinted with “(you)”), and “Wins first, then fewer losses, then head-to-head. Counted games only.” With no counted game: “You didn't play a counted game in this session.” Before results are shared: a **Your night** card (W, L, games) and “The full leaderboard shows once the club shares the results.”
- The Results section moves: Standings → the Leaderboard tab; Awards and Off Day stay on Details under the heading **Awards**; “Results for this session have not been shared.” stays on Details.

## Why
- Owner, November 13, 2026, with a screenshot of a finished session: “I dont think Queue should be in there since it is already Finished · it should show the Match history Instead”; then: “since the match is finished it should show a tab called leaderboard · should show the leader board and your position”. Decision [D-2026-11-13-05](../mvp/decisions.md#d-2026-11-13-05).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: published and unpublished; viewer with and without counted games; visitor; invalid match; fun match; masked names; Leaderboard tab hidden on live and upcoming sessions.
- Copy: “Match history”, “N matches”, “Yours · N”, “All · N”, “You”, “The club hasn't shared the results yet. Every match shows here once they do.”, “You didn't play a match in this session.”, “Log in with ROTRA Player to see the match history.”, “Leaderboard”, “Your position”, “of M”, “Your night”, “You didn't play a counted game in this session.”, “The full leaderboard shows once the club shares the results.”, “Wins first, then fewer losses, then head-to-head. Counted games only.”, “Awards”, “Share”, “I finished #N of M at SESSION · CLUB (NW NL). Played on ROTRA.”, “Copied to share”, “Couldn't copy. Try again.”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: the history match card (QM record), the standings order, participant-profile-card.
- Extends: public-session-tabs — a Leaderboard tab on finished sessions; public-queue — replaced by match history when finished.
- New: session-standings table with a position card.
- Shares work with: 2026-11-13-queue-public-faces-profile.md

## Docs updated
- Business logic: queue/README.md; queue/modules/results/README.md.
- Database design: none needed (reads the session's matches and the published snapshot).
- Screen docs: screens/product/modules/queue/public-session.md.

## Real app work
- Public page for finished sessions: match history section, Leaderboard tab, the publication gate for other players' matches, My night scroll.
