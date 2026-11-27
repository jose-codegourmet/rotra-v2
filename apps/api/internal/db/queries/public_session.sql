-- The public session page (Queue's handler `public-session.page`): a port of readPublicSession in
-- packages/db/src/queue/public-session.ts. Reads only. Nothing here returns a phone, a contact, presence,
-- costs or a private result: the page is allowlisted by what these queries select.

-- A page removed by retention (its publication deleted) is gone for the public, which the handler turns into
-- not_found; the session itself stays. hasPendingChanges is "an open device stream received more than it has
-- applied". The slug is unique (queue_sessions_public_slug_key).
-- name: GetPublicSessionBySlug :one
SELECT s.id,
       s.title,
       s.notes,
       s.state,
       s.session_mode,
       s.scheduled_start_at,
       s.scheduled_end_at,
       s.venue_name,
       s.venue_address,
       s.allow_singles,
       s.allow_doubles,
       s.minimum_games,
       s.players_per_court,
       s.expected_players,
       s.accept_join_requests,
       s.always_require_request,
       s.record_games,
       s.level_restriction,
       s.beginner_slots,
       s.intermediate_slots,
       s.advanced_slots,
       s.updated_at,
       s.public_slug,
       c.id   AS club_id,
       c.name AS club_name,
       c.logo_ref AS club_logo_ref,
       COALESCE(sp.state = 'deleted', false)::bool AS publication_deleted,
       EXISTS (SELECT 1
               FROM device_session_streams ds
               WHERE ds.session_id = s.id
                 AND ds.state = 'open'
                 AND ds.highest_received_sequence > ds.contiguous_sequence)::bool AS has_pending_changes
FROM queue_sessions s
JOIN clubs c ON c.id = s.club_id
LEFT JOIN session_publications sp ON sp.session_id = s.id
WHERE s.public_slug = @slug;

-- Live courts in court order (position, then creation time and id).
-- name: ListPublicSessionCourts :many
SELECT label
FROM session_courts
WHERE session_id = @session_id
  AND removed_at IS NULL
ORDER BY position ASC, created_at ASC, id ASC;

-- The live roster in slot order: not released and not a no show. The club player is looked up inside the
-- session's own club; a missing one (or a guest, with no profile) has no picture. result_masked is B-56: a registered
-- player who is not public stays masked on the published results (guests and unclaimed players show as the club shows them).
-- name: ListPublicSessionRoster :many
SELECT sp.name_snapshot,
       sp.club_player_id,
       sp.skill_level_id,
       (p.id IS NOT NULL)::bool AS has_profile,
       p.avatar_ref AS profile_avatar_ref,
       cp.avatar_ref AS saved_avatar_ref,
       (p.id IS NOT NULL AND p.profile_state <> 'unclaimed' AND p.profile_visibility <> 'public')::bool AS result_masked
FROM session_players sp
JOIN queue_sessions s ON s.id = sp.session_id
LEFT JOIN club_players cp ON cp.id = sp.club_player_id AND cp.club_id = s.club_id
LEFT JOIN players p ON p.id = cp.player_id
WHERE sp.session_id = @session_id
  AND sp.released_at IS NULL
  AND sp.no_show_at IS NULL
ORDER BY sp.confirmed_at ASC, sp.id ASC;

-- The waitlist, unordered: the order is a rule of the page (demoted first, then arrival) and is applied in Go
-- with the millisecond precision the TypeScript compares at.
-- name: ListPublicSessionWaitlist :many
SELECT w.id,
       w.skill_level_id,
       w.added_at,
       w.demoted_at,
       w.demoted_confirmed_at,
       w.club_player_id,
       cp.display_name AS club_player_display_name,
       (p.id IS NOT NULL)::bool AS has_profile,
       p.avatar_ref AS profile_avatar_ref,
       cp.avatar_ref AS saved_avatar_ref
FROM session_waitlist w
JOIN queue_sessions s ON s.id = w.session_id
LEFT JOIN club_players cp ON cp.id = w.club_player_id AND cp.club_id = s.club_id
LEFT JOIN players p ON p.id = cp.player_id
WHERE w.session_id = @session_id;

-- The published copy of the results, or nothing. Only a publication in state 'published' has any; the
-- CHECK constraints keep the copy to names and counts (standings, awards, and Off Day only when this publish
-- chose it). The handler asks only for a completed session that records its games (record_games).
-- name: GetPublishedResults :one
SELECT public_results
FROM session_publications
WHERE session_id = @session_id
  AND state = 'published'
  AND public_results IS NOT NULL;

-- name: GetSessionSnapshotVersion :one
-- The session's snapshot version (B-25): the id of its newest live-update event, 0 before its first. Read in the same
-- repeatable-read snapshot as the page, so a copy is stamped with exactly what it shows.
SELECT COALESCE(latest_event_id, 0)::bigint AS version FROM queue_sessions WHERE id = @id;

-- The Hosts section (epic #1002, #1006): the current rows of an open session, or the rows frozen when a finished session ended, oldest
-- first. A host whose saved player is not the club's own is left out. The picture follows the profile when there is one.
-- name: ListPublicSessionHosts :many
SELECT h.club_player_id,
       h.name_snapshot,
       cp.display_name,
       (p.id IS NOT NULL)::bool AS has_profile,
       p.avatar_ref AS profile_avatar_ref,
       cp.avatar_ref AS saved_avatar_ref,
       COALESCE((SELECT a.skill_level_id FROM club_assessments a WHERE a.club_player_id = cp.id ORDER BY a.assessed_at DESC, a.id ASC LIMIT 1), -1)::smallint AS assessed_level_id
FROM session_hosts h
JOIN queue_sessions s ON s.id = h.session_id
JOIN club_players cp ON cp.id = h.club_player_id AND cp.club_id = s.club_id
LEFT JOIN players p ON p.id = cp.player_id
WHERE h.session_id = @session_id
  AND ((@ended::bool AND h.frozen_at IS NOT NULL) OR (NOT @ended::bool AND h.removed_at IS NULL))
ORDER BY h.assigned_at ASC, h.id ASC;
