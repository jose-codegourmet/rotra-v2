# Player Information app

**Last verified:** 2026-11-11 for the public club page; 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Lean v1 target product.

**Reference prototype:** [`apps/mockup/player-app/rotra-player.html`](../../../../apps/mockup/player-app/rotra-player.html), also published as the ROTRA Players artifact. It shows these rules on screen; it adds no rules of its own.

This product stores player identity and shared rank across clubs. Profiles and the overall ROTRA leaderboard are public, subject to each player's [profile visibility](modules/identity/README.md#personal-editing-and-privacy) (Public · Private · Always private; default Private). Registered players sign in to edit their personal information, but cannot edit games, results, or calculated ranks.

| Module | Owns |
|---|---|
| [Identity](modules/identity/README.md) | Profile creation/claim, login, contact privacy, player ID |
| [Ranking](modules/ranking/README.md) | Club assessments, performance, rank labels, rolling eligibility |

## Scope

- A club can run sessions with guests who have no Player Information account.
- Phone-linked profiles and permanent RTR IDs are created as soon as the entry successfully syncs, without waiting for Session done (owner decision, October 28, 2026). Existing profiles are reused; claiming a profile is a separate step.
- One shared rank supports both singles and doubles.
- One overall ROTRA leaderboard, with no city or club filtering in v1.
- A player can have a label such as **Intermediate High** and a position such as **#128**.
- City/National/World competition categories are deferred; the public leaderboard is global.
- Social links describe the player; they are not authentication providers.
- No old review, skill-dimension, EXP, or separate MMR system is implicitly included.

World discovery is v2 and has no further requirements here.

## Public club page (#737, epic P07)

A club has a public page in the Player app at `/clubs/[clubId]`, opened from the clubs card on any readable player profile ([D-2026-11-11-11](../../../mvp/decisions.md#d-2026-11-11-11), [D-2026-11-12-04](../../../mvp/decisions.md#d-2026-11-12-04)). A signed-in member leaves the club from its club page. Epic **P07**; the MVP timing is not decided (the scope freeze D-04 still governs the real-app order).

- **What it shows.** A club header (the club's mark and name, city, member count, whether a session is happening or the next one is scheduled, **Join this club**, **Share club page**), stat cards, a **Next up** card for the soonest session, **Upcoming sessions**, a month **Calendar** with the club's complete schedule, and **Members**. **No banner**: banners belong to player profiles only.
- **Members are registered members only.** Guests and unclaimed profiles never appear. Names are masked for visitors exactly as on the public session page and the rows don't open; signed-in players see names and open the player profile dialog. An always-private member shows a masked name with their picture; a member who turned on **Hide from Player Information** is not listed. The member count equals the members listed.
- **Schedule.** Upcoming means scheduled or live, never cancelled; each session opens its public session page. The calendar lists every session of the club, upcoming and done, however old; done sessions keep their session page for three months, after which the existing "Session page no longer available" note shows.
- **Join this club** opens the club's current invite link (sign-up when signed out, **Join <club>?** when signed in). **Share club page** copies the page link. The invite link and the page link are separate: regenerating the invite code changes where the button goes, not the page URL.
- **Members page** `/clubs/[clubId]/members`: all members, searchable by name or nickname, filterable by level, grouped by first letter with an A–Z index, like Queue's Saved players. Masked members are listed without a button and never match a search.
- **Profile dialog.** A member opens a dialog instead of leaving the page: banner, picture (opens the full photo), the display name (nickname, else full name) with the full name under it when there is a nickname and a copy-player-ID button ([D-2026-11-13-04](../../../mvp/decisions.md#d-2026-11-13-04)), level, overall position when there is one, **About** (registered in, RTR ID) and **Latest stats** (the year as a chip; split in two on the podium's green grid background: the left 30% is **Win rate**, a big accent percentage with a pixel fire beside it that grows with the rate; the right 70% has “Latest stats” and the year over Games, Wins and Losses, [mockup log](../../../mockup-changes/2026-11-13-profile-stats-redesign.md)) (this calendar year, reset on January 1, [D-2026-11-13-03](../../../mvp/decisions.md#d-2026-11-13-03)). A private member's dialog shows picture and banner only.
- The page is served per request, never indexed and never static.
