# Player: New public club page with members, upcoming sessions and a calendar (#737, proposed)

Status: NEW
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Public club page (new screen, epic P07); linked from Your clubs › Club page and the Prototype menu
Route: /player/clubs/c1 (also c2, c3, c4)
Screen ID: none yet (proposed P-CLUB-PAGE)
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: club-header (avatar plus facts and actions), member-row, session-row (reuses the My sessions row), month-calendar
Supersedes: none
Superseded by: none

## What changed
- Before: no public page for a club.
- After: a public page at /clubs/[clubId] in the Player app (epic P07). Sections, top to bottom: a club header (initials logo, name, **Founding city**, **Members** count, **Join this club**, **Share club page**); **Members**; **Upcoming sessions**; **Calendar**. **Your clubs** on My profile gets a **Club page** button per club, and the Prototype menu lists club pages (visitors have no other way in yet).
- Members: registered members only. Visitors see names masked like the public session page and the rows do not open; signed-in players see names and open the player profile; always-private members stay masked with initials for everyone; members hidden from Player Information are not listed; guests and unclaimed profiles never appear. The count equals the members listed. 12 show at a time with **Show more members**.
- Upcoming sessions: scheduled and live, never cancelled; each row opens that session's public page. Calendar: a month grid (back to the last three months, forward to the last upcoming session) with a dot per session (accent for upcoming, grey for done), and a list below for the month; done sessions from the last 90 days link to their session page.
- **Join this club** opens the club's current invite link (sign-up when signed out, **Join <club>?** when signed in). **Share club page** copies the page link. The invite link and the page are separate; regenerating the invite code changes the button's target, not the page URL.
- Proposed, built to the recommended option of the owner decision pack; the owner has not approved it yet. The pack also recommends building this after MVP (Q1 B) and writing the child tickets now.

## Why
- Ticket #737: “A club should have a public page that shows: club members, upcoming sessions, a calendar with sessions.”
- Recommended answers built: Q2 A Player app, epic P07, /clubs/[clubId]; Q3 A registered members only with the masking rules above; Q4 A upcoming list and calendar as described; Q5 A separate from the invite link; Q6 A child tickets in order: 1 mockup, 2 club header and members list, 3 upcoming sessions, 4 calendar, 5 Join button and Share club page, 6 real-mode reads.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: signed out (names masked, hint line) and signed in (names, You chip on own row); always-private member masked for a signed-in player; own row hidden when Migs turns on Hide me from Player Information; Show more members; clubs with sessions (Lahug Smash Club, IT Park Badminton Club) and without (Mandaue Shuttle Society, Talamban Racket Club: empty states); live, scheduled and done session rows; done session whose page is gone (shows the existing note); calendar today ring, previous and next month (disabled at the ends), empty month; Join this club signed out and signed in (already a member shows the existing already-in message); copy success and failure toasts; unknown club id is not found.
- Copy: **Founding city**; **Members**; **Join this club**; **Share club page**; **Names are masked. Sign in with ROTRA to see them.**; **Show more members**; “12 of 320”; **No registered members yet.**; **Upcoming sessions**; **No upcoming sessions.**; chips **Happening now**, **Scheduled**, **Done**; **Session page**; **Session page no longer available**; **Calendar**; **Previous month**; **Next month**; legend **Upcoming**, **Done**; **No sessions in <Month Year>.**; **Done sessions from the last three months stay on the calendar.**; **Club page** (button in Your clubs); toasts **Club page link copied**, “Couldn't copy. The club page link is …”.
- Tokens: none (calendar dots use --accent and --fg3)
- Known differences: the logo is the club's initials (the fixtures have no club picture); no fixture is cancelled, so the cancelled rule is not shown; the member sample is generated from the leaderboard fixtures, split across the four clubs.

## Reuse plan
- Reuses as is: avatar, chip, session row (My sessions), notice, empty state, hero card, key-value list, Join club page and invite route.
- Extends: club row (crow) as a tappable member row.
- New: month-calendar (no calendar component exists); club page screen.
- Shares work with: the profile visibility log (masking and hidden players) and the avatar photo viewer logs (member rows open profiles, the photo opens from the profile).

## Docs updated
- Business logic: none yet — proposal pending owner approval; business/screen docs follow when approved
- Database design: none yet — proposal pending owner approval; business/screen docs follow when approved
- Screen docs: none yet — proposal pending owner approval; business/screen docs follow when approved

## Real app work
- Epic P07 in apps/player: route /clubs/[clubId] (served per request, never indexed, never static); club header, members list, upcoming sessions, calendar; Join this club (current invite link) and Share club page; real-mode reads that apply the masking and hidden-from-directory rules. Link from the Your clubs list.

## Owner comment, November 11, 2026: "the club page looks so bad, please redesign"
- Changed: the page is rebuilt in the profile-card language.
  - **Hero:** the club's banner (one of the predefined banners) runs across the top of the card with the club mark (initials, 88 px circle) overlapping it; the club name beside or below it; a chip row (**Cebu City**, **320 members**, and **Playing now** or **Next Thu, Nov 13**); **Join this club** (primary) and **Share club page** (top right on wide screens, stacked on phones); then a three-tile strip: **Registered members**, **Upcoming sessions**, **Sessions this month**.
  - **Next up card:** the soonest session as a highlighted card: a date block (day number and month), **Next up** or **Happening now**, title, date and time (“· courts are running” when live), and **Open session page** or **Watch live**.
  - **Two columns from 920 px:** left **Upcoming sessions** (the rest, each with a date block and a Scheduled chip; “That's the only one scheduled so far.” when only one) and **Calendar** (unchanged month grid, now with date-block rows); right **Members** as a four-across grid of circular avatars with first names and levels (masked members shown without a button), **Show more** with “12 of 320”.
  - On phones everything stacks; the name sits under the club mark; the Next up button spans the card.
- Copy added: **Registered members**, **Upcoming session(s)**, **Session(s) this month**, **Next up**, **Happening now**, **courts are running**, **Open session page**, **Watch live**, **Playing now**, **Next DATE**, **That's the only one scheduled so far.**, **Show more**. Removed: the Founding city / Members key-value list, “Show more members”.
- States: with a live session (Playing now chip, Happening now card), without any upcoming session (no Next up card, empty state), signed out (masked names), signed in (names, You), calendar months.
- Owner comment, November 11, 2026 (“no banners please”): the club hero has no banner strip. The club mark and name sit side by side at the top of the card with normal padding; the rest of the redesign (chips, buttons, stats strip, Next up card, two columns, member grid) is unchanged. Banners stay a player-profile thing only.
