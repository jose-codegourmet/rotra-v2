# 06 — Gamification

## Overview

ROTRA's gamification layer consists of:
- **EXP** (Experience Points) — a cosmetic accumulation currency that drives tier badges. EXP can increase or decrease on MMR sessions; voided matches reverse their EXP.
- **MMR** (Matchmaking Rating) — a competitive ladder rating that moves only on `club_queue` sessions with `schedule_type = 'mmr'`. MMR uses asymmetric mixed-rank rules.
- **Ranking Tier Config** — Admin-managed EXP thresholds for each tier badge. No code deploy needed to adjust.
- **Sandbagging Flags** — system-detected records when a player's self-assessment diverges significantly from their external peer ratings.

Both EXP and MMR are stored as **append-only ledger tables** (one row per transaction). The player's current totals are cached in `profiles.exp_total` and `profiles.mmr` for fast reads. Voided matches are reversed by inserting a compensating negative transaction — the historical rows are never deleted.

---

## Enums

```sql
CREATE TYPE exp_reason_enum AS ENUM (
  'match_played',
  'match_won',
  'review_submitted',
  'high_rating_received',   -- rated 4 or 5 by opponents
  'umpire_duty',
  'profile_completed',
  'session_attended',
  'match_voided_reversal'   -- compensating entry when a match is voided
);

CREATE TYPE mmr_reason_enum AS ENUM (
  'match_won',
  'match_lost',
  'match_voided_reversal'
);

CREATE TYPE flag_status_enum AS ENUM ('active', 'resolved');
```

---

## Table: `exp_transactions`

Append-only ledger. One or more rows are inserted per qualifying action. Never updated or deleted.

```sql
CREATE TABLE exp_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Positive = gain, negative = loss (e.g. -10 on a voided match win)
  amount     int NOT NULL,

  reason     exp_reason_enum NOT NULL,

  -- Optional references for traceability
  match_id   uuid REFERENCES matches(id) ON DELETE SET NULL,
  session_id uuid REFERENCES queue_sessions(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);
```

### EXP Award Table (MVP baseline — configurable via `platform_config`)

| Reason | Amount | Eligibility |
|---|---|---|
| `session_attended` | +5 | All session types |
| `match_played` | +10 | MMR club queue only |
| `match_won` | +15 | MMR club queue only |
| `review_submitted` | +5 | All session types |
| `high_rating_received` | +5 | All session types |
| `umpire_duty` | +8 | All session types |
| `profile_completed` | +20 | One-time |
| `match_voided_reversal` | -(original award) | MMR club queue only |

### Notes

- After each insert, a database trigger (or server function) updates `profiles.exp_total` by adding `amount`.
- `profile_completed` is a one-time bonus, enforced by `profiles.profile_completed_bonus_claimed`.
- On an MMR session, **losses can also reduce EXP** — a `match_played` row is still inserted (+10), but an additional negative row may be inserted based on the loss-penalty rules. **TODO: define the exact loss-penalty formula and amounts (e.g. does losing deduct a flat amount, or is it tied to the MMR delta multiplier?).**
- Voiding a match: for every `exp_transactions` row tied to `match_id`, a compensating row is inserted with `amount = -original_amount` and `reason = 'match_voided_reversal'`.

### Trigger: update profiles.exp_total

```sql
CREATE OR REPLACE FUNCTION update_exp_total()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET exp_total = exp_total + NEW.amount,
      updated_at = now()
  WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_exp_transaction_insert
  AFTER INSERT ON exp_transactions
  FOR EACH ROW EXECUTE FUNCTION update_exp_total();
```

### Indexes

```sql
CREATE INDEX idx_exp_transactions_player_id  ON exp_transactions(player_id);
CREATE INDEX idx_exp_transactions_match_id   ON exp_transactions(match_id);
CREATE INDEX idx_exp_transactions_session_id ON exp_transactions(session_id);
CREATE INDEX idx_exp_transactions_reason     ON exp_transactions(reason);
CREATE INDEX idx_exp_transactions_created_at ON exp_transactions(created_at DESC);
```

---

## Table: `mmr_transactions`

Append-only MMR ledger. Only inserted for `club_queue` sessions with `schedule_type = 'mmr'`.

```sql
CREATE TABLE mmr_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Positive = gain, negative = loss
  amount     int NOT NULL,

  reason     mmr_reason_enum NOT NULL,

  match_id   uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Snapshot of MMR before and after this transaction (for history display)
  pre_mmr    int NOT NULL,
  post_mmr   int NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Asymmetric Mixed-Rank MMR Rules

When teammates have a significant MMR difference (configurable threshold in `platform_config`):

| Scenario | Lower-rated player | Higher-rated player |
|---|---|---|
| Win | Gains less MMR | Gains more MMR |
| Loss | Loses more MMR | Loses less MMR |

The exact delta multipliers are stored in `platform_config` under key `mmr_asymmetry_config`.

### Notes

- After each insert, a trigger updates `profiles.mmr` by adding `amount`.
- `pre_mmr` and `post_mmr` enable a full MMR history graph on the player's profile.
- Minimum MMR floor is `0` (enforced at application layer — a negative delta that would go below 0 is capped).
- `match_id` uses `ON DELETE CASCADE` intentionally. **Design assumption: matches are never hard-deleted — only set to `status = 'voided'`. If a match were ever hard-deleted, all its MMR transaction rows (including reversal rows) would cascade-delete, leaving `profiles.mmr` silently wrong.** To make this assumption explicit at the DB level, consider `ON DELETE RESTRICT` in a future migration.

### Trigger: update profiles.mmr

```sql
CREATE OR REPLACE FUNCTION update_mmr()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET mmr = mmr + NEW.amount,
      updated_at = now()
  WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_mmr_transaction_insert
  AFTER INSERT ON mmr_transactions
  FOR EACH ROW EXECUTE FUNCTION update_mmr();
```

### Indexes

```sql
CREATE INDEX idx_mmr_transactions_player_id  ON mmr_transactions(player_id);
CREATE INDEX idx_mmr_transactions_match_id   ON mmr_transactions(match_id);
CREATE INDEX idx_mmr_transactions_created_at ON mmr_transactions(created_at DESC);
```

---

## Table: `ranking_tier_config`

Admin-managed EXP thresholds for each tier. Ordered by `min_exp` ascending. No code deploy needed to change thresholds or add tiers.

```sql
CREATE TABLE ranking_tier_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name   text NOT NULL UNIQUE,   -- e.g. 'shuttle_bird', 'rally_rookie'
  label       text NOT NULL,          -- display name, e.g. 'Shuttle Bird'
  min_exp     int NOT NULL,           -- EXP threshold to reach this tier
  badge_label text NOT NULL,          -- e.g. 'Default', 'Bronze', 'Diamond'

  -- Display order (lower = lower tier)
  sort_order  int NOT NULL DEFAULT 0,

  updated_by  uuid REFERENCES profiles(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### Seed Data

```sql
INSERT INTO ranking_tier_config (tier_name, label, min_exp, badge_label, sort_order) VALUES
  ('shuttle_bird',  'Shuttle Bird',  0,    'Default',  1),
  ('rally_rookie',  'Rally Rookie',  100,  'Bronze',   2),
  ('net_fighter',   'Net Fighter',   300,  'Silver',   3),
  ('court_ace',     'Court Ace',     600,  'Gold',     4),
  ('smash_legend',  'Smash Legend',  1000, 'Platinum', 5),
  ('elite_master',  'Elite Master',  2000, 'Diamond',  6);
```

### Player Tier Resolution

The player's current tier is resolved at query time:

```sql
SELECT tier_name, label, badge_label
FROM ranking_tier_config
WHERE min_exp <= :player_exp_total
ORDER BY min_exp DESC
LIMIT 1;
```

---

## Table: `sandbagging_flags`

System-detected records when a player appears to be deliberately maintaining a lower skill rating.

```sql
CREATE TABLE sandbagging_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Optional: flag may be scoped to a specific club context
  club_id     uuid REFERENCES clubs(id) ON DELETE SET NULL,

  -- Human-readable explanation of the detection signal
  reason      text NOT NULL,

  status      flag_status_enum NOT NULL DEFAULT 'active',

  -- Resolution (filled when Que Master or Admin resolves)
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolution_note text,

  detected_at timestamptz NOT NULL DEFAULT now()
);
```

### Detection Signals (Application Layer)

A flag is inserted when **any two or more** of these signals are true for a player:

| Signal | Threshold |
|---|---|
| Win rate vs. higher-rated opponents | Win rate > 60% against players with MMR ≥ 200 higher |
| External ratings vs. self-assessment | Average external rating > self-assessment by ≥ 1.5 points on any dimension |
| Rating trend divergence | External trend ascending while self-assessment unchanged |

> **Deferred signal — Historical yo-yo pattern:** Detecting deliberate score-lowering over time (e.g. player repeatedly lowers their own self-assessment after MMR rises) requires a `player_self_assessment_history` audit table that does not exist in the current schema. This signal is deferred to a future phase. When implemented, it would track old vs. new self-assessment values on each update and flag repeated deliberate drops.

Active flags are visible to Que Masters and Club Owners on the player's profile card in the queue pool.

### Indexes

```sql
CREATE INDEX idx_sandbagging_player_id ON sandbagging_flags(player_id);
CREATE INDEX idx_sandbagging_status    ON sandbagging_flags(status);
CREATE INDEX idx_sandbagging_club_id   ON sandbagging_flags(club_id);
```

---

## Relationships

```
profiles ──► exp_transactions (1:many)
matches  ──► exp_transactions (1:many)
queue_sessions ──► exp_transactions (1:many)

profiles ──► mmr_transactions (1:many)
matches  ──► mmr_transactions (1:many)

profiles ──► sandbagging_flags (1:many)
clubs    ──► sandbagging_flags (1:many, optional context)
```
