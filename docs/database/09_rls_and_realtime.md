# 09 — RLS, Realtime & Storage

## Overview

This file documents:
1. **Row Level Security (RLS)** — access policies per table
2. **Supabase Realtime** — which tables are published and subscription patterns
3. **Storage** — Supabase Storage buckets for file uploads

RLS is the primary security boundary. All tables have RLS **enabled** with `FORCE ROW LEVEL SECURITY`. The application never bypasses RLS with a service role key on the client — service role is used only in Edge Functions and server actions.

---

## Helper Functions

These reusable functions are used across policy definitions.

```sql
-- Returns the authenticated user's UUID
CREATE OR REPLACE FUNCTION auth_uid()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns true if the caller is an admin (custom JWT claim)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS bool AS $$
  SELECT coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns true if the caller is the Club Owner of the given club
CREATE OR REPLACE FUNCTION is_club_owner(p_club_id uuid)
RETURNS bool AS $$
  SELECT EXISTS (
    SELECT 1 FROM clubs
    WHERE id = p_club_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns true if the caller is an active member of the given club (including the owner,
-- who is inserted into club_members with role = 'owner' on club creation)
CREATE OR REPLACE FUNCTION is_club_member(p_club_id uuid)
RETURNS bool AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
      AND player_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns true if the caller is a Que Master of the given club
CREATE OR REPLACE FUNCTION is_que_master(p_club_id uuid)
RETURNS bool AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
      AND player_id = auth.uid()
      AND role = 'que_master'
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns true if the caller is an active participant of the given session
CREATE OR REPLACE FUNCTION is_session_participant(p_session_id uuid)
RETURNS bool AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_registrations
    WHERE session_id = p_session_id
      AND player_id = auth.uid()
      AND admission_status IN ('accepted', 'reserved')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## RLS Policies

### `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any profile (public profiles)
CREATE POLICY "profiles_select_any"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth_uid());

-- Inserts are handled by the auth trigger (SECURITY DEFINER) — no direct client insert
-- Admins can read and update any profile
CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (is_admin());
```

---

### `gear_items` and `gear_item_links`

```sql
ALTER TABLE gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_item_links ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "gear_items_select_any"
  ON gear_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only owner can insert/update/delete their gear
CREATE POLICY "gear_items_owner_write"
  ON gear_items FOR ALL
  USING (player_id = auth_uid());

-- Same for gear_item_links (resolved via gear_item owner)
CREATE POLICY "gear_item_links_select_any"
  ON gear_item_links FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "gear_item_links_owner_write"
  ON gear_item_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gear_items
      WHERE id = gear_item_links.gear_item_id
        AND player_id = auth_uid()
    )
  );
```

---

### `player_self_assessments`

```sql
ALTER TABLE player_self_assessments ENABLE ROW LEVEL SECURITY;

-- Players can read any self-assessment (needed for rating display)
CREATE POLICY "self_assessments_select_any"
  ON player_self_assessments FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the player themselves can write their own self-assessment
CREATE POLICY "self_assessments_owner_write"
  ON player_self_assessments FOR ALL
  USING (player_id = auth_uid());
```

---

### `clubs`

```sql
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active/paused clubs (for discovery)
CREATE POLICY "clubs_select_any"
  ON clubs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only Club Owner can update their club
CREATE POLICY "clubs_owner_update"
  ON clubs FOR UPDATE
  USING (owner_id = auth_uid());

-- Insert: handled server-side only (after Club Owner application approval)
-- Admins have full access
CREATE POLICY "clubs_admin_all"
  ON clubs FOR ALL
  USING (is_admin());
```

---

### `club_members`

```sql
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

-- Active members of a club (including the owner, who has role = 'owner' in club_members) can see the member list
CREATE POLICY "club_members_select_members"
  ON club_members FOR SELECT
  USING (is_club_member(club_id));

-- Club Owner can insert/update/delete memberships
CREATE POLICY "club_members_owner_write"
  ON club_members FOR ALL
  USING (is_club_owner(club_id));

-- A player can update their own membership row (for leaving the club)
CREATE POLICY "club_members_self_leave"
  ON club_members FOR UPDATE
  USING (player_id = auth_uid());
```

---

### `club_join_requests`

```sql
ALTER TABLE club_join_requests ENABLE ROW LEVEL SECURITY;

-- Player can see their own requests; Club Owner (role = 'owner' in club_members) can see all requests for their club
CREATE POLICY "join_requests_select_own"
  ON club_join_requests FOR SELECT
  USING (player_id = auth_uid() OR is_club_owner(club_id));

-- Any authenticated user can insert a request for themselves
CREATE POLICY "join_requests_insert_self"
  ON club_join_requests FOR INSERT
  WITH CHECK (player_id = auth_uid());

-- Club Owner can update (approve/reject) requests to their club
CREATE POLICY "join_requests_owner_update"
  ON club_join_requests FOR UPDATE
  USING (is_club_owner(club_id));
```

---

### `club_blacklist`

```sql
ALTER TABLE club_blacklist ENABLE ROW LEVEL SECURITY;

-- Only Club Owner can see and manage the blacklist
CREATE POLICY "blacklist_owner_all"
  ON club_blacklist FOR ALL
  USING (is_club_owner(club_id));

-- Admins have full access
CREATE POLICY "blacklist_admin_all"
  ON club_blacklist FOR ALL
  USING (is_admin());
```

---

### `club_membership_audit_log`

```sql
ALTER TABLE club_membership_audit_log ENABLE ROW LEVEL SECURITY;

-- Club Owner can read the audit log for their club
CREATE POLICY "audit_log_owner_select"
  ON club_membership_audit_log FOR SELECT
  USING (is_club_owner(club_id));

-- No client inserts — written only by server functions (SECURITY DEFINER)
-- Admins have full read access
CREATE POLICY "audit_log_admin_select"
  ON club_membership_audit_log FOR SELECT
  USING (is_admin());
```

---

### `queue_sessions`

```sql
ALTER TABLE queue_sessions ENABLE ROW LEVEL SECURITY;

-- Readable when: the session has no club and is open (clubless casual sessions
-- are always visibility = 'open'), OR the caller is a member of the hosting club,
-- OR the caller is the host (so a host can always see their own session).
CREATE POLICY "sessions_select_members"
  ON queue_sessions FOR SELECT
  USING (
    host_id = auth_uid()
    OR (club_id IS NULL AND visibility = 'open')
    OR (club_id IS NOT NULL AND is_club_member(club_id))
  );

-- Any authenticated player can create a clubless player_organized session.
-- Any active club member can create a club-scoped player_organized session.
-- Only a Que Master or Club Owner can create a club_queue session (club required).
CREATE POLICY "sessions_host_write"
  ON queue_sessions FOR INSERT
  WITH CHECK (
    host_id = auth_uid()
    AND (
      -- clubless player_organized: any authenticated player may host
      (club_id IS NULL AND origin = 'player_organized')
      OR
      -- club-scoped player_organized: any member may host
      (club_id IS NOT NULL AND origin = 'player_organized' AND is_club_member(club_id))
      OR
      -- club_queue sessions: club required; restricted to Que Masters and Club Owners
      (origin = 'club_queue' AND club_id IS NOT NULL
        AND (is_que_master(club_id) OR is_club_owner(club_id)))
    )
  );

CREATE POLICY "sessions_manage_update"
  ON queue_sessions FOR UPDATE
  USING (
    host_id = auth_uid()
    OR (club_id IS NOT NULL AND (is_que_master(club_id) OR is_club_owner(club_id)))
  );
```

---

### `session_registrations`

```sql
ALTER TABLE session_registrations ENABLE ROW LEVEL SECURITY;

-- Participants, Que Masters, and Club Owners (via is_que_master or is_club_owner) can read registrations
CREATE POLICY "registrations_select_participants"
  ON session_registrations FOR SELECT
  USING (
    is_session_participant(session_id)
    OR is_que_master(
      (SELECT club_id FROM queue_sessions WHERE id = session_id)
    )
    OR is_club_owner(
      (SELECT club_id FROM queue_sessions WHERE id = session_id)
    )
  );
-- Note: is_club_owner is kept here explicitly because Que Master status and Club Owner status
-- are distinct privileges. The owner may not hold role = 'que_master', so both are checked.

-- Players can insert their own registration
CREATE POLICY "registrations_insert_self"
  ON session_registrations FOR INSERT
  WITH CHECK (player_id = auth_uid());

-- Players can update their own status (for marking I Am In, I Am Prepared, etc.)
CREATE POLICY "registrations_update_own_status"
  ON session_registrations FOR UPDATE
  USING (player_id = auth_uid());

-- Que Master can update any registration in their club's sessions
CREATE POLICY "registrations_que_master_update"
  ON session_registrations FOR UPDATE
  USING (
    is_que_master(
      (SELECT club_id FROM queue_sessions WHERE id = session_id)
    )
    OR is_club_owner(
      (SELECT club_id FROM queue_sessions WHERE id = session_id)
    )
  );
```

---

### `matches`

```sql
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Any session participant can read matches in their session
CREATE POLICY "matches_select_participants"
  ON matches FOR SELECT
  USING (
    is_session_participant(session_id)
    OR EXISTS (
      SELECT 1 FROM queue_sessions qs
      WHERE qs.id = session_id
        AND (is_que_master(qs.club_id) OR is_club_owner(qs.club_id))
    )
  );

-- Que Masters and Club Owners can insert/update matches
CREATE POLICY "matches_que_master_write"
  ON matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM queue_sessions qs
      WHERE qs.id = session_id
        AND (is_que_master(qs.club_id) OR is_club_owner(qs.club_id))
    )
  );

-- Umpire can update their assigned match (score submission)
CREATE POLICY "matches_umpire_update"
  ON matches FOR UPDATE
  USING (umpire_id = auth_uid());
```

---

### `match_players`

```sql
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

-- Session participants can read match rosters
CREATE POLICY "match_players_select"
  ON match_players FOR SELECT
  USING (
    is_session_participant(
      (SELECT session_id FROM matches WHERE id = match_id)
    )
  );

-- Server-side only inserts (Que Master creates the match with players)
-- Players can update their own review_submitted flag
CREATE POLICY "match_players_update_review"
  ON match_players FOR UPDATE
  USING (player_id = auth_uid());
```

---

### `match_reviews` and `match_review_ratings`

```sql
ALTER TABLE match_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_review_ratings ENABLE ROW LEVEL SECURITY;

-- A player can read reviews where they are the reviewee
-- (anonymous reviews: they see the text, not the reviewer identity)
CREATE POLICY "reviews_select_own"
  ON match_reviews FOR SELECT
  USING (
    reviewee_id = auth_uid()
    OR reviewer_id = auth_uid()
    OR is_admin()
  );

-- Players, Que Masters, and Umpires can insert reviews for matches they participated in
CREATE POLICY "reviews_insert_participant"
  ON match_reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth_uid()
    AND EXISTS (
      SELECT 1 FROM match_players
      WHERE match_id = match_reviews.match_id
        AND player_id = auth_uid()
      UNION
      SELECT 1 FROM matches
      WHERE id = match_reviews.match_id
        AND umpire_id = auth_uid()
    )
  );

-- Review ratings follow the same access as their parent review
CREATE POLICY "review_ratings_select"
  ON match_review_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM match_reviews
      WHERE id = review_id
        AND (reviewee_id = auth_uid() OR reviewer_id = auth_uid())
    )
    OR is_admin()
  );

CREATE POLICY "review_ratings_insert"
  ON match_review_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_reviews
      WHERE id = review_id AND reviewer_id = auth_uid()
    )
  );
```

---

### `player_skill_ratings`

```sql
ALTER TABLE player_skill_ratings ENABLE ROW LEVEL SECURITY;

-- Public read — skill ratings are visible on player profiles
CREATE POLICY "skill_ratings_select_any"
  ON player_skill_ratings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only server functions can write (no direct client writes)
```

---

### `exp_transactions` and `mmr_transactions`

```sql
ALTER TABLE exp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmr_transactions ENABLE ROW LEVEL SECURITY;

-- Players can read their own transaction history
CREATE POLICY "exp_select_own"
  ON exp_transactions FOR SELECT
  USING (player_id = auth_uid() OR is_admin());

CREATE POLICY "mmr_select_own"
  ON mmr_transactions FOR SELECT
  USING (player_id = auth_uid() OR is_admin());

-- No direct client inserts — written only by server functions
```

---

### `notifications`

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Players can only read their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (recipient_id = auth_uid());

-- Players can mark their own notifications as read
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (recipient_id = auth_uid());

-- Inserts are server-side only (Edge Functions, server actions)
```

---

### Admin Tables (`kill_switches`, `platform_config`, `moderation_flags`, `ranking_tier_config`, `skill_dimensions`, `sandbagging_flags`)

Governance tables (`club_applications`, `club_demotion_requests`, `complaints`, `admin_notifications`, `admin_action_log`) are defined in [`12_club_governance.md`](12_club_governance.md). Example RLS patterns:

```sql
ALTER TABLE kill_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_tier_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbagging_flags ENABLE ROW LEVEL SECURITY;

ALTER TABLE club_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_demotion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_log ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_only_kill_switches"   ON kill_switches           FOR ALL USING (is_admin());
CREATE POLICY "admin_only_platform_config" ON platform_config         FOR ALL USING (is_admin());
CREATE POLICY "admin_only_mod_flags"       ON moderation_flags        FOR ALL USING (is_admin());
CREATE POLICY "admin_only_tier_config"     ON ranking_tier_config     FOR ALL USING (is_admin());

-- skill_dimensions: admin writes, any authenticated user reads (needed for review UI)
CREATE POLICY "skill_dimensions_select_any" ON skill_dimensions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "skill_dimensions_admin_write" ON skill_dimensions FOR ALL USING (is_admin());

-- ranking_tier_config: admin writes, any authenticated user reads (needed for tier display)
CREATE POLICY "tier_config_select_any" ON ranking_tier_config FOR SELECT USING (auth.role() = 'authenticated');

-- sandbagging_flags: visible to admins, Club Owners (for their club), and Que Masters
CREATE POLICY "sandbagging_flags_select"
  ON sandbagging_flags FOR SELECT
  USING (
    player_id = auth_uid()
    OR is_admin()
    OR (club_id IS NOT NULL AND (is_club_owner(club_id) OR is_que_master(club_id)))
  );

-- club_applications: players insert/update own pending rows; admins full access
CREATE POLICY "club_applications_admin_all"
  ON club_applications FOR ALL USING (is_admin());
CREATE POLICY "club_applications_insert_self"
  ON club_applications FOR INSERT WITH CHECK (player_id = auth_uid());
CREATE POLICY "club_applications_select_own"
  ON club_applications FOR SELECT USING (player_id = auth_uid() OR is_admin());
CREATE POLICY "club_applications_update_own_pending"
  ON club_applications FOR UPDATE
  USING (player_id = auth_uid() AND status = 'pending')
  WITH CHECK (player_id = auth_uid());

-- club_demotion_requests, complaints: admin full access; extend with club-scoped SELECT for owners/members as needed
CREATE POLICY "demotion_requests_admin" ON club_demotion_requests FOR ALL USING (is_admin());
CREATE POLICY "complaints_insert_authenticated"
  ON complaints FOR INSERT WITH CHECK (reporter_id = auth_uid());
CREATE POLICY "complaints_select_own"
  ON complaints FOR SELECT USING (reporter_id = auth_uid() OR is_admin());

-- admin_notifications: recipient admin only
CREATE POLICY "admin_notifications_own"
  ON admin_notifications FOR ALL USING (is_admin() AND admin_id = auth_uid());

-- admin_action_log: append-only, admin read (writes via service role / SECURITY DEFINER only)
CREATE POLICY "admin_action_log_select" ON admin_action_log FOR SELECT USING (is_admin());
```

> **Note:** `admin_action_log` inserts should use a **service role** or `SECURITY DEFINER` function so policies are not bypassed by mistake. Tune `complaints` SELECT policies when member-vs-admin UX is finalized.

### Legacy table

If `club_owner_applications` still exists in an older database, migrate rows to `club_applications` then drop; policies above target `club_applications` only.

---

## Supabase Realtime

Realtime is configured via Supabase's publication system. Only the tables that need live sync are published.

```sql
-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE queue_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_players;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Subscription Patterns

| Actor | Table | Filter | Events |
|---|---|---|---|
| All session participants | `queue_sessions` | `id=eq.{sessionId}` | `UPDATE` |
| All session participants | `session_registrations` | `session_id=eq.{sessionId}` | `INSERT`, `UPDATE` |
| All session participants | `matches` | `session_id=eq.{sessionId}` | `INSERT`, `UPDATE`, `DELETE` |
| All session participants | `match_players` | match via session join | `INSERT`, `UPDATE` |
| Authenticated users | `notifications` | `recipient_id=eq.{userId}` | `INSERT` |

### Client Subscription Example (Queue Session)

```typescript
// Subscribe to all match changes within a session
const channel = supabase
  .channel(`session:${sessionId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'matches',
    filter: `session_id=eq.${sessionId}`,
  }, (payload) => {
    // Update local match state
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'session_registrations',
    filter: `session_id=eq.${sessionId}`,
  }, (payload) => {
    // Update player status / payment / waitlist
  })
  .subscribe();
```

### Reconnection Strategy

Supabase Realtime handles reconnection automatically. When a client reconnects after a gap, it should:
1. Re-fetch the full current state via REST (not rely on missed events)
2. Re-subscribe to the channel
3. Show an "out of sync" banner while reconnecting

---

## Storage Buckets

Supabase Storage is used for user-uploaded files.

### Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `avatars` | Player profile photos | Public read; authenticated write (own folder only) |
| `club-images` | Club avatar / banner images | Public read; Club Owner write |

### Bucket Policies

```sql
-- avatars bucket: players upload to their own subfolder
-- Path pattern: avatars/{userId}/{filename}
INSERT INTO storage.policies (bucket_id, name, definition)
VALUES (
  'avatars',
  'Users upload own avatar',
  $$
    (auth.uid()::text = (storage.foldername(name))[1])
  $$
);

-- club-images bucket: Club Owners upload for their clubs
-- Path pattern: club-images/{clubId}/{filename}
-- Policy enforced via a storage function that checks clubs.owner_id
```

### Image Handling Notes

- Supabase Storage Transforms can serve resized thumbnails (e.g. `?width=64&height=64` for avatar thumbnails in lists).
- Raw URLs are stored in `profiles.avatar_url` and `clubs.avatar_url` as the full Supabase Storage public URL.
- Gear item photos are **not** in MVP scope — only text fields and purchase links.

---

## Migration Order

Migrations must be applied in dependency order:

```
0001_enums.sql                  — all ENUM type definitions
0002_users_and_profiles.sql     — profiles, gear_items, gear_item_links, player_self_assessments
0003_clubs.sql                  — clubs, club_members, club_join_requests, club_blacklist, club_membership_audit_log
0004_queue_sessions.sql         — queue_sessions, session_registrations
0005_matches.sql                — matches, match_players
0006_reviews_and_ratings.sql    — skill_dimensions, match_reviews, match_review_ratings, player_skill_ratings
0007_gamification.sql           — exp_transactions, mmr_transactions, ranking_tier_config, sandbagging_flags
0008_notifications.sql          — notifications
0009_admin.sql                  — kill_switches, platform_config, moderation_flags (+ legacy club_owner_applications if not yet migrated)
0012_club_governance.sql        — club_applications, complaints, club_demotion_requests, admin_notifications, admin_action_log (see 12_club_governance.md)
0010_rls_policies.sql           — all RLS policies and helper functions
0011_realtime.sql               — publication configuration
0012_storage.sql                — bucket creation and policies
seed.sql                        — skill_dimensions, ranking_tier_config, kill_switches, platform_config
```
