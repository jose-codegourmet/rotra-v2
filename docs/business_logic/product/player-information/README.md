# Player Information app

**Last verified:** 2026-11-11 for the public club page; 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Lean v1 target product.

**Reference prototype:** [`apps/mockup/player-app/rotra-player.html`](../../../../apps/mockup/player-app/rotra-player.html), also published as the ROTRA Players artifact. It shows these rules on screen; it adds no rules of its own.

This product stores player identity and shared rank across clubs. Profiles and the overall ROTRA leaderboard are public, subject to each player's [profile visibility](modules/identity/README.md#personal-editing-and-privacy) (Public · Private · Always private; default Private). Registered players sign in to edit their personal information, but cannot edit games, results, or calculated ranks.

| Module | Owns |
|---|---|
| [Identity](modules/identity/README.md) | Profile creation/claim, Google sign-in, account verification, contact privacy, player ID |
| [Ranking](modules/ranking/README.md) | Club assessments, performance, rank labels, rolling eligibility |
| [Notifications](modules/notifications/README.md) | The player's notifications and ROTRA announcements (proposal, [D-2026-11-16-03](../../../mvp/decisions/2026-11-16.md#d-2026-11-16-03)) |

## Scope

- A club can run sessions with guests who have no Player Information account.
- A club can save a person with their email as an **unclaimed** player. They get an RTR ID as soon as the entry successfully syncs, without waiting for Session done; one email is one person and one RTR ID across clubs, and each club keeps its own version of them ([D-2026-11-16-04](../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04), replacing the phone-linked rule of October 28, 2026). Claiming the profile is a separate step. Unclaimed players are public, and on the leaderboard only while exactly one club has saved them.
- One shared rank supports both singles and doubles.
- One overall ROTRA leaderboard, with no city filtering in v1, plus one club leaderboard per club that counts only that club's sessions ([D-2026-11-25-04](../../../mvp/decisions/2026-11-25.md#d-2026-11-25-04); [ranking](modules/ranking/README.md#club-leaderboard)). Every leaderboard shows full names and pictures, whatever the profile visibility.
- A player can have a label such as **Intermediate High** and a position such as **#128**.
- City/National/World competition categories are deferred; the public leaderboard is global.
- Social links describe the player; they are not authentication providers.
- No old review, skill-dimension, EXP, or separate MMR system is implicitly included.

World discovery is v2 and has no further requirements here.

## Public club page (#737, epic P07)

A club has a public page in the Player app at `/clubs/[clubId]`, opened from the clubs card on any readable player profile ([D-2026-11-11-11](../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11), [D-2026-11-12-04](../../../mvp/decisions/2026-11-12.md#d-2026-11-12-04)). A signed-in member leaves the club from its club page. Epic **P07**; the MVP timing is not decided (the scope freeze D-04 still governs the real-app order).

- **What it shows.** A club header (the club's mark and name, city, member count, whether a session is happening or the next one is scheduled, **Join this club**, **Share club page**), stat cards, a **Next up** card for the soonest session, **Upcoming sessions**, a **Leaderboard** card (the club leaderboard: four periods, podium, the next 7 players, **See all** to `/clubs/[clubId]/leaderboard`; [D-2026-11-25-04](../../../mvp/decisions/2026-11-25.md#d-2026-11-25-04), [rules](modules/ranking/README.md#club-leaderboard)), a month **Calendar** with the club's complete schedule, and **Members**. **No banner**: banners belong to player profiles only.
- **Members are registered members only.** Guests and unclaimed profiles never appear. Names are masked for visitors exactly as on the public session page and the rows don't open; signed-in players see names and open the player profile dialog. An always-private member shows a masked name with their picture; a member who turned on **Hide from Player Information** is not listed. The member count equals the members listed.
- **Schedule.** Upcoming means scheduled or live, never cancelled; each session opens its public session page. The calendar lists every session of the club, upcoming and done, however old; done sessions keep their session page for three months, after which the existing "Session page no longer available" note shows.
- **Join this club** opens the club's current invite link (sign-up when signed out, **Join <club>?** when signed in). **Share club page** copies the page link. The invite link and the page link are separate: regenerating the invite code changes where the button goes, not the page URL.
- **Members page** `/clubs/[clubId]/members`: all members, searchable by name or nickname, filterable by level, grouped by first letter with an A–Z index, like Queue's Saved players. Masked members are listed without a button and never match a search.
- **Profile dialog.** A member opens a dialog instead of leaving the page: banner, picture (opens the full photo), the display name (nickname, else full name) with the full name under it when there is a nickname and a copy-player-ID button ([D-2026-11-13-04](../../../mvp/decisions/2026-11-13.md#d-2026-11-13-04)), level, overall position when there is one, **About** (registered in, RTR ID) and **Latest stats** (the year as a chip; split in two on the podium's green grid background: the left 30% is **Win rate**, a big accent percentage with a pixel fire beside it that grows with the rate; the right 70% has “Latest stats” and the year over Games, Wins and Losses, [mockup log](../../../mockup-changes/2026-11-13-profile-stats-redesign.md)) (this calendar year, reset on January 1, [D-2026-11-13-03](../../../mvp/decisions/2026-11-13.md#d-2026-11-13-03)). A private member's dialog shows picture and banner only.
- The page is served per request, never indexed and never static.

## Public match page

Owner decision, November 25, 2026 ([mockup log](../../../mockup-changes/2026-11-25-player-match-page.md), screen [P-MATCH-PAGE](../../../screens/product/modules/player-information/match-page.md)). Mockup only so far; not ticketed.

- **One page per match.** Every recorded game has a public page at `/matches/[matchId]`. The id is the match's own id, so every player in that match opens the same page. Anyone can open it, signed out too. It is read-only, like all history: no edit, dispute or score-later action.
- **What it shows.** The game as a court (format, score or “No score”, Won / Lost read from the left side, the games badge on each face, each player's skill group), the session title, date and club, and beside it a **VS card** with both teams. No stats show by default; tapping a player on the VS card shows their win rate and record in this session before this game, their win rate this year (registered, visible profiles), and their earlier games of the same session in play order (owner, November 26, 2026).
- **Who is on the left.** A signed-in player who played in the game sees their own side on the left as “You”. Everyone else sees the first team (Team A) on the left.
- **Privacy.** Names follow each player's profile visibility for the viewer, as on profiles and the public session page: a visitor sees Private players and guests masked, an Always private player is masked for everyone but themselves, pictures stay visible. A player whose level is hidden from the viewer shows no skill group.
- **What counts is unchanged.** Fun, partial and not ranked games keep their notes; the page adds no counting rule.
- **Opening it.** Tapping any game court in ROTRA Player opens its match page; the faces still open the profile card and the share icon still shares. **Share game** links to the match page (see [What a player may share](modules/ranking/README.md#what-a-player-may-share)).
- **Unknown id.** A match id that doesn't exist shows a not-found state.
