# 15 — Notifications

## Overview

Notifications keep players, Que Masters, umpires, and Club Owners informed of relevant events without requiring them to have the app open. All notifications are in-app (push notifications where enabled). Email notifications are a future consideration.

> **Canonical Que Session notification list:** See [`08_queue_session.md`](./08_queue_session.md) §27. Every session change appears in the Session Feed; the events below **also** trigger push/in-app notifications where listed.

---

## 15.1 Notification Categories

| Category | Audience | Timing |
|----------|---------|--------|
| Session reminders | Accepted players | Before session starts |
| Session status changes | Registered players (Pending + Accepted + Waitlisted) | On postpone, cancellation, or material field change |
| In-session events | Players, Que Masters, Umpires | During active session |
| Post-session | All session participants | After session ends |
| Club events | Club members | As events occur |
| Review reminders | Match participants | Within 24-hour review window |
| System / account | Player | On account-level events (including level-up) |

---

## 15.2 Session Reminders

Sent to all **Accepted** players before the session's configured start time.

| Trigger | Message | Recipient |
|---------|---------|-----------|
| 2 hours before start | "Your session at [venue] starts in 2 hours. Get ready!" | Accepted players |
| 1 hour before start | "1 hour until your session at [venue]. See you on the court!" | Accepted players |
| 30 minutes before start | "Your session starts in 30 minutes. Head over to [venue]." | Accepted players |
| 5 minutes before start | "Your session is about to start. Head to the court!" | Accepted players |
| Session opens (start time) | "Your session at [venue] has started. Mark yourself as 'I Am In' when you arrive." | Accepted players |
| Session postponed | "The session at [venue] on [original date/time] has been moved to [new date/time]. Your spot is still reserved." | All registered players (Pending + Accepted + Waitlisted) |
| Session cancelled | "The session at [venue] on [date] has been cancelled by the host." | All registered players (Pending + Accepted + Waitlisted) |
| Date change (while registered) | "The session at [venue] has been rescheduled to [new date]." | Pending + Accepted + Waitlisted |
| Start time change | "The session at [venue] now starts at [new time]." | Pending + Accepted + Waitlisted |
| Venue change | "The session at [venue] has moved to [new venue]." | Pending + Accepted + Waitlisted |
| Slot reduction | "Session capacity at [venue] has been reduced. [Details if affected]." | Affected players + Pending + Accepted + Waitlisted |
| Courts count change | "The number of courts for [venue] on [date] has changed to [N]." | Pending + Accepted + Waitlisted |
| Allowed skill levels change | "Skill eligibility for [venue] on [date] has been updated." | Pending + Accepted + Waitlisted |
| Player removed from session | "You have been removed from the session at [venue] on [date]." | Removed player |

* Reminders are sent based on session start time, not when the player arrives
* If a player exits (or is removed) before the session starts, their scheduled reminders are cancelled
* If a session is postponed or cancelled, all pending pre-session reminders are cancelled and the relevant notice is sent immediately
* **Postpone rules** (who may postpone, from which states): **TBD** — see [`08_queue_session.md`](./08_queue_session.md) §37
* **Cancellation context:** Players who cancel their own registration after the 5-hour cutoff remain financially obligated; no automatic refund notification — see [`08_queue_session.md`](./08_queue_session.md) §14

---

## 15.2a Admission & Waitlist Notifications

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Join request submitted | Host(s) | "[Player] requested to join [session] at [venue]." |
| Join request approved | Requesting player | "You're in! Your request for [venue] on [date] was approved." |
| Join request declined | Requesting player | "Your request to join [venue] on [date] was not approved." |
| Player moved to waitlist (approval while full) | Player | "You're on the waitlist for [venue] on [date]. We'll notify you if a spot opens." |
| Waitlisted — asked to confirm slot | Waitlisted player | "A spot opened at [venue]! Confirm within [time] to secure your place." |
| Waitlisted — promoted (manual) | Promoted player | "You're in! You've been accepted into the session at [venue]." |
| Waitlist confirmation timeout | Player who timed out | "Your spot at [venue] was offered to the next player on the waitlist." |
| Session becomes Active | Accepted (+ Waitlisted per live-view rules) | "Your session at [venue] is now live." |

---

## 15.2b Match Request Notifications

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Match request approved | Requesting player | "Your match request for [venue] was approved." |
| Match request modified and approved | Requesting player | "Your match request was approved with lineup changes." |
| Match request declined | Requesting player | "Your match request for [venue] was declined." |
| Match request invalidated | Requesting player | "Your match request is no longer valid." |
| Match request cancelled by player | Host(s) | "[Player] cancelled their match request." |
| Player assigned to match (from request or queue) | Assigned players | "You're up next on Court [X]. Get ready!" |

See [`08_queue_session.md`](./08_queue_session.md) §18.

---

## 15.3 In-Session Notifications

Sent during an active Que Session.

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Player added to next queued match | Both players in the match | "You're up next on Court [X]. Get ready!" |
| Match starts (court becomes active) | All players in the match | "Your match on Court [X] has started." |
| Umpire assigned to a match | Umpire | "You've been assigned to umpire the next match on Court [X]." |
| Score reaches 90% threshold (smart monitoring) | Que Master | "Match on Court [X] is nearing its end. Prepare the next match." |
| Match ends (score submitted) | All match participants | "Your match is complete. Submit your review now." |
| Match completed (all reviews in or finalized) | All match participants | "Match finalized. Check the leaderboard." |
| Waitlisted player promoted to Accepted | Promoted player | "A spot opened up! You've been accepted into the session at [venue]." |
| Waitlisted player asked to confirm (auto promotion) | Waitlisted player | "A spot opened at [venue]! Confirm within [time] to secure your place." |
| Waitlisted player not promoted (session ended) | Waitlisted player | "The session at [venue] has ended. Unfortunately, a slot did not open up for you this time." |
| Player removed from session | Removed player | "You have been removed from the session at [venue] on [date]." |
| Payment status confirmed | Player | "Your payment for [venue] on [date] has been confirmed." |
| Session Feed manual announcement | Players with Lobby access | "[Announcement title]: [preview]" |
| Player's status set to Suspended | Suspended player | "Your participation has been temporarily suspended by the Que Master." |
| Payment reminder — automatic (player has not paid and session is within 24 hours) | Unpaid player | "You have an outstanding fee for the session at [venue] on [date]. Please settle before the session." |
| Payment reminder — manual (Que Master triggers) | Specific player | "Please settle your session fee for today's session at [venue]." |
| No-show reminder (optional, host only) | Que Master | "Player [name] has not marked I Am In. Session started [X] minutes ago." |

---

## 15.4 Post-Session Notifications

Sent after the session is marked Completed.

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Session ends / Que Master closes session | All session participants | "Session at [venue] has ended. View the final leaderboard." |
| Session leaderboard published | All session participants | "Final standings for [session date] at [venue] are live. See your rank." |
| Review window closing (2 hours remaining) | Players with unsubmitted reviews | "2 hours left to submit your match reviews. Don't miss your EXP bonus." |
| Review window closed | Players who did not submit | "The review window has closed." |
| EXP awarded | Player | "You earned [X] EXP from today's session." |

---

## 15.5 Club Event Notifications

Sent when club-level events occur.

| Trigger | Recipient | Message |
|---------|-----------|---------|
| New join request | Club Owner | "[Player name] has requested to join [club name]. Review their request." |
| Join request approved | Requesting player | "Your request to join [club name] has been approved. Welcome!" |
| Join request rejected | Requesting player | "Your request to join [club name] was not approved." |
| Direct invite received | Invited player | "[Club name] has invited you to join. Accept or decline." |
| Que Master role assigned | Assigned player | "You've been made a Que Master for [club name]. You can now host sessions." |
| Que Master role revoked | Player | "Your Que Master role for [club name] has been removed." |
| Removed from club | Removed player | "You have been removed from [club name]." |
| New session created | Club members | "[Host name] has created a new session at [venue] on [date]. Join now." (Club Owner or Que Master host) |

---

## 15.6 Review & Rating Notifications

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Review prompt (post-match) | All match participants | "How was your match? Submit your reviews and ratings now." |
| Received high rating (4 or 5 from opponent) | Player | "An opponent rated your performance highly. +5 EXP bonus." |
| Review window reminder | Participants with pending reviews | "2 hours left to submit your review for [match date] at [club]." |

---

## 15.7 System / Account Notifications

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Club application approved | Player | "Your club application was approved. [Club name] is ready." (`club_application_approved`) |
| Club application rejected | Player | "Your club application was not approved." Includes reason summary (`club_application_rejected`) |
| Club application SLA timeout | Player | Auto-rejected pending application after 24h without review (`club_application_rejected`) |
| Club closed (archived) | All members of that club | "[Club name] has been closed." (`club_closed`) |
| Demotion / ownership ended | Former owner | Ownership ended for that club (`club_demotion_completed`) |
| Complaint submitted (optional receipt) | Reporter | "We received your report." (`complaint_submitted` — no follow-up on resolution) |
| Player levels up (tier upgrade) | Player | "You've leveled up to [new tier]! Your rating has reached a new milestone." |
| Sandbagging flag applied | Player | "Your displayed playing level has been adjusted by the system based on match data." |
| Sandbagging flag cleared | Player | "Your playing level display has been restored to your self-declared level." |
| Account suspended (future) | Player | "Your account has been suspended. Contact support." |

---

## 15.8 Notification Preferences (Future — Phase 3)

Players will be able to configure:

| Setting | Options |
|---------|---------|
| Session reminders | All / 1 hour only / None |
| In-session match alerts | On / Off |
| Club event notifications | All / Join-related only / None |
| Review reminders | On / Off |
| EXP and tier updates | On / Off |

Until preference controls are available, all notifications are sent to all eligible recipients.

---

## 15.9 Notification Delivery

| Platform | Delivery Method |
|----------|----------------|
| iOS | Apple Push Notification Service (APNs) |
| Android | Firebase Cloud Messaging (FCM) |
| Web (future) | Web Push API |

* Notifications require the user to grant push notification permission on first launch
* If permission is denied, users receive in-app banners only (visible when the app is open)
* Notification state is tracked server-side — unread notifications are shown in an in-app notification center
