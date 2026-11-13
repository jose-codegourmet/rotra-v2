# Privacy and contact: switches for profile stats and weekly performance

Status: IN MOCK APP — #822
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › viewAccount (Stats on your profile card), ACT.toggleStatsVis, ACT.toggleWeeklyVis, weeklyPerf, SHEETS.profileCard
Route: /player/profile/privacy-and-contact
Screen ID: P-PROFILE-PRIVACY
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: privacy-settings (two switches), weekly-performance-chart, participant-profile-card
Supersedes: none
Superseded by: none

## What changed
- Before: Latest stats and Weekly performance always showed to anyone who could see the profile.
- After: a **Stats on your profile** card at the top of Privacy and contact with two switches, both on by default: **Show my profile stats** and **Show my weekly performance**. Off hides that item from everyone else (profile card's Latest stats; the Weekly performance chart on the profile and Games page); the player still sees their own, and their chart's chip reads **Hidden**. Saved line and toasts confirm each change.
- Unchanged: rank, leaderboard, game list, profile visibility.

## Why
- Owner artifact comment, November 13, 2026: “please add a setting for showing weekly statistics and profile stats · they are on by default”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: both on (default), each off, viewed by the owner, by a signed-in player, by a visitor; profile card opened from the leaderboard, a club page and Queue.
- Copy: “Stats on your profile”, “Show my profile stats”, “Show my weekly performance”, helper lines, “Saved: …”, toasts, chip “Hidden”.
- Tokens: none
- Known differences: Queue's and Admin's profile cards should honour the stats switch too; their mock players don't carry the setting yet.

## Reuse plan
- Reuses as is: settings switch row.
- Database: proposed `show_profile_stats`, `show_weekly_performance` (identity.md); migration needed.

## Pass 2 (artifact comment, November 13, 2026: “clicking on public highlights the privacy setting for this”)
- The visibility chip on your own Weekly Performance card (Public / Signed-in players / Only you / Hidden) is a button: it opens Privacy and contact, scrolls to **Show my weekly performance**, outlines that row in the accent for about two seconds and puts focus on its switch. Tooltip and accessible name add “Change it in Privacy and contact”.
