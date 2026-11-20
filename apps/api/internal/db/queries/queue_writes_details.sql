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
