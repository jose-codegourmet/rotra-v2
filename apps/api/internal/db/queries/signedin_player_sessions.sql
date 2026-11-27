-- Signed-in Player reads about sessions (internal/signedin): My sessions, the share card and the invite landing.
-- Ports of packages/db/src/player/{my-sessions,invite-landing}.ts and readPlayerSessionStanding in
-- packages/db/src/queue/public-session.ts. Every query is scoped to the signed-in player.

-- name: ListMyClubPlayerIDs :many
-- myClubPlayerIds: the player's own saved players at each club (removed rows too, history keeps them) plus guest
-- identities confirmed as theirs and not revoked.
SELECT cp.id FROM club_players cp WHERE cp.player_id = @player_id
UNION
SELECT a.club_player_id FROM player_history_attributions a WHERE a.player_id = @player_id AND a.revoked_at IS NULL;

-- name: ListMyOpenSessions :many
-- Upcoming and running sessions (finalizing reads as live until Session done commits) where the player holds a
-- slot, waits on the waitlist or has a pending join request.
SELECT qs.id, qs.title, qs.state, qs.public_slug, qs.scheduled_start_at, qs.scheduled_end_at, c.name AS club_name,
       EXISTS (
         SELECT 1 FROM session_players e
         WHERE e.session_id = qs.id AND e.club_player_id = ANY (@club_player_ids::uuid[])
           AND e.released_at IS NULL AND e.no_show_at IS NULL
       ) AS has_slot
FROM queue_sessions qs
JOIN clubs c ON c.id = qs.club_id
WHERE qs.state IN ('prepared', 'active', 'finalizing')
  AND (
    EXISTS (
      SELECT 1 FROM session_players e
      WHERE e.session_id = qs.id AND e.club_player_id = ANY (@club_player_ids::uuid[])
        AND e.released_at IS NULL AND e.no_show_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM session_waitlist w
      WHERE w.session_id = qs.id AND w.club_player_id = ANY (@club_player_ids::uuid[])
    )
    OR EXISTS (
      SELECT 1 FROM session_join_requests j
      WHERE j.session_id = qs.id AND j.status = 'pending'
        AND (j.player_id = @player_id OR j.club_player_id = ANY (@club_player_ids::uuid[]))
    )
  )
ORDER BY qs.scheduled_start_at ASC, qs.id ASC;

-- name: ListSessionWaitlistRows :many
-- The waitlist, unordered: the order is a rule (demoted first, then arrival) applied in Go at the millisecond the
-- TypeScript compares at.
SELECT id, club_player_id, skill_level_id, added_at, demoted_at, demoted_confirmed_at
FROM session_waitlist
WHERE session_id = @session_id;

-- name: ListSharedStandingSessions :many
-- Results count as shared only while the page is published with the standings slide.
SELECT session_id
FROM session_publications
WHERE session_id = ANY (@session_ids::uuid[])
  AND state = 'published'
  AND 'standings' = ANY (published_slides);

-- name: GetMyShareSessionPublication :one
SELECT sp.state, sp.published_slides::text[] AS published_slides, rs.standings AS snapshot_standings
FROM session_publications sp
LEFT JOIN session_result_snapshots rs ON rs.id = sp.published_snapshot_id
WHERE sp.session_id = @session_id;

-- name: ListMyShareFacts :many
-- Only games the player played are read.
SELECT match_id, partner_entry_ids, opponent_entry_ids
FROM player_match_facts
WHERE session_id = @session_id AND club_player_id = ANY (@club_player_ids::uuid[]);

-- name: GetInvitePlayer :one
SELECT id, full_name FROM players WHERE id = @id;

-- name: CountInviteClubMembers :one
SELECT count(*)
FROM club_players cp
JOIN players p ON p.id = cp.player_id
WHERE cp.club_id = @club_id AND cp.removed_at IS NULL AND p.profile_state = 'claimed';

-- name: IsClubMember :one
SELECT EXISTS (
  SELECT 1 FROM club_players WHERE club_id = @club_id AND player_id = @player_id AND removed_at IS NULL
) AS member;

-- name: GetInviteSession :one
SELECT qs.id, qs.club_id, qs.title, qs.state, qs.public_slug, qs.scheduled_start_at, qs.scheduled_end_at, qs.venue_name,
       sp.state AS publication_state
FROM queue_sessions qs
LEFT JOIN session_publications sp ON sp.session_id = qs.id
WHERE qs.public_slug = @slug;

-- name: HasLiveSlotAtSession :one
SELECT EXISTS (
  SELECT 1 FROM session_players e
  JOIN club_players cp ON cp.id = e.club_player_id
  WHERE e.session_id = @session_id AND e.released_at IS NULL AND e.no_show_at IS NULL AND cp.player_id = @player_id
) AS has_slot;

-- name: ListMyClubPlayersAmong :many
SELECT id FROM club_players WHERE id = ANY (@ids::uuid[]) AND player_id = @player_id;

-- name: GetLatestJoinRequestStatus :one
SELECT status FROM session_join_requests
WHERE session_id = @session_id AND player_id = @player_id
ORDER BY requested_at DESC, id DESC
LIMIT 1;
