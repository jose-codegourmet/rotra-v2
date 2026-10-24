# 07 — Review System

## Overview

The Review System handles all post-match feedback. It serves two purposes:

1. **Skill ratings** — numeric 1–5 scores that feed into each player's rolling skill rating (see `06_skill_rating.md`)
2. **Behavioral record** — optional text reviews that form a player's reputation over time

Reviews are submitted within a **24-hour window** after a match is marked complete. They are separate from the match completion check — a match can be complete before all reviews are submitted.

---

## 7.1 Who Can Submit Reviews

| Reviewer | Reviews Who | Includes Score | Includes Text |
|----------|------------|----------------|---------------|
| Player (in the match) | Every other player in the same match | Yes (1–5) | Yes (optional, anonymous) |
| Que Master | Every player in the match | Yes (1–5) | Yes (optional, not anonymous) |
| Assigned Umpire | Every player in the match | Yes (1–5, optional) | No |
| Quick Umpire (logged in) | Every player in the match | Yes (1–5, optional) | No |
| Quick Umpire (guest / not logged in) | — | No | No |

* Umpire's **primary responsibility** is submitting the final score (required for match completion when assigned)
* Umpire skill rating submission is **optional** — they may skip it
* A **Quick Umpire who is not logged in** submits scores only — no review prompt is shown and no rating data is recorded
* Que Master's text note is attributed (not anonymous) — the reviewed player sees it was from the Que Master

---

## 7.2 Player → Player Reviews

### Skill Rating

* Submitted as a whole number from 1 to 5
* Not attributed to the submitter — shown only as part of the player's aggregate
* Cannot be submitted for yourself

### Text Review (Anonymous)

* Optional free-text field
* Character limit: 280 characters
* The reviewed player sees the text but **not who wrote it**
* Before a player views their text reviews, they must acknowledge a warning:
  > "These reviews were written by other players after matches and may contain critical feedback."
* After acknowledgment, reviews are shown — the acknowledgment is persistent (shown once per player)
* Text reviews are aggregated chronologically; there is no filter by match or author

### Submission Timing

* Prompt appears immediately after the match is marked complete
* Player can dismiss the prompt and return later (within the 24-hour window)
* A reminder notification is sent 2 hours before the window closes (see `15_notifications.md`)

---

## 7.3 Que Master Reviews

* Que Master rates each player in the match on a 1–5 scale
* Optional short note (up to 140 characters, not anonymous)
* Can be submitted at the time of finalization or any time within the 24-hour window
* Que Master's rating carries the **highest weight** (×3) in the skill calculation
* If the Que Master also participated as a player in the match, they can still submit ratings for other players — but their own player review scores are treated with standard weight

---

## 7.4 Umpire Reviews

There are two types of umpires, each with different review capabilities:

---

### 7.4.1 Assigned Umpire (Authenticated Session Participant)

* Must submit the **official final score** via the Umpire View — this is required to trigger match completion
* The scoring interface is described in `08_queue_session.md` §8.9
* After submitting the score, the umpire is prompted to optionally rate each player (1–5)
* Rating is optional; declining does not affect match completion status
* Umpire rating carries **high weight (×3)**, equivalent to Que Master
* The 24-hour review window applies — rating can be submitted after the prompt is dismissed

---

### 7.4.2 Quick Umpire — Logged In

A Quick Umpire who **has an active authenticated session** (i.e. was already logged in when they opened the Quick Umpire link) retains partial review capabilities:

* Can submit the official final score via the Umpire View
* After score submission, is prompted to optionally rate each player (1–5)
* Rating is **optional** and carries the same high weight (×3) as an Assigned Umpire
* Cannot submit text reviews
* The 24-hour review window applies

> The system detects the logged-in state at the time the Quick Umpire token is opened. If the user logs in *after* opening the link, review access is **not** retroactively granted for that session.

---

### 7.4.3 Quick Umpire — Guest (Not Logged In)

A Quick Umpire who opens the link **without an authenticated session**:

* Can score the match and submit the final score via the Umpire View
* **No review prompt is shown** after score submission
* No player ratings are recorded from this umpire
* Score is submitted directly to the Que Master (same notification flow)
* No review window opens; no EXP or rating impact from this umpire

```
Guest Quick Umpire Flow:
  Open link → Score match → Submit score → Done
  (No review step, no login prompt)
```

---

## 7.5 Review Moderation

### Profanity Filter

* Applied automatically when a text review is submitted
* Uses a configurable word blocklist (maintained by Admin)
* If the review fails the filter:
  * The submission is rejected with a clear error message
  * The player is prompted to edit and resubmit
  * The review is not saved in any form

### Flagging (Future — Phase 2)

* Players can flag a received review as inappropriate
* Flagged reviews are queued for Club Owner review
* Club Owner can dismiss the flag (keep the review) or remove it
* Admin can remove reviews platform-wide
* Repeated abusers can have review submission privileges suspended by Admin

---

## 7.6 Match Completion Logic

A match transitions from **In Progress** to **Complete** when all of the following are satisfied:

```
IF umpire is assigned to this match:
    umpire has submitted the final score

AND one of the following:
    all players in the match have submitted their reviews
    OR the Que Master has manually finalized the match
```

### Que Master Finalization

* Que Master can tap "Finalize Match" at any point after the umpire score is submitted (if applicable)
* This overrides the waiting-for-reviews condition and marks the match complete immediately
* Use case: players leave the venue without reviewing, or the session is running behind schedule
* Reviews can still be submitted after Que Master finalization (within the 24-hour window) — they update the skill ratings retroactively but do not change the match completion status

---

## 7.7 Match Completion Flow (Sequence)

### Standard (Assigned Umpire or Quick Umpire — Logged In)

```
1. Match ends on court (Umpire stops scoring / Que Master ends match)
2. Umpire taps "Submit Final Score" in the Umpire View
3. Score locked → Que Master notified
4. All players receive a review prompt in-app
5. 24-hour review window opens
6. Players, Que Master, and Umpire submit their reviews
7. One of:
      a. All players submit → match auto-completes
      b. Que Master taps "Finalize" → match force-completes
8. System updates:
      - Leaderboard (wins/losses recorded)
      - Player statistics (games played, win rate)
      - Skill ratings (ratings applied to rolling average)
      - EXP and MMR applied **only** for **club queue — MMR (competitive)** sessions (`14_gamification.md`); no match-based EXP/MMR for player-organized or Fun Games
9. Notification sent to all participants: "Match complete. Leaderboard updated."
```

### Quick Umpire — Guest (Not Logged In)

```
1. Match ends on court
2. Guest Quick Umpire taps "Submit Final Score" in the Umpire View
3. Score locked → Que Master notified
4. No review prompt shown to the Quick Umpire (guest — no account)
5. All players still receive their own review prompt in-app (unchanged)
6. 24-hour review window opens for players and Que Master only
7. Match completion logic proceeds normally (no umpire review expected)
8. System updates as in standard flow (leaderboard, stats, skill ratings; EXP/MMR only on MMR club schedules)
```

---

## 7.8 Review Data Model (Summary)

Each submitted review record contains:

| Field | Description |
|-------|-------------|
| Match ID | Which match this review belongs to |
| Reviewer ID | Who submitted it (null for guest Quick Umpire — no review record created) |
| Reviewed player ID | Who is being rated |
| Reviewer type | `player` / `que_master` / `umpire_assigned` / `umpire_quick_auth` |
| Skill rating | 1–5 (nullable — umpire may skip) |
| Text review | String (nullable — optional for player and Que Master types only) |
| Submitted at | Timestamp |
| Moderation status | `clean` / `flagged` / `removed` |

> Guest Quick Umpires do not produce a review record. Their score submission is stored on the match itself (not in the review table), attributed as `score_source: quick_umpire_guest`.
