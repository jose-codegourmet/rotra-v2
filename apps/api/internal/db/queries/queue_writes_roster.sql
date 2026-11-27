-- Queue writes (go-writes-queue), the single roster operations of packages/db/src/queue/session-roster.ts. Prisma stamps
-- updated_at on the client on every create and update, so each statement sets updated_at from @now.

-- name: ListQueueLiveRoster :many
-- liveRoster: the live entries (not released, not a no show) in slot order: confirmed_at, then id.
SELECT * FROM session_players WHERE session_id = @session_id AND released_at IS NULL AND no_show_at IS NULL
ORDER BY confirmed_at ASC, id ASC;

-- name: GetSessionWaitlistEntry :one
SELECT * FROM session_waitlist WHERE id = @id;

-- name: DemoteSessionPlayer :exec
-- stepDownIn and the budget demotion: the entry is released with the reason demoted; its assessments and marks stay.
UPDATE session_players SET released_at = @now, release_reason = 'demoted', revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: InsertDemotedWaitlistEntry :exec
INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, demoted_at, demoted_confirmed_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @club_player_id, @skill_level_id, @added_at, @now, @demoted_confirmed_at, @now, @now);

-- name: EntryInUnfinishedMatch :one
-- The entry holds a place in a waiting, On court or Playing match that was not removed.
SELECT EXISTS (
  SELECT 1 FROM match_participations mp JOIN matches m ON m.id = mp.match_id
  WHERE mp.session_id = @session_id AND mp.session_player_id = @session_player_id AND mp.left_at IS NULL
    AND m.state IN ('waiting', 'on_court', 'active') AND m.removed_at IS NULL
);

-- name: EntryHasDecidedMatch :one
SELECT EXISTS (
  SELECT 1 FROM match_participations mp JOIN match_decisions d ON d.match_id = mp.match_id
  WHERE mp.session_id = @session_id AND mp.session_player_id = @session_player_id
);

-- name: SetSessionPlayerNoShow :exec
-- markNoShow (set) and undoNoShow (null): the row stays live and keeps its slot order, level and paid mark.
UPDATE session_players SET no_show_at = sqlc.narg('no_show_at'), revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetSessionPlayerPresence :exec
UPDATE session_players SET present = @present, present_changed_at = @now, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetAllSessionPlayersPresence :exec
-- setAllPresence: updateMany over the live entries whose presence is the other one.
UPDATE session_players SET present = @present, present_changed_at = @now, revision = revision + 1, updated_at = @now
WHERE session_id = @session_id AND released_at IS NULL AND no_show_at IS NULL AND present = NOT @present;

-- name: SetSessionPlayerGamesAdjustment :exec
UPDATE session_players SET games_adjustment = @games_adjustment, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetSessionPlayerHandicap :exec
-- setHandicap: the whole set of marked spots on one live entry, in figure order (empty clears it).
UPDATE session_players SET handicap_spots = @handicap_spots::text[], revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: ClearSessionHandicaps :exec
-- Session done: Handicap · tonight is session only (finalization.ts), so every entry is emptied. No revision bump (updateMany).
UPDATE session_players SET handicap_spots = '{}' WHERE session_id = @session_id AND cardinality(handicap_spots) > 0;
