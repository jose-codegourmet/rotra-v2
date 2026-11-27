-- Player identity writes shared by the claim, guest registration and club resolution (go-sign-in 3.2). Ports of
-- allocateRtrId, nextPlayerSequence and linkClubRecordsByPhone in packages/db/src/player/{identity,rtr-id}.ts.
-- Prisma fills updated_at on the client: every UPDATE here sets it from @now.

-- name: GetClubFoundingLocation :one
SELECT l.id, l.country_code, l.city_code
FROM clubs c
JOIN location_codes l ON l.id = c.founding_location_code_id
WHERE c.id = @club_id;

-- The only way to advance a counter: rotra_next_player_sequence is one atomic upsert (never MAX + 1). It locks the
-- counter row until the transaction ends, so concurrent claims for one location and day queue up and each gets
-- its own number; a rolled-back claim gives its number back. Call it inside the allocating transaction.
-- name: NextPlayerSequence :one
SELECT rotra_next_player_sequence(@location_code_id::uuid, @sync_date::date)::int4 AS sequence;

-- name: InsertPlayerIDAllocation :exec
INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at)
VALUES (@player_id, @rtr_id, @creating_club_id, @location_code_id, @country_code, @city_code, @sync_date::date, @sequence, @now);

-- Every club's unclaimed record whose private phone is @phone and whose intake still waits (pending or conflicted),
-- earliest saved first. The rows are locked so a club resolving the same record at the same moment waits.
-- name: ListUnclaimedRecordsByPhone :many
SELECT cp.id, cp.club_id
FROM club_players cp
JOIN club_player_private_inputs pi ON pi.club_player_id = cp.id AND pi.club_id = cp.club_id
WHERE cp.player_id IS NULL
  AND cp.removed_at IS NULL
  AND pi.phone_e164 = @phone::text
  AND pi.state IN ('pending', 'conflicted')
ORDER BY cp.added_at ASC, cp.id ASC
FOR UPDATE OF cp;

-- name: ClubListsPlayer :one
SELECT EXISTS (SELECT 1 FROM club_players WHERE club_id = @club_id AND player_id = @player_id)::bool AS listed;

-- name: LinkClubPlayer :exec
UPDATE club_players
SET player_id = @player_id, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND id = @id;

-- name: ResolveClubPlayerInput :exec
UPDATE club_player_private_inputs
SET state = 'resolved', resolved_player_id = @player_id, resolved_at = @now, revision = revision + 1, updated_at = @now
WHERE club_player_id = @club_player_id;

-- name: GetLocationCode :one
-- The founding city a registration from the Admin link picked (location_codes, Admin-managed).
SELECT id, country_code, city_code FROM location_codes WHERE id = @id;
