# 04 — Matches

## Overview

A **Match** is a single game between two teams within a Que Session. Matches are created by the Que Master (or Club Owner) from the Player Pool or from an approved **Request a Match**. They flow through: queued → active → completed (or voided).

> **Canonical Que Session rules:** [`../business_logic/client_app/08_queue_session.md`](../business_logic/client_app/08_queue_session.md) §18 Request a Match, Match Queue integration.

Two tables cover matches:

- `matches` — the match itself: teams, court, score, status, umpire assignment
- `match_players` — which players are in the match, their team, result, and whether they submitted a review

Related:

- `match_requests` — player proposals pending host approval (see [`03_queue_sessions.md`](./03_queue_sessions.md))

---

## Enums

```sql
CREATE TYPE match_status_enum AS ENUM ('queued', 'active', 'completed', 'voided');

CREATE TYPE team_enum AS ENUM ('team_a', 'team_b');

CREATE TYPE winning_team_enum AS ENUM ('team_a', 'team_b', 'draw');

CREATE TYPE match_result_enum AS ENUM ('win', 'loss', 'draw');
-- Deprecated: 'unscored' — use voided match status instead; do not use in new code
```

---

## Table: `matches`

```sql
CREATE TABLE matches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,

  -- Court assignment (1-indexed, based on session's num_courts)
  court_number int NOT NULL CHECK (court_number > 0),

  -- Optional umpire; a player in the session who is not playing this match
  umpire_id  uuid REFERENCES profiles(id),

  status         match_status_enum NOT NULL DEFAULT 'queued',

  -- Position in the queue (lower = earlier); used for drag-reorder display
  queue_position int NOT NULL DEFAULT 0,

  -- Score (NULL until submitted)
  team_a_score   int CHECK (team_a_score >= 0),
  team_b_score   int CHECK (team_b_score >= 0),
  winning_team   winning_team_enum,

  -- Who submitted the final score (umpire or Que Master)
  score_submitted_by uuid REFERENCES profiles(id),

  -- Finalization (Que Master override or natural completion)
  finalized_by uuid REFERENCES profiles(id),
  finalized_at timestamptz,

  -- Void support (reverses EXP and MMR)
  void_reason text,
  voided_by   uuid REFERENCES profiles(id),
  voided_at   timestamptz,

  started_at  timestamptz,
  ended_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### Notes

- `umpire_id` is optional. When no umpire is assigned, the Que Master submits the score manually (they become `score_submitted_by`).
- `queue_position` is managed by the application layer on drag-reorder. Unique per session but not enforced at the DB level (reordering updates multiple rows in a transaction).
- A match is **completed** (DB `status = 'completed'`) when:
  1. `umpire_id IS NOT NULL` → umpire must submit score first (`score_submitted_by = umpire_id`), AND
  2. All `match_players.review_submitted = true` OR the Que Master finalizes (`finalized_by IS NOT NULL`).

> **Product vs DB note:** Product glossary defines **Finalized** (score locked, reviews pending) and **Completed** (all reviews in) as distinct pre-terminal states. The current DB enum has only `completed`. A migration to add `finalized` or equivalent is **TBD** — see [`../business_logic/00_ubiquitous_language.md`](../business_logic/00_ubiquitous_language.md) §5.
- When `status = 'voided'`: all EXP and MMR transactions attributed to this match must be reversed. The application layer inserts compensating `exp_transactions` and `mmr_transactions` rows with `reason = 'match_voided_reversal'`.
- Voided matches are excluded from leaderboard and statistics queries.

### Match Lifecycle

```
queued ──► active ──► completed
              │
              └──► voided  (can void an active or completed match)
```

| Transition | Trigger |
|---|---|
| `queued → active` | Que Master starts the match (court assigned) |
| `active → completed` | Score submitted + finalization condition met |
| `active → voided` | Que Master voids the match |
| `completed → voided` | Que Master voids post-completion (reverses EXP/MMR) |

### Match Completion Rule (enforced at application layer)

```
IF umpire assigned:
    score_submitted_by = umpire_id  (required)

AND one of:
    all match_players.review_submitted = true
    OR finalized_by IS NOT NULL  (Que Master override)
```

### Indexes

```sql
CREATE INDEX idx_matches_session_id     ON matches(session_id);
CREATE INDEX idx_matches_status         ON matches(status);
CREATE INDEX idx_matches_umpire_id      ON matches(umpire_id);
CREATE INDEX idx_matches_queue_position ON matches(session_id, queue_position);
```

---

## Table: `match_players`

Junction table linking players to a match, recording which team they are on and the outcome.

```sql
CREATE TABLE match_players (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id  uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  team   team_enum NOT NULL,

  -- Populated when the match reaches 'completed' status
  result match_result_enum,

  -- Review tracking
  review_submitted    bool NOT NULL DEFAULT false,
  review_submitted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (match_id, player_id)
);
```

### Notes

- Each match has exactly **4 players** (doubles) or **2 players** (singles), split evenly across `team_a` and `team_b`. This is enforced at the application layer, not with a DB constraint (to allow flexibility for future formats).
- `result` is computed and written when the match reaches `completed`:
  - Players on the winning team → `'win'`
  - Players on the losing team → `'loss'`
  - Both teams same score → `'draw'` (edge case)
  - Match voided or no score submitted → `result` remains NULL; match `status = 'voided'`
- `review_submitted` is set to `true` when the player submits their `match_reviews` row for this match. The trigger that checks completion condition reads this column.
- Players can review all other players in the same match (cross-team). Each review is a separate row in `match_reviews`.

### Indexes

```sql
CREATE INDEX idx_match_players_match_id  ON match_players(match_id);
CREATE INDEX idx_match_players_player_id ON match_players(player_id);
CREATE INDEX idx_match_players_team      ON match_players(team);
CREATE INDEX idx_match_players_result    ON match_players(result);
```

---

## Table: `match_requests`

Player-initiated match proposals. See [`03_queue_sessions.md`](./03_queue_sessions.md) and [`08_queue_session.md`](../business_logic/client_app/08_queue_session.md) §18.

| Column | Purpose |
|--------|---------|
| `requesting_player_id` | Auto-included in lineup |
| `lineup_player_ids` | Full lineup (order-independent duplicate check) |
| `status` | pending → approved / modified_and_approved / declined / cancelled_by_player / invalidated → started → completed |
| `match_id` | Links to `matches` row when placed in Match Queue |

Approved requests follow normal `queue_position` ordering — no automatic front insertion.

---

## Matchmaking Decision Record

When a match is created via **Automatic Queueing**, persist enough snapshot data to audit and explain the decision even if Player ratings change later. Canonical rules: [`../business_logic/client_app/automatic_queueing.md`](../business_logic/client_app/automatic_queueing.md) §33–§35.

Exact schema placement is **TBD** — fields may extend `matches`, live in JSONB columns, or use companion tables (`match_aq_decisions`, `match_aq_player_snapshots`).

### Match-level fields (proposed)

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `aq_origin` | enum | `automatic`, `manual`, `player_request` |
| `aq_mode_used` | aq_mode_enum | Matchmaking mode at generation time |
| `aq_suitability_score` | int | Match Suitability Score (0–100) |
| `aq_predicted_probability_a` | numeric | Team A win probability |
| `aq_predicted_probability_b` | numeric | Team B win probability |
| `aq_prediction_confidence` | enum | `high`, `medium`, `low` |
| `aq_generated_at` | timestamptz | Candidate generation time |
| `aq_approved_at` | timestamptz | Que Master approval time |
| `aq_approved_by` | uuid | Approving Que Master |
| `aq_explanation` | jsonb | Human-readable explanation bullets |
| `aq_component_scores` | jsonb | Mode-specific score breakdown |
| `aq_warnings` | jsonb | Soft warnings at approval time |
| `aq_que_master_overrides` | jsonb | Overridden warnings with reason |
| `aq_alternatives_considered` | jsonb | Top alternatives snapshot (optional) |

### Per-Player snapshot at generation (proposed)

Stored per `match_players` row or in `match_aq_player_snapshots`:

| Field | Purpose |
| ----- | ------- |
| `aq_effective_strength` | Effective Strength at generation |
| `aq_rating_confidence` | Rating Confidence at generation |
| `aq_challenge_index` | Challenge Index at generation |
| `aq_queue_priority` | Queue Priority at generation |
| `aq_fatigue_score` | Fatigue and Readiness at generation |
| `aq_session_form` | Current Session Form adjustment |
| `aq_recent_form` | Recent Form adjustment |
| `aq_difficulty_history` | jsonb snapshot of Match Difficulty History |
| `aq_carry_role` | enum nullable: `carrier`, `development_player`, `none` |
| `aq_difficulty_result` | Per-Player difficulty classification for this match |

### Enum: `aq_origin_enum` (proposed)

```sql
CREATE TYPE aq_origin_enum AS ENUM ('automatic', 'manual', 'player_request');
```

Manual Queueing matches set `aq_origin = 'manual'` or leave AQ fields NULL. Player-request-approved matches set `aq_origin = 'player_request'`.

---

## Match History Queries

Match history visible on a player's profile is built from joins across:

```sql
SELECT
  m.id,
  m.started_at,
  qs.club_id,
  mp_self.team,
  mp_self.result,
  m.team_a_score,
  m.team_b_score,
  -- Opponents: same match, different team
  -- Partners: same match, same team, different player
FROM match_players mp_self
JOIN matches m ON m.id = mp_self.match_id
JOIN queue_sessions qs ON qs.id = m.session_id
WHERE mp_self.player_id = :player_id
  AND m.status = 'completed'
ORDER BY m.started_at DESC;
```

---

## Realtime Subscriptions

`matches` is published to Supabase Realtime for:
- Que Master: full match state (queue, scores, status)
- Players: read-only view of courts and queue
- Umpires: their assigned match only

See `09_rls_and_realtime.md` for full publication config.

---

## Relationships

```
queue_sessions ──► match_requests (1:many)
queue_sessions ──► matches (1:many)
profiles ──► matches (via umpire_id, 1:many optional)
profiles ──► matches (via finalized_by, voided_by, score_submitted_by)
matches ──► match_players (1:many, typically 4)
profiles ──► match_players (1:many)
matches ──► match_reviews (1:many) [see 05_reviews_and_ratings.md]
matches ──► exp_transactions (1:many) [see 06_gamification.md]
matches ──► mmr_transactions (1:many) [see 06_gamification.md]
```
