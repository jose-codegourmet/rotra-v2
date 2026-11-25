# Leaderboards and the podium

**Last verified:** 2026-11-25 against the mockup ([D-2026-11-25-04](../../../../mvp/decisions/2026-11-25.md#d-2026-11-25-04); [log](../../../../mockup-changes/2026-11-25-queue-leaderboard-podium.md); mockup only, not in the mock app yet).

**Surfaces:** `Q-LEADERBOARDS`, `Q-PODIUM-PLACE`, and the podium used by `Q-LEADERBOARD` ([session console](session-console.md#q-leaderboard--tonights-standings)), the session record's Results tab ([results and sharing](results-sharing.md)) and the public page's Leaderboard tab ([public session](public-session.md)).

**Sources:** [D-2026-11-25-04](../../../../mvp/decisions/2026-11-25.md#d-2026-11-25-04), the [results rules](../../../../business_logic/product/queue/modules/results/README.md) for session standings. **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html) (`podiumHtml`, `sessionPodium`, `viewLeaderboards`, sheet `podiumPlace`). The look is the ROTRA Player leaderboard podium ([rotra-player.html](../../../../../apps/mockup/player-app/rotra-player.html) `podium()`).

Owner, November 25, 2026: “a leaderboard in the queue page should look like this too”, “I want the leaderboards to always show the PODIUM”, “multiple people can be in the podium per place as long as it is stacked”, “if multiple people are in a place of the podium. clickin it should open a dialog on who's in that place”.

## Podium

One podium for every leaderboard in the Queue app, so the session views and the Leaderboards page match.

- **Look (like for like with ROTRA Player):** a card lit from below in the accent green over an 8 px accent grid, with drifting ember pixels (hidden with reduced motion). Heading **Top three** in the pixel font (Silkscreen) in the accent, with a muted line on the right. Three pixel-notched steps, **2nd** on the left, **1st** in the middle and tallest, **3rd** on the right; each step shows its number and “1st” / “2nd” / “3rd”. The 1st step is solid accent; pixel fire burns behind the 1st place picture. The order in the page (and for screen readers) stays 1, 2, 3.
- **A place with one player:** the picture (86 px for 1st, 64 px for 2nd and 3rd; 68 and 52 px at 560 px and narrower) with an accent ring, the **full name**, and the record line. Tapping it opens that player's profile.
- **A shared place:** the pictures stack, overlapping, on the step (48 px, 60 px for 1st; 36 and 44 px on phones). Up to three pictures show; past three, two pictures and a “+N” bubble. The first two names show, then “+N more” past two (like the Player app), and the record line ends in “each”. Tapping it opens **Podium place** (below). Its accessible name lists every player: “Second place, shared by 2 players: NAME, NAME. 6 wins, 67% win rate each. Show who”.
- **A place with no one yet:** the step stays, with an empty dashed circle and “—” (named “Third place, no one yet”). The podium always shows, even with fewer than three places or none at all; with no one in 1st place there is no fire.
- **Names and pictures are never masked** on a leaderboard, on any screen.
- **Record line:** session leaderboards show “W W · L L” (“3 W · 1 L”); the Leaderboards page shows “N wins”.
- **Muted line:** session leaderboards: “This session · N players”. Leaderboards page: “Top monthly · November 2026 · top 50”.

## Q-PODIUM-PLACE — Podium place dialog

Opened by a shared podium place. The app's standard sheet.

- Title “2nd place · 3 players”. Muted line: session leaderboards “Same wins and losses: 2 W and 1 L each.”; Leaderboards page “Same wins and win rate: 6 wins and 67% each this month.” (this week, this quarter, this year).
- One row per player in that place: picture, **full name** (on the ROTRA board, their club under it), then “W W · L L · G games · P% win rate”. On the Leaderboards page, games are the player's standard matches in the period (wins plus losses); in a session, the counted games as in the standings table.
- A row opens that player's profile like a face does elsewhere: the club's profile sheet, whose **Back to place** returns to this dialog. On the public page a row opens the profile card for a signed-in player only. Another club's player on the ROTRA board has no tap.
- Footer **Close**. If the place empties while the dialog is open: “No one is in this place now.”

## Q-LEADERBOARDS — Leaderboards page

Left nav item **Leaderboards** (trophy icon), after Saved players. Route `/leaderboards`; `?tab=rotra` opens the ROTRA board. The license gate applies, as on Venues.

- **Heading** “Leaderboards”, then: Club “The top 50 in CLUB's sessions. Most wins in standard matches this year comes first. Singles and doubles count together.”; ROTRA “The top 50 across every club on ROTRA. …” (“this year” follows the period: this quarter, this month, this week).
- **Tabs** **Club** and **ROTRA** (underline tabs). Club counts standard-match wins in this club's sessions only; ROTRA counts them across every club.
- **Period** segmented control: **Top annual**, **Top quarterly**, **Top monthly**, **Top weekly**; beside it the period and “compared with last year / last quarter / last month / last week”. Period text: “2026”; “Q4 2026 · Oct 1 to Dec 31”; “November 2026”; “Nov 23 to Nov 29”. Periods are calendar periods in Manila time; a quarter is a calendar quarter, a week runs Monday to Sunday.
- **Podium** for places 1 to 3 (above).
- **List** from place 4, in a card, like the ROTRA Player leaderboard: columns #, movement mark, picture, Player, Wins. Each row: place, movement mark, picture, full name (on the ROTRA board the club under it), “N wins” and “P% win rate”. At 560 px and narrower the header hides and the wins sit under the name. Movement marks as on Player: an up arrow and count (accent), a down arrow and count (error), “–” for the same place, or a **New** pill (warn) when the player wasn't on that list in the previous period; hover or focus shows “Up 2 places. Was #6 last month.” and the row reads it out. A row opens the club's profile sheet for this club's players; other clubs' players have no tap.
- **Places:** most wins first; win rate breaks a tie; the same wins and the same win rate share a place, numbered without gaps (1, 1, 2). The list holds the top 50 players, plus anyone sharing the 50th player's place.
- **Empty:** “No one has won a standard match this month yet. The list fills as your sessions finish.” (ROTRA: “as clubs finish sessions”). When everyone is on the podium: “Everyone on this list is on the podium.”
- **Who appears here** card: Club vs ROTRA; the 50 players with the most wins in standard matches in that year, calendar quarter, month or week (Monday to Sunday) in Manila time, restarting each period; same wins and win rate share a place, and tapping a shared podium place shows who; fun games, partial games after a substitution, games from not-ranked sessions and invalid games or sessions don't count; the movement mark; on ROTRA, “Players from other clubs show their club. Only your club's players open a profile here.”

**Prototype only:** the period numbers are made up from each player's ID, other clubs' players are made up, and a few shared places are pinned so the stacked podium and its dialog show (Club › Top monthly and Top weekly, ROTRA › Top quarterly and Top weekly).

**Open:** whether guests (no ROTRA profile) appear on the Club board (the prototype lists every saved player there; ROTRA lists ROTRA profiles only).
