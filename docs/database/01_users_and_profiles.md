# 01 — Users & Profiles

## Overview

Authentication is handled entirely by **Supabase Auth** using Facebook as the primary OAuth provider. An email invitation path also exists: an invite token is emailed to a recipient who then connects their Facebook account, after which Supabase verifies the linked email address.

The `profiles` table extends `auth.users` with all ROTRA-specific player data. All other tables reference `profiles.id`.

**Tester accounts** use `profiles.is_tester_account = true` with nullable `facebook_id` (identity CHECK: `facebook_id IS NOT NULL OR is_tester_account = true`). See [`14_tester_invitations.md`](14_tester_invitations.md) and client Path D in `03_authentication.md`.

**Tag catalog** assignments validate against [`tag_definitions`](13_tag_definitions.md) before writing `profile_tags`.

Account verification is a **three-condition composite** stored as a generated column (`is_verified`). New accounts are unverified by default. See `03_authentication.md` for the full verification model.

Gear items are modeled as independent rows (not JSONB) to allow querying, filtering, and clean relational joins. Each gear item can have multiple "where to buy" links via `gear_item_links`.

`player_self_assessments` holds the player's own skill dimension scores, set during profile setup and editable later. These are used as a baseline in the weighted skill rating until at least 5 external ratings accumulate per dimension.

---

## Enums

```sql
CREATE TYPE playing_level_enum AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TYPE format_preference_enum AS ENUM ('singles', 'doubles', 'both');

CREATE TYPE court_position_enum AS ENUM ('front', 'back', 'both');

CREATE TYPE play_mode_enum AS ENUM ('competitive', 'social', 'both');

CREATE TYPE gear_category_enum AS ENUM ('racket', 'shoes', 'bag');

CREATE TYPE racket_balance_enum AS ENUM ('head_heavy', 'head_light', 'even_balanced');

CREATE TYPE shoe_fit_enum AS ENUM ('wide', 'narrow', 'standard');

CREATE TYPE invitation_status_enum AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TYPE admin_role_enum AS ENUM ('super_admin', 'admin');
```

---

## Table: `profiles`

Extends `auth.users`. Created automatically via a Supabase Auth trigger on new user signup (both Facebook login and email invitation paths).

```sql
CREATE TABLE profiles (
  id                              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  facebook_id                     text UNIQUE NOT NULL,
  name                            text NOT NULL,
  avatar_url                      text,
  phone                           text,

  -- Email (from invitation path or manually added)
  email                           text,
  email_verified                  bool NOT NULL DEFAULT false,
  email_verified_at               timestamptz,

  -- Composite verification flag (all three conditions must be true)
  -- Condition 1: facebook_id IS NOT NULL (always true after OAuth)
  -- Condition 2: email_verified = true
  -- Condition 3: onboarding_completed = true
  is_verified                     bool GENERATED ALWAYS AS (
                                    facebook_id IS NOT NULL
                                    AND email_verified
                                    AND onboarding_completed
                                  ) STORED,

  -- Admin account lifecycle (null role = regular player profile)
  admin_role                      admin_role_enum,
  admin_is_active                 bool NOT NULL DEFAULT false,
  admin_invited_by                uuid REFERENCES profiles(id) ON DELETE SET NULL,
  admin_invited_at                timestamptz,
  admin_activated_at              timestamptz,
  admin_deactivated_at            timestamptz,
  admin_deactivated_by            uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Self-declared level (separate from computed skill rating)
  playing_level                   playing_level_enum,

  -- Play style preferences
  format_preference               format_preference_enum,
  court_position                  court_position_enum,
  play_mode                       play_mode_enum,

  -- Age (private, for analytics only)
  age                             int,

  -- Playing history
  playing_since                   int,                  -- year, e.g. 2015
  playing_since_less_than_one_year bool NOT NULL DEFAULT false,

  -- Tournament track record (self-reported snapshot)
  tournament_wins_last_year       text CHECK (
                                    tournament_wins_last_year IN ('none', '1_to_3', '4_plus')
                                  ),

  -- Gamification totals (cached from exp_transactions / mmr_transactions)
  exp_total                       int NOT NULL DEFAULT 0,
  mmr                             int NOT NULL DEFAULT 1000,
  mmr_matches_played              int NOT NULL DEFAULT 0,
  calibration_completed_at        timestamptz,

  -- One-time EXP bonus flag
  profile_completed_bonus_claimed bool NOT NULL DEFAULT false,

  -- Onboarding completion gate
  onboarding_completed            bool NOT NULL DEFAULT false,

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);
```

### Column Notes

| Column | Notes |
|---|---|
| `facebook_id` | Maps to the `sub` claim from Supabase's Facebook OAuth; stored for server-side deduplication. Always set; cannot be null on any real profile row. |
| `email` | Nullable. Populated from `auth.users.email` when the invitation path is used, or when the player links an email manually from settings. |
| `email_verified` | Set to `true` only after Supabase sends and the user clicks a verification email. Linking an email alone does not set this field. |
| `is_verified` | Generated column; never written directly. Clients must not cache or recompute this. |
| `age` | Private — must never appear on the public profile, leaderboard, or comparison views. |
| `playing_since` | Year the player started badminton. Null when `playing_since_less_than_one_year = true`. |
| `playing_since_less_than_one_year` | When `true`, `playing_since` must be null. Both are set together. |
| `tournament_wins_last_year` | Self-reported snapshot at registration. Not auto-recalculated. |
| `exp_total` and `mmr` | Cached aggregates from `exp_transactions` / `mmr_transactions`. Updated by trigger only; never written directly by the client. |
| `onboarding_completed` | Gates access. Any authenticated user with this `false` is redirected to `/onboarding` on every app open. |
| `admin_role` | Nullable. Non-null marks the row as an Admin-app account (`super_admin` or `admin`). |
| `admin_is_active` | Access gate for admin routes. Inactive admins cannot perform Admin-app actions even with a valid auth session. |
| `admin_invited_by`, `admin_invited_at`, `admin_activated_at`, `admin_deactivated_at`, `admin_deactivated_by` | Admin provisioning/audit lifecycle columns used by the Admins module (see [`../business_logic/admin_app/08_user_management.md`](../business_logic/admin_app/08_user_management.md)). |

### Roles & tags derivation (Admin App)

There is **one row per person** in `profiles`. The Admin App does not use separate tables for “admins” vs “players”. **Product roles** (regular player, club owner, que master, platform admin) are expressed as **columns and joins**, rendered as **tag pills** in the UI (see [`../views/admin_app/users.md`](../views/admin_app/users.md) and [`../views/admin_app/admins.md`](../views/admin_app/admins.md)).

| Tag / concept | Meaning | Derivation |
|---------------|---------|------------|
| **Everyone is a player** | Baseline | Every `profiles` row is a player identity for the Client App. |
| **Club owner** | Owns at least one club | `EXISTS (SELECT 1 FROM clubs c WHERE c.owner_id = profiles.id)` |
| **Que master** | Active que master membership | `EXISTS (SELECT 1 FROM club_members m WHERE m.player_id = profiles.id AND m.role = 'que_master' AND m.status = 'active')` |
| **Admin** | Platform admin (non-super) | `profiles.admin_role = 'admin'` |
| **Super admin** | Platform super admin | `profiles.admin_role = 'super_admin'` |
| **Deactivated** | Account cannot fully use the product / admin app per current rules | **Player:** active moderation suspension or deleted account state as recorded in [`admin_action_log`](./12_club_governance.md) / Moderation (implementation reads the canonical suspension pipeline). **Platform admin:** additionally `profiles.admin_is_active = false` revokes Admin App access even when `admin_role` is set. |

**Admin App directory lenses** (same table, different `WHERE`):

- **`/admin/users`** — `profiles.admin_role IS NULL` (player directory; club owner / que master tags still apply).
- **`/admin/admins`** — `profiles.admin_role IS NOT NULL` (platform team directory; Role column shows Admin vs Super admin; same Club owner / Que master / Deactivated tags when applicable).

### Trigger: auto-create profile on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, facebook_id, name, avatar_url, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email   -- populated on email invitation path; NULL on direct Facebook login
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Runtime UI (Client App):** Player-facing display name and avatar must be read from **`profiles.name`** and **`profiles.avatar_url`**. Values in `auth.users.raw_user_meta_data` (Facebook) are only the **initial seed** for this trigger; after onboarding or settings edits, the database row is the source of truth and may diverge from OAuth metadata.

### Indexes

```sql
CREATE INDEX idx_profiles_facebook_id ON profiles(facebook_id);
CREATE INDEX idx_profiles_email       ON profiles(email);
CREATE INDEX idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX idx_profiles_admin_role  ON profiles(admin_role) WHERE admin_role IS NOT NULL;
```

---

## Table: `email_invitations`

Tracks tokenized email invitations sent by admins or club owners. Each row represents a single invitation to a single email address. The token is single-use: once `status = 'accepted'`, it cannot be reused.

```sql
CREATE TABLE email_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  token         text UNIQUE NOT NULL,
  invited_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,

  status        invitation_status_enum NOT NULL DEFAULT 'pending',

  -- Token expires 7 days after creation
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',

  -- Set when the invitation is accepted
  accepted_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at   timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### Status Transitions

```
pending → accepted  (recipient clicks link, completes Facebook login)
pending → expired   (TTL exceeded; a scheduled job or check-on-read marks this)
pending → revoked   (inviter or admin manually revokes before acceptance)
```

### Notes

- `invited_by` is nullable (SET NULL on profile delete) for audit preservation.
- `accepted_by` links to the `profiles` row created or updated when the invitation was accepted.
- When `status = 'accepted'`, the corresponding `profiles.email` is set to the invitation email and `profiles.email_verified` transitions to `true` once the Supabase verification link is clicked.
- A single email address may have multiple invitation rows (e.g. if an invite expired and a new one was issued), but only one `pending` invitation per email address is permitted at a time (enforced via a partial unique index).

```sql
-- Only one pending invite per email at a time
CREATE UNIQUE INDEX idx_email_invitations_pending_email
  ON email_invitations(email)
  WHERE status = 'pending';

CREATE INDEX idx_email_invitations_token  ON email_invitations(token);
CREATE INDEX idx_email_invitations_email  ON email_invitations(email);
CREATE INDEX idx_email_invitations_status ON email_invitations(status);
```

---

## Table: `admin_invitations`

Tracks admin-user invitation lifecycle separately from player invitations.

```sql
CREATE TABLE admin_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  role          admin_role_enum NOT NULL,
  invited_by    uuid NOT NULL REFERENCES profiles(id),
  status        invitation_status_enum NOT NULL DEFAULT 'pending',
  accepted_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at   timestamptz,
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_admin_invitations_pending_email
  ON admin_invitations(email)
  WHERE status = 'pending';

CREATE INDEX idx_admin_invitations_email  ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status);
```

---

## Table: `gear_items`

Each gear item is a "mini post" on the player's public profile. Players can have multiple items per category.

```sql
CREATE TABLE gear_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category    gear_category_enum NOT NULL,

  -- Common fields
  title       text NOT NULL,
  description text,
  brand       text,
  model       text,

  -- Racket-specific
  balance_type    racket_balance_enum,
  string_brand    text,
  string_model    text,
  string_tension  numeric(5, 2),  -- e.g. 28.00 lbs
  grip            text,

  -- Shoes-specific
  shoe_size   numeric(4, 1),      -- e.g. 10.5
  fit_type    shoe_fit_enum,

  -- Bags-specific
  capacity    text,               -- e.g. "6-racket"

  display_order int NOT NULL DEFAULT 0,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### Notes

- Category-specific columns are `NULL` when not applicable (e.g. `shoe_size` is null on a racket row).
- `display_order` allows players to reorder items in their showcase.

### Indexes

```sql
CREATE INDEX idx_gear_items_player_id ON gear_items(player_id);
CREATE INDEX idx_gear_items_category  ON gear_items(category);
```

---

## Table: `gear_item_links`

One-to-many "where to buy" URLs per gear item.

```sql
CREATE TABLE gear_item_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_item_id uuid NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
  label        text,   -- optional display label, e.g. "Lazada", "Shopee"
  url          text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_gear_item_links_gear_item_id ON gear_item_links(gear_item_id);
```

---

## Table: `player_self_assessments`

The player's self-declared score per skill dimension, set during profile setup and editable later. One row per (player, dimension) pair.

```sql
CREATE TABLE player_self_assessments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dimension_id            uuid NOT NULL REFERENCES skill_dimensions(id) ON DELETE CASCADE,

  -- Score 1–5 matching the main skill scale
  score                   int NOT NULL CHECK (score BETWEEN 1 AND 5),

  -- Tracks when self-assessment weight phases out (≥5 external ratings per dimension)
  external_ratings_count  int NOT NULL DEFAULT 0,

  updated_at              timestamptz NOT NULL DEFAULT now(),

  UNIQUE (player_id, dimension_id)
);
```

### Notes

- `external_ratings_count` is incremented server-side when a new `match_review_ratings` row targeting this player and dimension is accepted within the 24-hour review window.
- Once `external_ratings_count >= 5`, the self-assessment weight drops from `×1` to `×0` in the weighted skill calculation (see `05_reviews_and_ratings.md`).

### Indexes

```sql
CREATE INDEX idx_self_assessments_player_id    ON player_self_assessments(player_id);
CREATE INDEX idx_self_assessments_dimension_id ON player_self_assessments(dimension_id);
```

---

## Relationships

```
auth.users (Supabase managed)
    └── profiles (1:1 via FK)
            ├── gear_items (1:many)
            │       └── gear_item_links (1:many)
            ├── player_self_assessments (1:many, one per dimension)
            │       └── skill_dimensions (many:1)
            ├── email_invitations as invited_by (1:many)
            ├── email_invitations as accepted_by (1:1 per accepted invite)
            └── profile_tags (1:many, admin-managed labels)
```

---

## Table: `profile_tags`

**Catalog-driven** internal labels attached to a player profile (`profiles.id` where `admin_role IS NULL`). Admins pick a `slug` from [`tag_definitions`](13_tag_definitions.md); the service copies the definition `label` onto the row. Slugs must match an active catalog entry.

Exposed read-only to authenticated clients via `GET /api/profile/[userId]` and server `getCurrentProfile()` so the Client App can render pills or gate features (e.g. `tags.some((t) => t.slug === "beta-tester---scheduling")`).

```sql
CREATE TABLE profile_tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  label        text NOT NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,

  UNIQUE (profile_id, slug)
);

CREATE INDEX profile_tags_slug_idx ON profile_tags (slug);
```

| Column | Notes |
|--------|--------|
| `profile_id` | Target player profile; cascades when the profile row is deleted. |
| `slug` | From `tag_definitions.slug` at assignment time. |
| `label` | Human-readable text shown in Admin and optionally in Client UI. |
| `assigned_at` | When the tag was created. |
| `assigned_by` | Admin `profiles.id` who added the tag; `NULL` if the admin profile was removed (`ON DELETE SET NULL`). |

Writes are performed from the **Admin App** only (authenticated admin session + API routes).

---

## Table: `tester_invitations`

Tracks admin-issued tester invites. Full schema: [`14_tester_invitations.md`](14_tester_invitations.md).

---

## Player Profile Completeness

The `profile_completed_bonus_claimed` flag is set to `true` (and a `+20 EXP` transaction is inserted) when all of the following are present and `profile_completed_bonus_claimed = false`:

| Requirement | Column / Table |
|---|---|
| Name set | `profiles.name` |
| Phone set | `profiles.phone` |
| Playing level set | `profiles.playing_level` |
| Format preference set | `profiles.format_preference` |
| Court position set | `profiles.court_position` |
| Play mode set | `profiles.play_mode` |
| Onboarding completed | `profiles.onboarding_completed = true` |

All of these fields are now collected during the onboarding wizard, so the bonus is awarded immediately on wizard completion for accounts created after the wizard ships.

---

## Account Verification Summary

| Condition | Column | Set by |
|---|---|---|
| Facebook linked | `profiles.facebook_id IS NOT NULL` | `handle_new_user()` trigger on OAuth signup |
| Email verified | `profiles.email_verified = true` | Supabase email verification callback |
| Onboarding complete | `profiles.onboarding_completed = true` | Server on wizard payload receipt |
| **Verified (composite)** | `profiles.is_verified` (generated) | Automatically when all three conditions are true |
