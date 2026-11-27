-- Queue writes (go-writes-queue): Edit details of a saved player (packages/db/src/queue/club-player-details.ts).

-- name: UpdateClubPlayerDetails :exec
-- The club's own name and nickname for its saved player (Prisma sets updated_at).
UPDATE club_players SET display_name = @display_name, nickname = @nickname, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND id = @id;

-- name: FindSavedPlayerWithPhone :one
-- The phone is taken: another live saved player of this club has it as private intake or as a registered player's contact. The
-- TypeScript reads one with no order; this reads the lowest id.
SELECT cp.display_name FROM club_players cp
WHERE cp.club_id = @club_id AND cp.id <> @id AND cp.removed_at IS NULL
  AND (EXISTS (SELECT 1 FROM club_player_private_inputs i WHERE i.club_player_id = cp.id AND i.phone_e164 = @phone)
    OR EXISTS (SELECT 1 FROM player_private_contacts c WHERE c.player_id = cp.player_id AND c.phone_e164 = @phone))
ORDER BY cp.id LIMIT 1;

-- name: UpsertClubPlayerOwnDetails :exec
-- clubPlayerPrivateInput.upsert: the club's own details (playing style, experience, links) in preset_fields. A phone is taken only
-- when one is passed; an existing phone stays.
INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, preset_fields, captured_at, created_at, updated_at)
VALUES (@club_player_id, @club_id, sqlc.narg('phone'), @preset_fields::jsonb, @now, @now, @now)
ON CONFLICT (club_player_id) DO UPDATE
SET preset_fields = EXCLUDED.preset_fields,
    phone_e164 = COALESCE(sqlc.narg('phone'), club_player_private_inputs.phone_e164),
    revision = club_player_private_inputs.revision + 1,
    updated_at = @now;

-- name: GetSharedEntryForLinks :one
-- followClubLinks (packages/db/src/player/shared-entry.ts): the entry the club's links are followed on.
SELECT id, email, social_key, claimed_player_id, retired_at FROM shared_player_entries WHERE id = @id;

-- name: LockSocialKey :exec
-- lockSocialKey (#1019): serializes everything that reads and then writes one social link key. The key is the TypeScript's.
SELECT pg_advisory_xact_lock(hashtext('social:' || @key::text));

-- name: FindOpenEntryBySocialKey :one
-- openEntryBySocialKey (#1019): only unclaimed people are found by a link; the key is cleared when the entry is claimed or retired.
SELECT id FROM shared_player_entries WHERE social_key = @key AND claimed_player_id IS NULL AND retired_at IS NULL LIMIT 1;

-- name: SetSharedEntrySocialKey :exec
-- followClubLinks: the entry's link key follows this club's links (Prisma sets updated_at).
UPDATE shared_player_entries SET social_key = sqlc.narg('key'), revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: CountOtherLiveRecordsOfEntry :one
SELECT count(*)::int4 FROM club_players WHERE shared_entry_id = @entry_id AND removed_at IS NULL AND id <> @except_id;

-- name: DetachClubPlayerFromEntry :exec
-- followClubLinks: with no email and no key left, this club's record goes back to being a guest.
UPDATE club_players SET shared_entry_id = NULL, revision = revision + 1, updated_at = @now WHERE club_id = @club_id AND id = @id;

-- name: GetClubPlayerPresetFields :one
-- The club's own details after this save (followClubLinks reads the links back from the private input).
SELECT preset_fields FROM club_player_private_inputs WHERE club_player_id = @club_player_id;
