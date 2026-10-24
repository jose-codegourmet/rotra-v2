# 05 — Reviews & Ratings

## Overview

The skill rating system is built around 6 observable dimensions, each rated 1–5 independently after a match. Ratings from different sources carry different weights. A rolling weighted average per dimension produces each player's displayed skill rating.

This file covers:
- `skill_dimensions` — admin-managed catalog of rating dimensions and their sub-skills
- `match_reviews` — one review per reviewer-reviewee pair per match (contains text + triggers rating rows)
- `match_review_ratings` — per-dimension scores within a single review
- `player_skill_ratings` — the computed rolling aggregate per player per dimension

---

## Enums

```sql
CREATE TYPE reviewer_role_enum AS ENUM ('player', 'que_master', 'umpire');
```

---

## Source Weights

These weights are applied in the rating calculation. They are documented here for reference and stored in `platform_config` for Admin configurability (no code deploy needed to adjust).

| Source | Role Enum Value | Weight |
|---|---|---|
| Que Master | `que_master` | ×3 |
| Umpire | `umpire` | ×3 |
| Opponent | `player` (opposing team) | ×2 |
| Partner | `player` (same team) | ×1.5 |
| Self-assessment | (from `player_self_assessments`) | ×1 (phases out after 5 external ratings) |

---

## Table: `skill_dimensions`

Admin-managed catalog of the 6 skill dimensions and their observable sub-skills. No code deploy needed to add or modify dimensions.

```sql
CREATE TABLE skill_dimensions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,  -- machine key, e.g. 'attack'
  label       text NOT NULL,         -- display label, e.g. 'Attack'
  description text,

  -- JSONB array of sub-skill names for display and guidance
  -- e.g. ["Smash", "Half Smash", "Jump Smash", "Drive", "Backhand Smash"]
  sub_skills  jsonb NOT NULL DEFAULT '[]',

  -- Relative importance in overall weighted average (default 1.0 = equal weight)
  weight      numeric(4, 2) NOT NULL DEFAULT 1.0,

  is_active   bool NOT NULL DEFAULT true,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### Seed Data (Phase 1)

```sql
INSERT INTO skill_dimensions (name, label, sub_skills) VALUES
  ('attack',      'Attack',              '["Smash","Half Smash","Jump Smash","Cross Smash","Drive","Cross Drive","Backhand Smash"]'),
  ('defense',     'Defense',             '["Clear","Backhand","Backhand Clear"]'),
  ('net_touch',   'Net & Touch',         '["Net Play","Setting","Push","Drop","Backhand Drop"]'),
  ('precision',   'Precision & Control', '["Slice","Backhand Slice","Cross Drop","Placing","Deception"]'),
  ('athleticism', 'Athleticism',         '["Footwork","Anticipation"]'),
  ('game_iq',     'Game Intelligence',   '["Critical Thinking","Teamwork","Deception","Placing"]');
```

### Notes

- Raters may **skip any dimension** they did not observe. Skipped dimensions are excluded from the average for that match — they are not counted as 0.
- Deactivated dimensions (`is_active = false`) are hidden from the review UI but their existing data is preserved.

### Indexes

```sql
CREATE INDEX idx_skill_dimensions_active ON skill_dimensions(is_active);
```

---

## Table: `match_reviews`

One row per (reviewer, reviewee) pair per match. A player in a 4-player doubles match can submit up to 3 reviews (for each other player). A Que Master can submit one review per player in the match.

```sql
CREATE TABLE match_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  reviewer_role reviewer_role_enum NOT NULL,

  -- Optional free-text review
  text_review text,

  -- Anonymous to the reviewee (they see the text but not who wrote it)
  -- Always true for player-to-player; false for que_master reviews
  is_anonymous bool NOT NULL DEFAULT true,

  -- Set by the profanity filter; flagged reviews are not surfaced
  profanity_flagged bool NOT NULL DEFAULT false,

  submitted_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (match_id, reviewer_id, reviewee_id),

  -- A reviewer cannot review themselves
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewee_id)
);
```

### Notes

- `is_anonymous = true` for all `player` role reviews. Que Master reviews have `is_anonymous = false` (they can add a note that the player can see with attribution).
- The 24-hour submission window is enforced at the application layer by comparing `submitted_at` against `matches.ended_at`. Rows submitted outside the window are rejected before insertion.
- When all `match_review_ratings` for a review are inserted, the `player_skill_ratings` aggregate is updated via a server-side function (not a trigger — to keep Supabase Realtime overhead low).
- `profanity_flagged` is set synchronously on insert by the application layer's profanity filter. Flagged text is stored but not displayed.
- **`reviewer_role = 'que_master'` does NOT grant special review access on its own.** A Que Master can only submit a review if they are also in `match_players` for that match (playing) or are the `umpire_id`. The `reviewer_role` field determines the *weight* of the rating, not the eligibility to submit. This is enforced by the RLS INSERT policy which checks `match_players` and `umpire_id` only.

### Indexes

```sql
CREATE INDEX idx_match_reviews_match_id    ON match_reviews(match_id);
CREATE INDEX idx_match_reviews_reviewer_id ON match_reviews(reviewer_id);
CREATE INDEX idx_match_reviews_reviewee_id ON match_reviews(reviewee_id);
CREATE INDEX idx_match_reviews_submitted_at ON match_reviews(submitted_at);
```

---

## Table: `match_review_ratings`

Per-dimension scores within a single review. A reviewer rates only the dimensions they observed; skipped dimensions have no row here.

```sql
CREATE TABLE match_review_ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES match_reviews(id) ON DELETE CASCADE,
  dimension_id uuid NOT NULL REFERENCES skill_dimensions(id) ON DELETE CASCADE,

  -- 1–5 scale
  score        int NOT NULL CHECK (score BETWEEN 1 AND 5),

  UNIQUE (review_id, dimension_id)
);
```

### Notes

- Absence of a row for a dimension = reviewer skipped that dimension (not rated as 0).
- After all rows for a review are inserted, a server function recalculates `player_skill_ratings` for the reviewee for each dimension that was rated.

### Indexes

```sql
CREATE INDEX idx_review_ratings_review_id    ON match_review_ratings(review_id);
CREATE INDEX idx_review_ratings_dimension_id ON match_review_ratings(dimension_id);
```

---

## Table: `player_skill_ratings`

Cached per-player, per-dimension weighted aggregate. Updated by a server-side function whenever new `match_review_ratings` rows are inserted for that player.

```sql
CREATE TABLE player_skill_ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dimension_id uuid NOT NULL REFERENCES skill_dimensions(id) ON DELETE CASCADE,

  -- Weighted rolling average (1.0–5.0, rounded to 1 decimal for display)
  current_rating numeric(3, 1) NOT NULL DEFAULT 0,

  -- Total number of external ratings received for this dimension
  -- Used to determine self-assessment phase-out (≥5 = phase out self-assessment weight)
  rating_count int NOT NULL DEFAULT 0,

  last_updated timestamptz NOT NULL DEFAULT now(),

  UNIQUE (player_id, dimension_id)
);
```

### Overall Skill Rating (Derived)

The player's displayed **overall skill rating** is the weighted average across all active dimensions:

```
overall = SUM(current_rating × dimension.weight) / SUM(dimension.weight)
         for all dimensions where current_rating > 0
```

This is computed at query time, not stored. Stored as a computed column or materialized in `profiles` if query performance requires it in a future phase.

### Weighted Rating Calculation (per dimension)

```
weighted_sum = 0
weight_total = 0

FOR each review targeting this player for this dimension:
    source_weight = weight based on reviewer_role and team relationship
    weighted_sum += score × source_weight
    weight_total += source_weight

IF player_self_assessments.external_ratings_count < 5:
    weighted_sum += self_score × 1
    weight_total += 1

current_rating = weighted_sum / weight_total
```

### Notes

- This table is the **read-optimized cache** for displaying player ratings. The canonical data is `match_review_ratings`.
- Updated asynchronously (after review submission is complete) to avoid blocking the review insert.

### Indexes

```sql
CREATE INDEX idx_skill_ratings_player_id    ON player_skill_ratings(player_id);
CREATE INDEX idx_skill_ratings_dimension_id ON player_skill_ratings(dimension_id);
```

---

## Anti-Sandbagging Detection

Sandbagging detection is handled by a scheduled server function (not a DB trigger). It compares:

1. `player_self_assessments.score` vs. `player_skill_ratings.current_rating` per dimension
2. Win rate vs. opponent MMR distribution (cross-join from `match_players` and `profiles.mmr`)
3. Rating trend direction over the last 10 matches

When divergence thresholds are exceeded, a row is inserted into `sandbagging_flags` (see `06_gamification.md`).

---

## Relationships

```
skill_dimensions ──► player_self_assessments (1:many)
skill_dimensions ──► match_review_ratings (1:many)
skill_dimensions ──► player_skill_ratings (1:many)

matches ──► match_reviews (1:many)
match_reviews ──► match_review_ratings (1:many)

profiles ──► match_reviews (as reviewer, 1:many)
profiles ──► match_reviews (as reviewee, 1:many)
profiles ──► player_skill_ratings (1:many, one per dimension)
```
