# Umpire App — 04 Score Submission

## Overview

Score submission is the final action in the Umpire App. It locks the score, notifies the Que Master, and triggers the match completion flow in the Client App. It cannot be undone by the umpire — only the Que Master can dispute or override a submitted score.

---

## Submission Flow

```
Umpire taps "Submit Final Score"
    ↓
Confirmation dialog appears:
    "Are you sure? Final score:
     Team A — [X]  vs  Team B — [Y]
     Sets: [A wins] – [B wins]"
    [Cancel]  [Confirm & Submit]
    ↓
Umpire taps "Confirm & Submit"
    ↓
Score is locked on the server
    ↓
Umpire App shows: "Score submitted. Thank you."
    ↓
[If authenticated] → Optional post-match player rating prompt appears
[If guest] → Session ends; no further action
    ↓
Que Master receives notification: "Score submitted for Court [X]"
    ↓
Match enters Review Phase in the Client App
    ↓
Session leaderboard updates with the result
```

---

## Confirmation Dialog

The dialog shows the full final score before locking it. The umpire must read and confirm — there is no auto-submit.

| Element | Purpose |
|---------|---------|
| Final score per team | Verify no mis-tap inflated a score |
| Set breakdown | Shows each set result (e.g. "21–18, 21–15") |
| Cancel | Returns to the scoring interface; no changes made |
| Confirm & Submit | Locks and sends the score |

If the umpire taps Cancel, they return to the active scoring interface and can continue scoring.

---

## What Gets Submitted

The submitted score record includes:

| Field | Value |
|-------|-------|
| Match ID | The unique match the token was scoped to |
| Final score | Point totals per team per set |
| Set breakdown | Per-set point totals (e.g. Set 1: 21–18, Set 2: 21–15) |
| Winner | Derived from set wins |
| Submitted by | Token ID (guest) or Player ID (authenticated) |
| Submitted at | UTC timestamp |
| Scoring method | `umpire_app` (distinguishes from Que Master manual entry) |

---

## After Submission

### For the Umpire

- The Umpire View becomes read-only — no further points can be added
- The umpire sees a confirmation screen with the final score
- If authenticated, they are offered the optional post-match player rating flow
- If guest, the session ends

### For the Que Master (Client App)

- Push notification: "Score submitted for Court [X]"
- The Court View card for that court updates to show the final score
- The match status transitions from `In Progress` → `Review Phase`
- The Que Master can now finalize the match or wait for player reviews

### For Players (Client App)

- The Courts tab updates the live score to the final result
- Players in the match receive the post-match review prompt
- The session leaderboard updates with the match result

---

## Score Lock Rules

Reference: RULE-024 in [`../client_app/18_canonical_rules.md`](../client_app/18_canonical_rules.md)

- Umpire scores are **final once submitted** — the umpire cannot edit or resubmit
- Only the Que Master can override or void a submitted score via the dispute flow in the Client App
- All score overrides are logged with the Que Master's identity and timestamp

---

## Score Disputes

If a submitted score is disputed:

```
Que Master opens the match detail in Client App
    ↓
Taps "Dispute Score"
    ↓
Options:
    a. Override score — Que Master enters the correct score manually
    b. Void match — match is marked Unscored; all stats excluded
    ↓
Action is logged with Que Master identity, timestamp, and reason
```

The umpire is not notified of a dispute — it is handled entirely within the Client App by the Que Master.

Reference: RULE-023, RULE-025 in [`../client_app/18_canonical_rules.md`](../client_app/18_canonical_rules.md)

---

## Optional Post-Match Rating (Authenticated Only)

After submitting the score, authenticated umpires are offered a rating prompt:

```
"Would you like to rate the players? (Optional)"
    ↓
For each player in the match:
    - Rate 1–5 per skill dimension (can skip any dimension)
    ↓
Ratings are submitted with umpire weight multiplier (×3)
    ↓
"Thanks! Ratings submitted."
```

- This prompt has a 24-hour window (same as the standard review window)
- Skipping the prompt entirely is fine — it has no consequence
- Guest umpires do not see this prompt

Reference: RULE-026, RULE-029 in [`../client_app/18_canonical_rules.md`](../client_app/18_canonical_rules.md)
