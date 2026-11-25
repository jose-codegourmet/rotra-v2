# Player app: four leaderboard periods, shared places, an always-on podium with stacked places, full names, and a club leaderboard

Status: IN MOCK APP — #1106 (PR #1107)
Date: 2026-11-25
App: player
Mockup: apps/mockup/player-app/rotra-player.html › P-LEADERBOARD block (`LB_PERIODS`, `lbWhen`, `periodList`, `lbSort`, `playedAtClub`, `topPlace`, `topRow`, `topPlaces`, `lbRow`, `meCard`, `lbTabs`, `lbShown`, `viewBoard`, `podium`, `lbPlaceSheet`, `clubBoardCard`, `clubBoardBody`, `viewClubBoard`), `.pod-stack`, `.pod-more`, `.pod.empty`, `.pod-none`, `viewClub` (Leaderboard card), `viewAccount` (Profile visibility hint), `SHEETS.lbPlace`, actions `clubLbPeriod`, `openClubBoard`, `openLbPlace`, routes `/player/clubs/<id>/leaderboard`
Route: /player (Leaderboard; Prototype panel › Leaderboard › No one qualifies for the empty podium; Top weekly for a stacked 1st place), /player/clubs/c1 (Leaderboard card), /player/clubs/c4/leaderboard (club leaderboard page; Top weekly for stacked 2nd and 3rd places)
Screen ID: P-LEADERBOARD, P-CLUB-PAGE, P-CLUB-LEADERBOARD (new), P-ELIGIBILITY, P-PHONE-PRIVACY (Profile visibility)
Artifact: none
Components: top-three-podium, leaderboard-row, leaderboard-list, leaderboard-period-switch, leaderboard-search, leaderboard-rules-card, my-position-card, profile-leaderboard-chips, profile-ranking-card, club-member-profile-sheet, sheet, club-page-hero (page layout only)
Supersedes: none (amends in part [2026-11-16-player-leaderboard-periods](2026-11-16-player-leaderboard-periods.md), which stays IN MOCK APP)
Superseded by: none

## What changed
- **Four periods.** Before: **Top annual · Top monthly · Top weekly**. After: **Top annual · Top quarterly · Top monthly · Top weekly**, in that order. The quarter label reads "Oct to Dec 2026 · compared with last quarter"; movement marks compare with last quarter ("New on the quarterly list. Not on it last quarter.").
- **Shared places.** Before: every row had its own place; win rate, then nickname, broke a tie. After: players with the same wins and the same win rate share a place, numbered without gaps (1, 1, 2). Inside a shared place, rows are ordered by nickname (full name when none), then ID. A shared row's accessible name adds ", shared"; the Your position card adds "· shared place".
- **Top 50 with ties.** The list holds the first 50 players plus anyone who shares the 50th player's place (so a list can show "of the top 57").
- **Podium always shown.** Before: only with at least three players and no name search. After: whenever the list has loaded (also during a name search and with an empty list). A place no one holds keeps its step with an empty dashed circle and **No one yet**; no fire behind an empty 1st place. The podium holds every player in places 1 to 3, so the list below starts at place 4; when nobody is past place 3: "Everyone on this list so far is on the podium."
- **Stacked podium places.** A place shared by several players stacks their pictures on its step: two or three overlapping pictures, or two pictures and a **+N** circle when four or more share it. Under the stack: the first two full names, "+N more" when more than two, and "N wins each". The step is one button: "First place, shared by 4 players: A, B, C and D, 7 wins each. See who's in this place".
- **Shared place dialog (new).** Title "1st place · 4 players"; line "ROTRA · Top weekly · Nov 23 to Nov 29. The same wins and the same win rate, so they share this place." (the club name in place of ROTRA on a club leaderboard); one row per player: picture, full name, nickname, **You** / **Not registered yet** chip, "N wins", "N% win rate". A row opens the profile dialog; **Close**.
- **Full names on leaderboards.** Before: Private players masked for visitors ("M*** Y***", not searchable), Always private masked for everyone. After: every row, podium place and dialog row shows the full name, nickname and picture to everyone; the leaderboard's name search finds them. A row or place of a profile the viewer may not open is still not a button. Profiles, member lists and the profile dialog keep their masking.
- **Profile boxes.** Up to four boxes (Top quarterly added); Compare gets a Top quarterly row through the same list.
- **Who appears here** card: rewritten for four lists, shared places, the quarters and full names (copy below); "Win rate breaks a tie." removed.
- **Your position below the top 50:** "The player in place 50 has N" → "The last player in the top 50 has N".
- **Club page › Leaderboard card (new)**, in the left column between **Upcoming sessions** and the **Calendar**: heading **Leaderboard** with **See all** (only when the list has players), the four-period switch with "2026 · compared with last year", the same podium (head "Top three" · "Top annual · 2026 · top 50"), then the next **7 players** after the podium as leaderboard rows (so the top 10 when no place is shared). Its period is its own (separate from the ROTRA leaderboard's).
- **Club leaderboard page (new)** `/clubs/<clubId>/leaderboard`: back link to the club, the club name as a label, **Leaderboard**, "The top 50 in CLUB's sessions. Most wins this year comes first. Only games played in this club's sessions count.", the period switch, the podium, one card of rows from place 4 with "Showing 1–25 of the top N" and **Show 25 more**. No search, no Your position card, no Who appears here card.
- **Privacy and contact › Profile visibility:** a new hint under the three choices.
- **Prototype data:** four players share 1st place on ROTRA Top weekly (set on purpose); club lists have natural shared places (for example Talamban Racket Club, Top weekly: 2nd shared by 7, 3rd by 3). Monthly and weekly lists only include players who played in the period. Pictures follow the fixture (one in six players has initials only).

## Why
- Owner, November 25, 2026 ([D-2026-11-25-04](../mvp/decisions/2026-11-25.md#d-2026-11-25-04)): "LEADERBOARDS needs to be Annually , Quarterly , Monthly and Weekly Same with club and rotra", "please do not hide the full name", "I want the leaderboards to always show the PODIUM", "multiple people can be in the podium per place as long as it is stacked", "if multiple people are in a place of the podium. clickin it should open a dialog on who's in that place".
- Owner answers the same day: shared place = same wins and same win rate, dense numbering, nickname then ID inside a place; full names for everyone on every leaderboard, leaderboards only; quarters Q1 January to March … Q4 October to December at 00:00 Asia/Manila; the club leaderboard counts only that club's sessions, on the club page, kept reasonable in size (the 7-rows-plus-See-all choice is this mockup's).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: podium with three single places; a stacked place of 2, of 3 (three pictures, "+1 more") and of 4 or more (two pictures and "+N", "+N more"); empty place steps (1, 2 or 3 empty); empty list (three empty steps + empty message); loading and error (no podium); name search with the podium above; a Private player's row for a visitor and an Always private player's row (full name and picture, not a button); a shared row; Your position with "· shared place"; Your position below the top 50; the shared place dialog (ROTRA and club, a row with **You**, a row that doesn't open); the club card with 7 rows after the podium and with "Everyone on this list so far is on the podium."; the club page with Show 25 more; hover and focus on a stacked step.
- Copy:
  - Tabs: "Top annual", "Top quarterly", "Top monthly", "Top weekly"; "Oct to Dec 2026 · compared with last quarter".
  - Podium: "No one yet", "+N more", "N wins each", "+N" (picture circle).
  - Dialog: "1st place · 4 players" (also "2nd place", "3rd place", "1 player"), "ROTRA · Top weekly · Nov 23 to Nov 29. The same wins and the same win rate, so they share this place.", "N wins", "N% win rate", "No one is in this place now.", "Close".
  - List: "Everyone on this list so far is on the podium.", "· shared place", "The last player in the top 50 has N", "and a better win rate".
  - Who appears here: "**Top annual, Top quarterly, Top monthly and Top weekly** each list the **50 players with the most wins** in standard matches in that year, quarter, month or week. Nothing else decides who is listed." · "Players with the same wins and the same win rate **share a place**, and the next place follows on (1, 1, 2). Tap a podium step that several players share to see them all." · "Each list starts again when a new year, quarter, month or week begins. Quarters run January to March, April to June, July to September and October to December." · "Every leaderboard shows each player's full name and picture, whatever their profile is set to."
  - Club card: "Leaderboard", "See all", "Couldn't load the club leaderboard. Check your connection, then try again.", "No one has won a standard match in this club's sessions this week yet."
  - Club page: "The top 50 in CLUB's sessions. Most wins this year comes first. Only games played in this club's sessions count."
  - Privacy and contact: "Leaderboards always show your full name and picture, whatever this is set to."
- Tokens: none (`--border-strong`, `--elev`, `--fg`, `--fg2`, `--mono` reused).
- Sizes: stacked pictures 48 px (1st place 60 px), overlap −16 px; at ≤ 560 px 38 px (1st 46 px), overlap −14 px; stacked names 13 px (1st 14 px), 12 px on phones.
- Known differences: none.

## Reuse plan
- Extends: top-three-podium — places from `lbPlace` instead of index; an empty step; a stacked step (pictures, "+N", names, "N wins each") that is one button with an `onOpenPlace` callback.
- Extends: leaderboard-period-switch — a fourth option (Top quarterly); the period label for a quarter.
- Extends: leaderboard-row — shows the full name, nickname and picture for every player (no masked variant); non-openable variant stays; accessible name "shared".
- Extends: leaderboard-list, leaderboard-search, my-position-card — places from the data, list after place 3, search over every name, "· shared place", "The last player in the top 50".
- Extends: leaderboard-rules-card — new copy.
- Extends: profile-leaderboard-chips, profile-ranking-card — up to four places.
- Reuses as is: sheet — the shared place dialog; rows like club-member-list rows (avatar, name, a right-aligned record like the session rows).
- New: a club leaderboard card for the club page (composes leaderboard-period-switch, top-three-podium, leaderboard-list), because no club card holds a leaderboard today.
- Shares work with: [2026-11-25-queue-leaderboard-podium](2026-11-25-queue-leaderboard-podium.md) (the same podium, stacked places and dialog in the Queue app).

## Docs updated
- Business logic: [ranking](../business_logic/product/player-information/modules/ranking/README.md) — four periods, quarters, shared places, top 50 with ties, full names, always-on podium, new **Club leaderboard** section; [identity](../business_logic/product/player-information/modules/identity/README.md) — the visibility table and "Always private, what is exposed" now say leaderboards show the full name and picture; [Player Information README](../business_logic/product/player-information/README.md) — club leaderboard and the club page's Leaderboard card; [open decisions](../business_logic/product/open-decisions.md) — Player leaderboards row amended.
- Database design: [ranking](../database_design/product/player-information/modules/ranking.md#period-leaderboards) — quarter boundaries, shared places, no masking on leaderboard reads, club list = facts whose session belongs to the club; no new table.
- Screen docs: [ranking-history](../screens/product/modules/player-information/ranking-history.md) — P-LEADERBOARD rewritten, P-ELIGIBILITY four lists; [club-page](../screens/product/modules/player-information/club-page.md) — Leaderboard card and P-CLUB-LEADERBOARD; [profile](../screens/product/modules/player-information/profile.md) — up to four boxes; [navigation](../screens/product/navigation.md) — the club leaderboard route.
- Also: [product-terms](../product-terms.md) (Top quarterly, Club leaderboard, Podium), [D-2026-11-25-04](../mvp/decisions/2026-11-25.md#d-2026-11-25-04), [ranking workstream](../mvp/workstreams/ranking.md).

## Real app work
- `packages/data`: period type gains `quarter`; the standings function returns a dense `place` per row, orders shared places by nickname then ID, and cuts at 50 plus ties; mock fixtures give the quarter and club lists; club leaderboard query (period + club id) and hook.
- `packages/db` (real mode): the leaderboard reads add the quarter boundary, dense places and the tie cut-off, stop masking names on leaderboard reads (and in its search), and add a club-scoped read over `player_match_facts` whose session belongs to the club.
- `packages/ui`: the components in the Reuse plan, with stories in both themes and `.meta.ts` for the new states (empty step, stacked 2/3/4+, dialog).
- `apps/player`: the Leaderboard page (always-on podium, the dialog, four tabs), the club page's Leaderboard card, the new route `/clubs/[clubId]/leaderboard`, profile boxes, the Privacy and contact hint.
