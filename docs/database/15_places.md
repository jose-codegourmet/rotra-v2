# 15 — Places

## Overview

A **Place** is a badminton venue in the ROTRA registry — the canonical source of truth for where sessions happen. Mapbox powers map rendering and geocoding only; it does not store venue records. Small local courts in the Philippines often have incomplete or missing Mapbox POI coverage, so ROTRA maintains its own `places` table for full control, moderation, and future features (ratings, court availability, reservations).

## Status lifecycle

Two statuses only:

| Status | Who sets it | Meaning |
|--------|-------------|---------|
| `confirmed` | Admin (on create, or after review) | Verified venue; visible to all authenticated users as a session location choice |
| `unreviewed` | System (player pins a new place during session creation) | Pending admin review; not offered to other users as a choice |

**Flow:**

1. **Admin-created** — inserted with `status = 'confirmed'` immediately (admin app uses service role).
2. **Player-submitted** — inserted with `status = 'unreviewed'` and `submitted_by = auth.uid()`. The player's session proceeds normally; the pin is not visible to others until confirmed.
3. **Admin review** — admin confirms (`status → confirmed`, sets `reviewed_by`, `reviewed_at`) or deletes the record.

## Enum

```sql
CREATE TYPE place_status_enum AS ENUM ('confirmed', 'unreviewed');
```

## Table: `places`

```sql
CREATE TABLE places (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  name          text        NOT NULL,
  address       text        NOT NULL,
  latitude      double precision NOT NULL,
  longitude     double precision NOT NULL,

  description   text,
  phone         text,
  website       text,

  status        place_status_enum NOT NULL DEFAULT 'unreviewed',

  -- NULL when created by an admin directly
  submitted_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,

  -- Populated when an admin reviews the record
  reviewed_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_places_status       ON places(status);
CREATE INDEX idx_places_submitted_by ON places(submitted_by);
CREATE INDEX idx_places_lat_lng      ON places(latitude, longitude);
```

### `updated_at` trigger

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## Row Level Security

RLS is enabled on `places`. Policies:

```sql
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read confirmed places
CREATE POLICY "Confirmed places visible to authenticated users"
  ON places FOR SELECT
  TO authenticated
  USING (status = 'confirmed');

-- Authenticated users can submit new places (forced to unreviewed, must own the row)
CREATE POLICY "Authenticated users can submit unreviewed places"
  ON places FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'unreviewed'
    AND submitted_by = auth.uid()
  );

-- Players can see their own unreviewed submissions
CREATE POLICY "Users can view their own unreviewed submissions"
  ON places FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());
```

### RLS rationale

| Actor | Access |
|-------|--------|
| **Authenticated player** | `SELECT` confirmed places; `INSERT` unreviewed with `submitted_by = self`; `SELECT` own unreviewed submissions |
| **Admin app (service role)** | Full CRUD — bypasses RLS; no separate admin policy needed |
| **Anonymous** | No access |

Player-submitted venues do not block session creation. Unreviewed rows are invisible to other players until an admin confirms them.

## Relationship to `queue_sessions`

Today, sessions store venue coordinates on `queue_sessions` (`venue_lat`, `venue_lng`, `venue_address`, `location`, `address`). A `place_id` FK on `queue_sessions` is a planned follow-up to link sessions to canonical place records.

## Prisma

- Model: `Place` in [`packages/db/prisma/models_places.prisma`](../../packages/db/prisma/models_places.prisma)
- Enum: `PlaceStatus` → `place_status_enum`
- Profile back-relations: `placesSubmitted`, `placesReviewed` on `Profile`

Import types via `@prisma/client` / Prisma client on `@rotra/db` — e.g. `Place`, `PlaceStatus`.

## Future considerations

- `place_id` FK on `queue_sessions`
- Venue images / photo gallery
- Player ratings and reviews per place
- Court count and availability
- Reservation integration
