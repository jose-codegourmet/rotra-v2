-- The Admin app's GET reads (go-signed-in-reads 2.1). Ports of the Prisma calls in packages/db/src/admin/{clubs,
-- configuration,licenses,sales,audit,players,profile-banners,profile-characters}.ts and
-- packages/db/src/player/{contact-change,account-verification}.ts. Every ordering is the one the Prisma call asks for.

-- ---- feature flags, ranking settings, club identity index, license operation ----

-- name: ListAdminFeatureFlags :many
SELECT f.key, f.name, f.description, f.value, f.created_at, f.updated_at, f.revision,
       cb.display_name AS created_by_name, ub.display_name AS updated_by_name
FROM feature_flags f
LEFT JOIN admin_accounts cb ON cb.id = f.created_by_admin_id
LEFT JOIN admin_accounts ub ON ub.id = f.updated_by_admin_id
ORDER BY f.created_at ASC, f.key ASC;

-- name: ListAdminRankingPolicies :many
SELECT v.id, v.version, v.effective_at, v.assessment_weight_bp, v.performance_weight_bp,
       v.recent_standard_match_threshold, v.algorithm_version, v.change_note, v.created_at,
       cb.display_name AS created_by_name
FROM ranking_policy_versions v
LEFT JOIN admin_accounts cb ON cb.id = v.created_by_admin_id
ORDER BY v.version ASC;

-- name: ListClubNames :many
SELECT name FROM clubs;

-- name: ListClubUsernames :many
SELECT username FROM club_accounts;

-- name: GetLicenseTermByCommand :one
SELECT t.id, t.club_id, t.plan, t.starts_at, t.ends_at, t.activated_at, t.pricing_at_activation, t.paid_on,
       t.amount_minor, t.currency, t.payment_reference, t.notes, t.source_command_id, t.activated_by_admin_id
FROM club_license_terms t
WHERE t.source_command_id = @command_id;

-- name: CountEarlierLicenseTerms :one
SELECT count(*) FROM club_license_terms WHERE club_id = @club_id AND activated_at < @activated_at;

-- name: ListAdminProfileBanners :many
SELECT id, image, shown, uploaded_at, number, is_default
FROM profile_banners
WHERE deleted_at IS NULL
ORDER BY uploaded_at ASC, number ASC;

-- name: ListAdminProfileCharacters :many
SELECT id, image, shown, uploaded_at, number
FROM profile_characters
WHERE deleted_at IS NULL
ORDER BY uploaded_at ASC, number ASC;

-- ---- clubs ----

-- name: ListAdminClubs :many
-- readAdminClubDirectory: each club with its account row (if any) and founding city. A null club id lists them all.
SELECT c.id, c.name, c.logo_ref, c.founding_location_code_id, c.founding_address, c.license_pricing,
       c.license_monthly_minor, c.license_yearly_minor, c.currency, c.created_at, c.revision,
       (a.club_id IS NOT NULL)::boolean AS has_account, a.username, a.provisioned_at, a.disabled_at,
       l.country_code, l.city_code, l.display_name AS city_name
FROM clubs c
JOIN location_codes l ON l.id = c.founding_location_code_id
LEFT JOIN club_accounts a ON a.club_id = c.id
WHERE sqlc.narg('club_id')::uuid IS NULL OR c.id = sqlc.narg('club_id')::uuid
ORDER BY c.created_at DESC, c.id ASC;

-- name: ListAdminClubTerms :many
SELECT t.id, t.club_id, t.plan, t.starts_at, t.ends_at, t.activated_at, t.pricing_at_activation, t.paid_on,
       t.amount_minor, t.currency, t.payment_reference, t.notes, t.source_command_id, t.activated_by_admin_id,
       ad.display_name AS activated_by_name
FROM club_license_terms t
LEFT JOIN admin_accounts ad ON ad.id = t.activated_by_admin_id
WHERE t.club_id = ANY (@club_ids::uuid[])
ORDER BY t.starts_at DESC, t.id ASC;

-- name: ListPendingClubNameRequests :many
-- The newest pending request of each club (at most one is pending: a unique index says so).
SELECT DISTINCT ON (club_id) club_id, id, requested_name, requested_at
FROM club_name_change_requests
WHERE state = 'pending' AND club_id = ANY (@club_ids::uuid[])
ORDER BY club_id, requested_at DESC, id ASC;

-- name: ListRunningClubSessions :many
-- The latest running session of each club: active or finalizing.
SELECT DISTINCT ON (club_id) club_id, title, venue_name, started_at
FROM queue_sessions
WHERE state IN ('active', 'finalizing') AND club_id = ANY (@club_ids::uuid[])
ORDER BY club_id, started_at DESC, id ASC;

-- name: ListClubEarlierNames :many
-- The `before` of each approved name change, oldest first; a before that is not a string is skipped.
SELECT target_id, (metadata->>'before')::text AS before_name
FROM admin_audit_events
WHERE target_type = 'club' AND action = 'club.name_change_approved'
  AND target_id = ANY (@club_ids::text[])
  AND jsonb_typeof(metadata) = 'object' AND jsonb_typeof(metadata->'before') = 'string'
ORDER BY occurred_at ASC, id ASC;

-- ---- sales ----

-- The rotra_sales_* functions return TABLE rows that sqlc cannot type, so each row comes back as JSON and is decoded
-- in Go (the keys are the function's column names). The database role needs EXECUTE on them (the migration revokes it
-- from PUBLIC).

-- name: ListSalesPlatformBuckets :many
SELECT to_jsonb(b)::jsonb AS row FROM public.rotra_sales_platform_buckets(@period::text, @today::date) b;

-- name: ListSalesRevenueByPlan :many
SELECT to_jsonb(r)::jsonb AS row FROM public.rotra_sales_revenue_by_plan(@period::text, @today::date) r;

-- name: ListSalesRecentPayments :many
SELECT to_jsonb(r)::jsonb AS row FROM public.rotra_sales_recent_payments(@period::text, @today::date, @max_rows::integer) r;

-- name: ListSalesMostActiveClubs :many
SELECT to_jsonb(r)::jsonb AS row FROM public.rotra_sales_most_active_clubs(@period::text, @today::date, @max_rows::integer) r;

-- name: GetClubSalesPricing :one
SELECT license_pricing, license_monthly_minor FROM clubs WHERE id = @id;

-- name: ListSalesClubMonths :many
SELECT to_jsonb(r)::jsonb AS row FROM public.rotra_sales_club_months(@club_id::uuid, @today::date, @months::integer) r;

-- ---- players ----

-- name: ListAdminPlayerRows :many
-- readAdminPlayerDirectory, the players with an allocated RTR ID. A null id lists them all.
SELECT p.id, p.full_name, p.nickname, p.avatar_ref, p.profile_state, p.hide_phone_from_clubs, p.revision, p.gender,
       (pc.player_id IS NOT NULL)::boolean AS has_contact, pc.phone_e164, pc.email,
       acc.claimed_at, (acc.player_id IS NOT NULL)::boolean AS has_account, acc.google_email,
       COALESCE(p.verification_override = 'verified', false)::boolean AS verified_override,
       al.rtr_id, al.creating_club_id, al.city_code, loc.display_name AS city_name,
       (rc.player_id IS NOT NULL)::boolean AS has_rank, rc.recent_standard_match_count, rc.leaderboard_eligible,
       sl.display_order AS level_order, sl.label AS level_label, pv.recent_standard_match_threshold
FROM players p
JOIN player_id_allocations al ON al.player_id = p.id
JOIN location_codes loc ON loc.id = al.location_code_id
LEFT JOIN player_private_contacts pc ON pc.player_id = p.id
LEFT JOIN player_accounts acc ON acc.player_id = p.id
LEFT JOIN player_rank_current rc ON rc.player_id = p.id
LEFT JOIN skill_levels sl ON sl.id = rc.skill_level_id
LEFT JOIN ranking_policy_versions pv ON pv.id = rc.policy_version_id
WHERE sqlc.narg('player_id')::uuid IS NULL OR p.id = sqlc.narg('player_id')::uuid
ORDER BY p.id ASC;

-- name: ListAdminPlayerClubRecords :many
-- Every club record of the players (removed ones too), oldest first.
SELECT cp.player_id, cp.club_id, cp.nickname, cp.added_at, c.name AS club_name
FROM club_players cp
JOIN clubs c ON c.id = cp.club_id
WHERE cp.player_id = ANY (@player_ids::uuid[])
ORDER BY cp.added_at ASC, cp.id ASC;

-- name: ListAdminSharedEntries :many
-- The open shared entries of unclaimed people (readSharedEntryRows). A null id lists them all.
SELECT e.id, e.email, e.rtr_id, e.creating_club_id, e.city_code, e.revision, e.allocated_at,
       loc.display_name AS city_name
FROM shared_player_entries e
JOIN location_codes loc ON loc.id = e.location_code_id
WHERE e.claimed_player_id IS NULL AND e.retired_at IS NULL
  AND (sqlc.narg('id')::uuid IS NULL OR e.id = sqlc.narg('id')::uuid)
ORDER BY e.allocated_at ASC, e.id ASC;

-- name: ListAdminSharedEntryRecords :many
SELECT cp.shared_entry_id, cp.club_id, cp.display_name, cp.nickname, cp.added_at, c.name AS club_name,
       pi.phone_e164
FROM club_players cp
JOIN clubs c ON c.id = cp.club_id
LEFT JOIN club_player_private_inputs pi ON pi.club_player_id = cp.id
WHERE cp.shared_entry_id = ANY (@entry_ids::uuid[]) AND cp.removed_at IS NULL AND cp.player_id IS NULL
ORDER BY cp.added_at ASC, cp.id ASC;

-- name: ListAdminClubOnlyRecords :many
-- readClubOnlyRecords: a club record with a phone, no email entry, no player. A null id lists them all.
SELECT cp.id, cp.club_id, cp.display_name, cp.nickname, cp.added_at, cp.revision, c.name AS club_name,
       loc.city_code, loc.display_name AS city_name, pi.phone_e164, pi.email
FROM club_players cp
JOIN clubs c ON c.id = cp.club_id
JOIN location_codes loc ON loc.id = c.founding_location_code_id
JOIN club_player_private_inputs pi ON pi.club_player_id = cp.id
WHERE cp.player_id IS NULL AND cp.shared_entry_id IS NULL AND cp.removed_at IS NULL
  AND pi.phone_e164 IS NOT NULL
  AND (sqlc.narg('id')::uuid IS NULL OR cp.id = sqlc.narg('id')::uuid)
ORDER BY cp.added_at ASC, cp.id ASC;

-- name: GetAdminPlayerEditExtras :one
SELECT p.full_name, p.nickname, p.avatar_previous_ref, p.personal_details, p.experience_months, p.experience_recorded_at,
       p.profile_visibility, p.show_profile_stats, (pc.player_id IS NOT NULL)::boolean AS has_contact
FROM players p
LEFT JOIN player_private_contacts pc ON pc.player_id = p.id
WHERE p.id = @id;

-- name: GetPlayerPasswordSetAt :one
SELECT occurred_at FROM admin_audit_events
WHERE target_type = 'player' AND target_id = @player_id::text AND action = 'player.password_set'
ORDER BY occurred_at DESC, id DESC
LIMIT 1;

-- name: ExistsPlayerAllocation :one
SELECT EXISTS (SELECT 1 FROM player_id_allocations WHERE player_id = @player_id);

-- name: ListSharedEntryClubRecordIds :many
SELECT id, club_id FROM club_players WHERE shared_entry_id = @entry_id AND player_id IS NULL;

-- ---- contact-change requests ----

-- name: ListAdminContactRequests :many
-- readAdminContactChangeRequests: every request (or the one), newest first, with its player and current contacts.
SELECT r.id, r.player_id, r.field, r.source, r.proposed_value, r.original_value, r.status, r.requested_at,
       r.approved_at, r.applied_at, r.rejected_at, r.superseded_at, r.failure_code,
       p.full_name, p.nickname, al.rtr_id,
       (acc.player_id IS NOT NULL)::boolean AS claimed,
       pc.phone_e164, pc.email
FROM player_contact_change_requests r
JOIN players p ON p.id = r.player_id
LEFT JOIN player_id_allocations al ON al.player_id = p.id
LEFT JOIN player_accounts acc ON acc.player_id = p.id
LEFT JOIN player_private_contacts pc ON pc.player_id = p.id
WHERE sqlc.narg('request_id')::uuid IS NULL OR r.id = sqlc.narg('request_id')::uuid
ORDER BY r.requested_at DESC, r.id ASC;

-- name: ListFirstClubNicknames :many
-- The first club record (oldest) of each player that has a nickname (an empty one counts as none).
SELECT DISTINCT ON (player_id) player_id, nickname
FROM club_players
WHERE player_id = ANY (@player_ids::uuid[]) AND nickname IS NOT NULL AND nickname <> ''
ORDER BY player_id, added_at ASC, id ASC;

-- name: ListContactRequestSiblings :many
SELECT id, player_id, field, original_value, proposed_value, status, requested_at
FROM player_contact_change_requests
WHERE player_id = ANY (@player_ids::uuid[]);

-- name: ListContactHolders :many
-- Whoever holds one of the proposed phones or emails now: the player behind the contact, with the RTR ID.
SELECT pc.player_id, pc.phone_e164, pc.email, p.full_name, al.rtr_id
FROM player_private_contacts pc
JOIN players p ON p.id = pc.player_id
LEFT JOIN player_id_allocations al ON al.player_id = p.id
WHERE pc.phone_e164 = ANY (@phones::text[]) OR pc.email = ANY (@emails::text[]);

-- ---- audit events ----

-- name: ListAdminAuditEvents :many
-- readAuditEvents: kind is 'request' (a contact-change request), 'player' or 'club'. Newest first.
SELECT e.id, e.action, e.target_id, e.occurred_at, e.metadata, ad.display_name AS actor_name
FROM admin_audit_events e
JOIN admin_accounts ad ON ad.id = e.actor_admin_id
WHERE (@kind::text = 'request' AND e.target_type = 'player' AND e.action = ANY (@contact_actions::text[])
       AND e.metadata->'requestId' = to_jsonb(@target_id::text))
   OR (@kind::text = 'player' AND e.target_type = 'player' AND e.target_id = @target_id::text
       AND NOT (e.action = ANY (@contact_actions::text[])))
   OR (@kind::text = 'club' AND e.target_type = 'club' AND e.target_id = @target_id::text)
ORDER BY e.occurred_at DESC, e.id DESC;

-- name: ListAuditClubs :many
SELECT c.id, c.license_pricing, c.license_monthly_minor, c.license_yearly_minor, a.username
FROM clubs c
LEFT JOIN club_accounts a ON a.club_id = c.id
WHERE c.id = ANY (@ids::uuid[]);

-- name: ListAuditTerms :many
SELECT id, plan, starts_at, ends_at, amount_minor, payment_reference
FROM club_license_terms
WHERE id = ANY (@ids::uuid[]);

-- name: ListAuditRejectedNameRequests :many
SELECT club_id, requested_name, reviewed_at
FROM club_name_change_requests
WHERE club_id = ANY (@club_ids::uuid[]) AND state = 'rejected';

-- name: ListAuditPriceChanges :many
SELECT target_id, metadata
FROM admin_audit_events
WHERE target_type = 'club' AND target_id = ANY (@club_ids::text[]) AND action = 'club.price_changed'
ORDER BY occurred_at ASC, id ASC;

-- name: ListAuditPlayerNames :many
SELECT id, full_name FROM players WHERE id = ANY (@ids::uuid[]);
