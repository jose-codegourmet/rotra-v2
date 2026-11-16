# Player notifications

**Last verified:** 2026-11-16 · **Status:** Proposal, approved by the owner ([D-2026-11-16-03](../../../../../mvp/decisions.md#d-2026-11-16-03)); delivery and the final event list are open.

**Reference prototype:** [`rotra-player.html`](../../../../../../apps/mockup/player-app/rotra-player.html) › Notifications ([log](../../../../../mockup-changes/2026-11-16-player-notifications.md)).

## What a notification is

A short message to one signed-in player about something that already happened in ROTRA. It has a kind, a title, a one-line body, a time, a read flag and the page it opens. Notifications are private to the player.

| Kind | Label | Example events (all exist today) |
|---|---|---|
| ROTRA announcement | ROTRA | Messages from the platform owner, such as "Verify your ROTRA account" |
| Session | Sessions | Spot confirmed; on the waitlist (with the place); results published |
| Invite | Invites | Another player's session invite |
| Club | Clubs | Added to a club's saved players |
| Rank | Rank | The player's rank was updated |
| Account | Account | Contact change approved or declined; Admin verified the account |

## Rules

- Only signed-in players have notifications. The bell shows the unread count; opening a notification marks it read; **Mark all as read** marks all.
- A **ROTRA announcement** that asks the player to act (the verification one) is pinned at the top until the player has done it, then disappears. Announcements use the yellow announcement colours.
- Notifications describe events; they never change data. Opening one only navigates.
- A notification that points to something the player can no longer see (a session page that expired, a club they left) opens the nearest page that still exists.

## Open

- Delivery outside the app (phone push, email). In-app only for now.
- The final event list, and whether players can turn kinds off.
- Retention (the mockup says 90 days).
- Who writes ROTRA announcements and to whom (likely a new Admin screen).
