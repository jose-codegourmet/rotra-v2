# Player app: notifications page and bell

Status: NEW
Date: 2026-11-16
App: player
Mockup: apps/mockup/player-app/rotra-player.html › topBar (bell), viewNotifs, allNotifs, seedNotifs, NOTIF_KIND
Route: /player/notifications
Screen ID: P-NOTIFICATIONS
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: notification-bell, notification-item, notification-list, segmented filter
Supersedes: none
Superseded by: none

## What changed
- **Top bar.** Signed in: a bell before the theme button with a red unread count (9+ above nine). Accessible name "Notifications, n unread".
- **P-NOTIFICATIONS (new).** Title "Notifications", "n unread" or "You're all caught up."; **All** / **Unread** filter; **Mark all as read**; groups **New** (last 24 hours and pinned) and **Earlier**.
  - Each item: round kind icon, kind label (ROTRA, Sessions, Invites, Clubs, Rank, Account), bold title, one-line body, time ("25 min ago", "Yesterday", "Until done" for pinned), unread dot. Unread items have the accent-subtle background; ROTRA announcements use the yellow announcement background whatever their read state.
  - Tapping marks it read and opens its page (session list, invite, games, rank, club page, Privacy and contact, Verification).
  - Empty: bell icon, "No notifications yet" / "No unread notifications", "Session updates, invites, club changes and messages from ROTRA show up here."
  - Footer: "Notifications stay for 90 days. Prototype: in the app only, no phone or email alerts yet."
- Sample notifications use events that already exist: spot confirmed, session invite, results published, waitlist place, rank updated, added to a club's saved players, contact change approved; plus the pinned verification announcement and "ROTRA Admin verified your account".

## Why
- Owner, November 16, 2026: "and also we should have a notifications module for player app".
- Decision: [D-2026-11-16-03](../mvp/decisions.md#d-2026-11-16-03).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: unread and read items, pinned announcement, All and Unread, all read (Mark all disabled), empty.
- Copy: as listed above, exactly as the mockup has it.
- Tokens: uses `--ann-bg`, `--ann-border`, `--ann-tag` from [2026-11-16-player-google-sign-in](2026-11-16-player-google-sign-in.md).
- Known differences: none.

## Reuse plan
- Reuses as is: the segmented control, chip, the card list styles.
- New: notification-bell, notification-item (no existing list row has a kind icon, time and unread dot together).
- Shares work with: [2026-11-16-player-account-verification](2026-11-16-player-account-verification.md).

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/notifications/README.md — new module.
- Database design: docs/database_design/product/player-information/modules/notifications.md — proposed table.
- Screen docs: docs/screens/product/modules/player-information/notifications.md — P-NOTIFICATIONS.

## Real app work
- The bell and page in apps/player, notification fixtures and hooks in packages/data, and (real mode) a notifications table written by the events above. Delivery beyond the app is open.
