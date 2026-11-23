-- Google sign-in for players (D-2026-11-16-01, track go-sign-in-catch-up). A Google account is known to ROTRA only through
-- player_accounts.google_email (the email Google verified, lower case), never through the provider.

-- name: GetGoogleAccountByGoogleEmail :one
SELECT a.player_id, a.disabled_at, a.auth_subject, p.full_name
FROM player_accounts a
JOIN players p ON p.id = a.player_id
WHERE a.google_email = @email;

-- name: GetGoogleContactByEmail :one
-- The player whose private contact has this ROTRA email, and the account it has, if any (an unclaimed player has none).
SELECT c.player_id, a.player_id AS account_player_id, a.disabled_at, a.google_email, a.auth_subject, p.full_name
FROM player_private_contacts c
JOIN players p ON p.id = c.player_id
LEFT JOIN player_accounts a ON a.player_id = c.player_id
WHERE c.email = @email;

-- name: GetGoogleAccountByPlayerID :one
SELECT a.player_id, a.disabled_at, a.google_email, a.auth_subject, p.full_name, c.email AS rotra_email
FROM player_accounts a
JOIN players p ON p.id = a.player_id
LEFT JOIN player_private_contacts c ON c.player_id = a.player_id
WHERE a.player_id = @player_id;

-- name: SetPlayerGoogleEmail :exec
UPDATE player_accounts
SET google_email = @email, google_linked_at = @now, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id;

-- name: GoogleEmailHasOtherLogin :one
-- Another sign-in identity of the Player app already uses this email as its login (the provider's emailHasOtherLogin).
SELECT EXISTS (
  SELECT 1 FROM auth_identities WHERE audience = 'player' AND login_key = @email AND id <> @subject
) AS present;

-- name: ListUnclaimedIdentityRecords :many
-- readUnclaimedIdentities (D-2026-11-16-04): the current club records of an open shared entry (one per club that saved the email,
-- the first club first), with what the identity card shows.
SELECT cp.id, cp.club_id, cp.display_name, cp.nickname, cp.added_at,
       c.name AS club_name, c.logo_ref,
       pi.phone_e164, pi.preset_fields,
       COALESCE((SELECT a.skill_level_id FROM club_assessments a WHERE a.club_id = cp.club_id AND a.club_player_id = cp.id ORDER BY a.assessed_at DESC LIMIT 1), -1)::smallint AS skill_level_id,
       COALESCE((SELECT sum(s.full_games) FROM club_session_player_summaries s WHERE s.club_id = cp.club_id AND s.club_player_id = cp.id), 0)::bigint AS games,
       (SELECT count(DISTINCT s.session_id) FROM club_session_player_summaries s WHERE s.club_id = cp.club_id AND s.club_player_id = cp.id)::bigint AS sessions
FROM club_players cp
JOIN clubs c ON c.id = cp.club_id
LEFT JOIN club_player_private_inputs pi ON pi.club_id = cp.club_id AND pi.club_player_id = cp.id
WHERE cp.shared_entry_id = @entry_id AND cp.removed_at IS NULL AND cp.player_id IS NULL
ORDER BY cp.added_at, cp.id;

-- name: RecordNewPlayerGoogle :exec
-- Google on an account made in this very transaction (a claim or a registration with Google): the account row has no revision bump,
-- as the TypeScript creates it with Google already on it. Connecting later is SetPlayerGoogleEmail.
UPDATE player_accounts
SET google_email = @email, google_linked_at = @now
WHERE player_id = @player_id;

-- name: ConfirmPrivateContactEmail :exec
-- The Google email is the ROTRA email and is confirmed at once (D-2026-11-16-01): no "Confirm your email" step. No revision bump, as
-- the TypeScript creates the contact with the confirmation on it.
UPDATE player_private_contacts
SET email_verified_at = @now
WHERE player_id = @player_id;
