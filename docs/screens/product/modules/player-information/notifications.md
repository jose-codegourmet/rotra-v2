# Player notifications

**Surfaces:** `P-NOTIFICATIONS` and the top-bar bell. **Source:** [notifications module](../../../../business_logic/product/player-information/modules/notifications/README.md), [D-2026-11-16-03](../../../../mvp/decisions.md#d-2026-11-16-03). Mockup log: [2026-11-16-player-notifications](../../../../mockup-changes/2026-11-16-player-notifications.md).

## Bell

Signed in only, in the top bar before the theme button. A red count badge shows unread notifications ("9+" above nine); none when all are read. Accessible name "Notifications" or "Notifications, n unread". Current page when on `/notifications`.

## P-NOTIFICATIONS — `/notifications`

- Header: "Notifications", then "n unread" or "You're all caught up."
- Controls: segmented **All** / **Unread**; **Mark all as read** (disabled when nothing is unread; toast "All marked as read").
- Groups: **New** (pinned announcements and the last 24 hours) and **Earlier**, each a card list.
- Item: round kind icon; kind label ("ROTRA", "Sessions", "Invites", "Clubs", "Rank", "Account", plus " · Pinned"); bold title; one-line body; time ("Just now", "25 min ago", "3 h ago", "Yesterday", "4 days ago"; "Until done" for pinned); a dot while unread. Unread items have the accent-subtle background; ROTRA announcements always use `--ann-bg`. Tapping marks it read and opens its page.
- Empty: bell icon, "No notifications yet" (All) or "No unread notifications" (Unread), "Session updates, invites, club changes and messages from ROTRA show up here."
- Footer: "Notifications stay for 90 days." (placeholder retention).
- Signed out: P-LOGIN, then back here.

## Owner decisions — November 18, 2026

- Use the standard Player loading and error states for the page.
- While the bell count loads or fails, keep the bell link available and hide the count.
- Notifications remain visible for 90 days; automatic database deletion remains deferred.
- Implementation waits for account verification epic #889 rather than adding a stand-in verification state.
