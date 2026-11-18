# Player notifications

**Last verified:** 2026-11-18 · **Status:** Mock and real modes implemented in source. See [D-2026-11-16-03](../../../../../mvp/decisions.md#d-2026-11-16-03).

**Reference prototype:** [`rotra-player.html`](../../../../../../apps/mockup/player-app/rotra-player.html) › Notifications ([log](../../../../../mockup-changes/2026-11-16-player-notifications.md)).

## What a notification is

A short message to one signed-in player about something that already happened in ROTRA. It has a kind, a title, a one-line body, a time, a read flag and the page it opens. Notifications are private to the player.

| Kind | Label | Example events |
|---|---|---|
| ROTRA announcement | ROTRA | Messages from the platform owner, such as "Verify your ROTRA account" |
| Session | Sessions | Spot confirmed; on the waitlist (with the place); results published |
| Invite | Invites | Another player's session invite (mock only) |
| Club | Clubs | Added to a club's saved players |
| Rank | Rank | The player's rank was updated |
| Account | Account | Contact change approved or declined; Admin verified the account |

## Rules

- Only signed-in players have notifications. The bell shows the unread count; opening a notification marks it read; **Mark all as read** marks all.
- A **ROTRA announcement** that asks the player to act (the verification one) is pinned at the top until the player has done it, then disappears. Announcements use the yellow announcement colours.
- Opening one saves its read time and opens its destination. A contact approval message describes the review decision while application may still be pending. Rank messages open the current rank evidence, including a provisional rank.
- A notification that points to something the player can no longer see (a session page that expired, a club they left) opens the nearest page that still exists.

## Owner decisions — November 18, 2026

- Real mode covers seven events: spot confirmed, waitlist place, results published, rank updated, added to a club's saved players, contact-change review, and Admin verified the account. The owner deferred the session-invite notification on November 18, 2026: current links have no recipient and real invite-code creation is absent. The prototype invite sample remains in mock mode.
- Notifications remain visible for 90 days. This is a read visibility window, not authorization to delete stored notifications. Automatic deletion is deferred.
- Only the derived verification reminder is in this epic. Free-text announcement publishing is deferred.
- Notifications use the account verification state from merged epic #889; no stand-in verification state.

## Open

- Delivery outside the app (phone push, email). In-app only for now.
- Whether players can turn kinds off.
- Automatic deletion and its jobs implementation.
- Free-text announcement authors and audiences, for a future epic.
