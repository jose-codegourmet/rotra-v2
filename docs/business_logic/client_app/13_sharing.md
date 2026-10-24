# 13 — Sharing

## Overview

Sharing allows players, Que Masters, and Club Owners to distribute app content externally — on social media, messaging apps, or printed materials. All shareable content generates a preview card and a stable URL.

---

## 13.1 Shareable Items

| Item | Who Can Share | Format |
|------|--------------|--------|
| Player profile | Anyone | Public URL + OG card |
| Match result | Any participant in the match | Image card + URL |
| Session leaderboard (live) | Any session participant | Live URL |
| Session leaderboard (snapshot) | Any session participant | Image + URL |
| Club leaderboard | Any club member | Live URL |
| Club invite link | Club Owner (when enabled) | Link + QR code |
| Session join link | Que Master | Link + QR code |

---

## 13.2 Share Formats

### Public URL

* A stable, permanent link to the item (e.g. `app.badminton.io/player/[id]`)
* Accessible without login for public items (player profiles, leaderboards)
* Private items (club invite link, session join link) require the link to be active

### Image Card

* Auto-generated shareable image (PNG)
* Optimized for social media and messaging apps
* Generated server-side (no app rendering required)
* Includes app branding and a scannable QR code

### Open Graph (OG) Preview

All shareable URLs include OG meta tags so they render as rich previews when pasted into:
* Facebook, Instagram DMs
* WhatsApp, Telegram, Viber
* iMessage, SMS (on supported platforms)

---

## 13.3 Content of Each Share Card

### Player Profile Card

* Player name + photo
* Tier badge + EXP level
* Playing level + skill rating (if enough data)
* Win rate + games played
* Tagline: "Check out [name]'s badminton profile"
* Link: `app.badminton.io/player/[id]`

### Match Result Card

* Match date and club
* Team A vs Team B (names + photos)
* Final score
* Result label (Win / Loss / Draw)
* Tagline: "Just played at [club]"
* Link: `app.badminton.io/match/[id]`

### Session Leaderboard Card

* Session date and club
* Top 3 players: name, photo, wins, win rate
* Tagline: "Session standings at [club]"
* "View full standings" QR / link

### Club Invite Card

* Club name + description
* Member count
* Call to action: "Join [club name] on Badminton App"
* QR code for the invite link

---

## 13.4 Share Flow (User-Facing)

1. User taps the Share button on any shareable item
2. App presents options:
   * Copy link
   * Share image (to system share sheet)
   * Download image
   * QR code (full-screen QR for scanning)
3. User picks their method and shares externally

The system share sheet uses the OS native share dialog (iOS Share Sheet, Android share intent), meaning the user can share to any installed app (WhatsApp, Messenger, etc.) without the app needing to integrate with each one individually.

---

## 13.5 Privacy Rules

| Item | Access |
|------|--------|
| Player profile URL | Public — accessible without login |
| Match result URL | Public — accessible without login |
| Session leaderboard (live) | Accessible to anyone with the link (no login required for viewing) |
| Club leaderboard | Accessible to anyone with the link |
| Club invite link | Active only when Club Owner enables it; access grants club membership flow |
| Session join link | Active only during open/active session; access grants session registration flow |

---

## 13.6 Link Expiry

| Link Type | Expires |
|-----------|---------|
| Player profile | Never |
| Match result | Never |
| Session leaderboard (live) | Becomes read-only snapshot when session closes |
| Club leaderboard | Never (always live) |
| Club invite link | When Club Owner disables or rotates it |
| Session join link | When session closes or is full |
