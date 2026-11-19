-- Signed-in Player reads (internal/signedin). Ports of packages/db/src/player/{profile,my-clubs,notifications,
-- account-verification,contact-change}.ts. Every query is scoped to the signed-in player's own ID.

-- name: GetPlayerGoogleEmail :one
-- The Google gate (D-2026-11-16-01) needs only whether ROTRA's own record says Google is connected.
SELECT google_email FROM player_accounts WHERE player_id = $1;

-- name: GetFeatureFlagValue :one
SELECT value FROM feature_flags WHERE key = $1;

-- name: GetMyAccount :one
-- readMyAccount: the player's own contacts, privacy settings and Google identity.
SELECT p.id, p.hide_phone_from_clubs, p.profile_visibility, p.hidden_from_directory, p.revision,
       pc.phone_e164, pc.email,
       a.player_id AS account_player_id, a.auth_subject, a.google_email, a.google_linked_at
FROM players p
LEFT JOIN player_private_contacts pc ON pc.player_id = p.id
LEFT JOIN player_accounts a ON a.player_id = p.id
WHERE p.id = $1;

-- name: IdentityHasPassword :one
-- Whether the sign-in identity behind an account has a password (an account made with Google may have none).
SELECT (password_hash <> '')::boolean AS present FROM auth_identities WHERE id = $1;

-- name: ListMyClubs :many
-- readMyClubs: the player's current club_players rows. A confirmed join request the player sent for that saved
-- player reads as a session link; anything else as added by the club.
SELECT c.id, c.name, c.logo_ref,
       EXISTS (
         SELECT 1 FROM session_join_requests j
         WHERE j.club_player_id = cp.id AND j.player_id = cp.player_id AND j.status = 'confirmed'
       ) AS via_session_link
FROM club_players cp
JOIN clubs c ON c.id = cp.club_id
WHERE cp.player_id = $1 AND cp.removed_at IS NULL
ORDER BY cp.added_at ASC, cp.id ASC;

-- name: ListMyNotifications :many
SELECT id, kind, title, body, target, created_at, read_at
FROM player_notifications
WHERE player_id = $1 AND created_at > $2
ORDER BY created_at DESC, id DESC;

-- name: CountMyUnreadNotifications :one
SELECT count(*) FROM player_notifications WHERE player_id = $1 AND created_at > $2 AND read_at IS NULL;

-- name: ListMyClubMembershipIDs :many
SELECT club_id FROM club_players WHERE player_id = $1 AND club_id = ANY($2::uuid[]) AND removed_at IS NULL;

-- name: GetVerificationFacts :one
-- readVerification: a claimed player with an account. No row is null.
SELECT p.revision, p.verification_override,
       a.google_email, a.verification_reminder_read_at,
       pc.email, pc.phone_e164
FROM players p
JOIN player_accounts a ON a.player_id = p.id
LEFT JOIN player_private_contacts pc ON pc.player_id = p.id
WHERE p.id = $1 AND p.profile_state = 'claimed';

-- name: ListVerificationEmailChanges :many
SELECT status, proposed_value
FROM player_contact_change_requests
WHERE player_id = $1 AND field = 'email' AND status IN ('pending', 'approved', 'applying');

-- name: ListOwnContactChanges :many
-- readOwnContactChanges: the latest ten, newest first.
SELECT id, player_id, field, original_value, proposed_value, status, requested_at, applied_at, rejected_at, superseded_at
FROM player_contact_change_requests
WHERE player_id = $1
ORDER BY requested_at DESC, id ASC
LIMIT 10;
