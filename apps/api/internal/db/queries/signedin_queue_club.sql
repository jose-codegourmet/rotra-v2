-- The Queue app's club reads: the club, its invite code, venues, inventory, license and saved players.
-- Ports of packages/db/src/{admin/clubs,admin/club-invite,admin/licenses,queue/financials,queue/club-players,
-- queue/club-player-details,queue/club-player-delete}.ts. Reads only, except the one invite-code fill below.

-- name: GetQueueClubSettings :one
SELECT c.id, c.name, c.logo_ref, c.default_players_per_court, c.default_entrance_fee_minor, c.description, c.court_rules,
       c.post_template, c.self_check_in_enabled, c.revision, c.currency, c.founding_address, c.invite_code,
       c.license_pricing, c.license_monthly_minor, c.license_yearly_minor,
       l.display_name AS city, l.country_code, l.city_code,
       a.username
FROM clubs c
JOIN location_codes l ON l.id = c.founding_location_code_id
LEFT JOIN club_accounts a ON a.club_id = c.id
WHERE c.id = @club_id;

-- The newest pending name change: newest request first, then id.
-- name: GetQueueClubPendingNameChange :one
SELECT requested_name, requested_at
FROM club_name_change_requests
WHERE club_id = @club_id AND state = 'pending'
ORDER BY requested_at DESC, id ASC
LIMIT 1;

-- name: GetClubInviteCode :one
SELECT invite_code FROM clubs WHERE id = @club_id;

-- The one write a Queue read makes: a club with no invite code gets one on its first read (writeInviteCode). Prisma's
-- updateMany also stamps updated_at (@updatedAt), so this does too.
-- name: FillClubInviteCode :execrows
UPDATE clubs SET invite_code = @code, revision = revision + 1, updated_at = now() WHERE id = @club_id AND invite_code IS NULL;

-- name: ListQueueClubVenues :many
SELECT id, club_id, name, address, court_fee_per_court_hour_minor, entrance_fee_minor, currency, revision
FROM club_venues
WHERE club_id = @club_id
ORDER BY name ASC, id ASC;

-- name: ListQueueInventory :many
SELECT id, club_id, name, category, unit, stock, unit_cost_minor, currency, removed_at, revision
FROM inventory_items
WHERE club_id = @club_id AND removed_at IS NULL
ORDER BY category ASC, name ASC, id ASC;

-- name: GetQueueLicense :one
SELECT e.effective_access_ends_at, cy.delete_public_pages_after
FROM club_entitlements e
LEFT JOIN club_expiry_cycles cy ON cy.id = e.current_expiry_cycle_id
WHERE e.club_id = @club_id;

-- The club's own license payments table, newest first (readLicenseTerms; no admin names).
-- name: ListQueueLicenseTerms :many
SELECT id, club_id, plan, starts_at, ends_at, activated_at, pricing_at_activation, paid_on, amount_minor, currency,
       payment_reference, notes
FROM club_license_terms
WHERE club_id = @club_id
ORDER BY starts_at DESC, id ASC;

-- The access end the club's entitlement row records, for requireClubEntitlement: no row is no access.
-- name: GetClubAccessEnd :one
SELECT effective_access_ends_at FROM club_entitlements WHERE club_id = @club_id;

-- name: ListQueueClubPlayers :many
SELECT cp.id, cp.club_id, cp.player_id, cp.display_name, cp.nickname, cp.added_at,
       pi.phone_e164 AS input_phone,
       se.id AS entry_id, se.rtr_id AS entry_rtr_id, se.claimed_player_id AS entry_claimed_player_id, se.email AS entry_email,
       (p.id IS NOT NULL)::bool AS has_player,
       p.avatar_ref, p.full_name AS player_full_name, p.nickname AS player_nickname, p.profile_state,
       p.banner_id, pb.image AS banner_image, p.hide_phone_from_clubs,
       pc.phone_e164 AS contact_phone, ida.rtr_id AS player_rtr_id,
       COALESCE((SELECT ca.skill_level_id FROM club_assessments ca WHERE ca.club_player_id = cp.id
         ORDER BY ca.assessed_at DESC, ca.id ASC LIMIT 1), -1)::smallint AS level_id,
       (SELECT count(DISTINCT sp.session_id) FROM session_players sp WHERE sp.club_player_id = cp.id)::int AS sessions_here
FROM club_players cp
LEFT JOIN club_player_private_inputs pi ON pi.club_player_id = cp.id
LEFT JOIN shared_player_entries se ON se.id = cp.shared_entry_id
LEFT JOIN players p ON p.id = cp.player_id
LEFT JOIN profile_banners pb ON pb.id = p.banner_id
LEFT JOIN player_private_contacts pc ON pc.player_id = p.id
LEFT JOIN player_id_allocations ida ON ida.player_id = p.id
WHERE cp.club_id = @club_id AND cp.removed_at IS NULL
ORDER BY cp.display_name ASC, cp.id ASC;

-- name: GetQueueClubPlayerEditable :one
SELECT cp.id, cp.display_name, cp.nickname, cp.player_id, cp.shared_entry_id, cp.removed_at,
       pi.phone_e164 AS input_phone, pi.preset_fields,
       se.email AS entry_email, p.profile_state,
       cp.saved_skill_level_id, cp.saved_level_at, cp.avatar_ref, cp.avatar_previous_ref, COALESCE(al.skill_level_id, -1)::smallint AS assessed_level_id, al.assessed_at AS assessed_at
FROM club_players cp
LEFT JOIN LATERAL (SELECT a.skill_level_id, a.assessed_at FROM club_assessments a WHERE a.club_player_id = cp.id ORDER BY a.assessed_at DESC LIMIT 1) al ON true
LEFT JOIN club_player_private_inputs pi ON pi.club_player_id = cp.id
LEFT JOIN shared_player_entries se ON se.id = cp.shared_entry_id
LEFT JOIN players p ON p.id = cp.player_id
WHERE cp.club_id = @club_id AND cp.id = @club_player_id;

-- name: GetQueueClubPlayerForStats :one
SELECT cp.player_id, p.profile_state, p.show_profile_stats
FROM club_players cp
LEFT JOIN players p ON p.id = cp.player_id
WHERE cp.club_id = @club_id AND cp.id = @club_player_id AND cp.removed_at IS NULL;

-- name: GetQueueSavedClubPlayer :one
SELECT id, display_name, removed_at FROM club_players WHERE club_id = @club_id AND id = @club_player_id;

-- The saved player's live entry in this club's active session (liveEntry): not released, not a no show.
-- name: GetQueueLiveActiveEntry :one
SELECT sp.id, sp.session_id, s.title
FROM session_players sp
JOIN queue_sessions s ON s.id = sp.session_id
WHERE sp.club_id = @club_id AND sp.club_player_id = @club_player_id
  AND sp.released_at IS NULL AND sp.no_show_at IS NULL AND s.state = 'active'
ORDER BY sp.confirmed_at ASC, sp.id ASC
LIMIT 1;

-- Matches in the given states that still hold the entry on court or in the line-up (participation not left).
-- name: CountQueueEntryMatches :one
SELECT count(*)::int
FROM matches m
WHERE m.state::text = ANY(@states::text[])
  AND EXISTS (SELECT 1 FROM match_participations mp WHERE mp.match_id = m.id AND mp.session_player_id = @session_player_id AND mp.left_at IS NULL);

-- Player lookup: the open shared entry for an RTR ID or an email, the registered player for either, and what this
-- club already saved of them.
-- name: GetOpenEntryByRtrID :one
SELECT id, rtr_id FROM shared_player_entries
WHERE rtr_id = @rtr_id AND claimed_player_id IS NULL AND retired_at IS NULL
ORDER BY id LIMIT 1;

-- name: GetOpenEntryByEmail :one
SELECT id, rtr_id FROM shared_player_entries
WHERE email = @email AND claimed_player_id IS NULL AND retired_at IS NULL
ORDER BY id LIMIT 1;

-- name: GetPlayerIDByRtrID :one
SELECT player_id FROM player_id_allocations WHERE rtr_id = @rtr_id;

-- registeredPlayerByEmail: the ROTRA email wins over the Google email when they belong to different accounts.
-- name: GetRegisteredPlayerByContactEmail :one
SELECT c.player_id FROM player_private_contacts c
JOIN players p ON p.id = c.player_id
WHERE c.email = @email AND p.profile_state = 'claimed';

-- name: GetRegisteredPlayerByGoogleEmail :one
SELECT a.player_id FROM player_accounts a
JOIN players p ON p.id = a.player_id
WHERE a.google_email = @email AND p.profile_state = 'claimed';

-- name: GetSavedClubPlayerForEntry :one
SELECT display_name FROM club_players
WHERE club_id = @club_id AND removed_at IS NULL AND shared_entry_id = @entry_id AND player_id IS NULL
ORDER BY id LIMIT 1;

-- name: GetSavedClubPlayerForPlayer :one
SELECT cp.display_name, p.full_name, p.profile_state
FROM club_players cp
LEFT JOIN players p ON p.id = cp.player_id
WHERE cp.club_id = @club_id AND cp.removed_at IS NULL AND cp.player_id = @player_id
ORDER BY cp.id LIMIT 1;

-- A registered player the directory shows: claimed, not hidden, with an RTR ID.
-- name: GetDirectoryPlayer :one
SELECT p.id, p.full_name, p.nickname, p.avatar_ref, p.hide_phone_from_clubs, ida.rtr_id, rc.skill_level_id
FROM players p
JOIN player_id_allocations ida ON ida.player_id = p.id
LEFT JOIN player_rank_current rc ON rc.player_id = p.id
WHERE p.id = @player_id AND p.profile_state = 'claimed' AND NOT p.hidden_from_directory;
