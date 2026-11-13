# Games page: Weekly performance chart

Status: IN MOCK APP — #822
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › weeklyPerf, viewHistory; `.wp*` styles
Route: /player/players/<id>/games (Singles and doubles tab)
Screen ID: P-MATCH-HISTORY
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: weekly-performance-chart
Supersedes: none
Superseded by: none

## What changed
- Before: the Games page went straight from the tabs to the session list.
- After: on the Singles and doubles tab a **Weekly performance** card sits above the sessions: the year chip, a summary line (“… NW NL in all · best on DAYs.”), then seven columns Sunday to Saturday, each with the win rate, a stacked bar (height = games played that weekday; wins accent at the bottom, losses error colour on top), the short day name and “NW NL”; the best weekday (highest win rate, at least 3 games) in the accent; a legend. Counted games of the current calendar year (same reset as Latest stats). Hidden when there are no counted games.
- Unchanged: the session list and game rows.

## Why
- Owner artifact comment, November 13, 2026: “there should be a diagram based on the win rates for the whole year · it will be weekly performance · SUNDAY … SATURDAY · a bar where it shows how many wins how many lose”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: several weekdays, a single weekday, no games (hidden), a weekday with fewer than 3 games (never “best”).
- Copy: “Weekly performance”, “Wins and losses by day of the week, counted games this year.”, “best on DAYs”, “Won”, “Lost”, “Bar height = games played”.
- Tokens: --accent, --error, --elev.
- Known differences: none

## Reuse plan
- New: weekly-performance-chart (CSS bars; no chart library).

## Pass 2 (artifact comment, November 13, 2026: “design could be improved”)
- Four summary tiles on top: Games, Record (W in the accent, L in the error colour), Win rate, Best day (accent tile). The chart has faint guide lines; each bar is two rounded segments (losses on top, wins below, 2 px apart) with the win rate as a pill above it; the best day's column is lifted on a soft accent gradient with a solid accent pill and label; other days' wins are a softer accent. Under each bar the day and “W–L”; days with no games show a flat stub and “—”. The summary line moved into the tiles; the legend notes “counted games this year”. Phones: tiles in a 2×2 grid, shorter plot.

## Pass 3 (artifact comment, November 13, 2026: “bar side by side please · clicking on green will filter games with win · clicking red will filter red”)
- Each weekday shows two bars side by side, wins (accent) and losses (error colour), heights relative to the largest single count, the count above each bar, the win-rate pill above the pair. Each bar is a button: tapping it filters the session list below to that weekday's wins or losses (“Showing Saturday wins” with **Clear**); the other bars dim and the chosen one gets a ring; tapping it again or Clear shows every game. Empty bars are disabled. Switching tabs or opening another player's games clears the filter. Legend: “Tap a bar to see those games · counted games this year.”

## Pass 4 (artifact comment, November 13, 2026: “this should be chart and then tabs for Singles and doubles and Fun and partial”)
- The Weekly performance chart moved above the tabs and shows on both tabs (it always counts singles and doubles). Order: page head, chart, tabs (Singles and doubles · Fun and partial), notices, the session list. Tapping a bar while on Fun and partial switches to Singles and doubles and filters there.

## Pass 5 (artifact comment, November 13, 2026, on the profile: “put the Weekly Performance here but the charts shouldn't be clickable · there should be a button like ‘go to your games’ · also put an indicator if seen in public”)
- The profile's right column shows the same Weekly performance card right after Leaderboard ranking, read-only: the bars are not buttons, the legend reads “Singles and doubles this year”, and a **See all games** button opens the Games page. On your own profile a chip next to the year says who can see the card: **Public** (accent, “Anyone who opens your profile can see this.”), **Signed-in players** (profile private) or **Only you** (always private). Other people's profiles show the card without the chip. The plot got 16 px of headroom so the count over the tallest bar never touches the win-rate pill.

## Pass 6 (artifact comment, November 13, 2026: “instead of saying weekly performance it should be like 2026 Weekly Performance”)
- The card title is the year plus the name, “2026 Weekly Performance” (the current calendar year), on the Games page and the profile; the separate year chip is gone (the visibility chip stays on your own profile).
