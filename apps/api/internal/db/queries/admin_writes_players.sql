-- The Admin player writes (packages/db/src/admin/player-*.ts, packages/db/src/player/account-verification.ts).
-- Prisma stamps updated_at (@updatedAt) and created_at (@default(now())) with the application clock, so every time
-- here is a parameter.

-- name: LockPlayerForWrite :exec
-- SELECT "id" FROM "players" WHERE "id" = $1 FOR UPDATE: the row lock every player edit takes first. No row is no error.
SELECT id FROM players WHERE id = $1 FOR UPDATE;

-- name: SetPlayerVerificationOverride :one
-- setAdminVerificationOverride: set (verified, the admin, the time) or clear all three; the revision goes up.
UPDATE players
SET verification_override = sqlc.narg('override')::player_verification_override,
    verification_override_by = sqlc.narg('by_admin'), verification_override_at = sqlc.narg('at'),
    revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING revision;

-- name: InsertAccountNotification :exec
-- writePlayerNotifications for one event: a guest or unclaimed profile (no account) has no inbox, and a repeat of the
-- same source writes nothing (createMany skipDuplicates). The notification is of the kind account.
INSERT INTO player_notifications (id, player_id, kind, title, body, target, source_type, source_id, created_at)
SELECT @id, a.player_id, 'account', @title, @body, @target, @source_type, @source_id, @now
FROM player_accounts a
WHERE a.player_id = @player_id
ON CONFLICT DO NOTHING;

-- ---- Add player (createAdminPlayer) ----

-- name: GetClubFoundingPlace :one
-- tx.club.findUnique with the founding location's city code and display name.
SELECT c.id, l.city_code, l.display_name
FROM clubs c
JOIN location_codes l ON l.id = c.founding_location_code_id
WHERE c.id = $1;

-- name: FindRegisteredContact :one
-- tx.playerPrivateContact.findFirst({ OR: [{ phoneE164 }, { email }] }): the contact that already has the number or the
-- email. The TypeScript has no order; the row with the number comes first, then the lower player ID, so the answer
-- never depends on the heap order.
SELECT phone_e164
FROM player_private_contacts
WHERE phone_e164 = @phone OR (sqlc.narg('email')::text IS NOT NULL AND email = sqlc.narg('email')::text)
ORDER BY (phone_e164 = @phone) DESC, player_id
LIMIT 1;

-- name: FindSavedClubPlayerByPhone :one
-- tx.clubPlayer.findFirst: a current record of this club whose private intake has the number. The TypeScript has no
-- order; the oldest record comes first, then the lower ID.
SELECT cp.display_name
FROM club_players cp
JOIN club_player_private_inputs i ON i.club_player_id = cp.id AND i.club_id = cp.club_id
WHERE cp.club_id = @club_id AND cp.removed_at IS NULL AND i.phone_e164 = @phone
ORDER BY cp.added_at, cp.id
LIMIT 1;

-- name: InsertClubPlayer :exec
-- tx.clubPlayer.create: the club's unclaimed record. No global player and no shared entry.
INSERT INTO club_players (id, club_id, display_name, nickname, added_at, created_at, updated_at)
VALUES (@id, @club_id, @display_name, @nickname, @now, @now, @now);

-- name: InsertClubPlayerPrivateInput :exec
-- tx.clubPlayerPrivateInput.create: the private intake of the record (the state is the column default, pending).
INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, email, captured_at, created_at, updated_at)
VALUES (@club_player_id, @club_id, @phone, @email, @now, @now, @now);

-- ---- Edit player: the profile and contacts (saveAdminPlayerCore) ----

-- name: FindSharedEntryID :one
-- prisma.sharedPlayerEntry.findUnique({ where: { id }, select: { id: true } }).
SELECT id FROM shared_player_entries WHERE id = $1;

-- name: GetPlayerForEdit :one
-- tx.player.findUniqueOrThrow after the row lock.
SELECT id, full_name, nickname, avatar_ref, avatar_previous_ref, profile_visibility, experience_months,
       experience_recorded_at, revision
FROM players WHERE id = $1;

-- name: GetShownCharacter :one
-- tx.profileCharacter.findFirst({ where: { id, shown: true, deletedAt: null } }).
SELECT id FROM profile_characters WHERE id = $1 AND shown AND deleted_at IS NULL;

-- name: FindInFlightRequest :one
-- A contact change that is approved, being applied or failed: for this field (a phone edit), or for any (an email edit).
SELECT id FROM player_contact_change_requests
WHERE player_id = @player_id AND status IN ('approved', 'applying', 'failed')
  AND (sqlc.narg('field')::contact_change_field IS NULL OR field = sqlc.narg('field')::contact_change_field)
ORDER BY requested_at, id
LIMIT 1;

-- name: GetPrivateContactOfPlayer :one
SELECT phone_e164, email, revision FROM player_private_contacts WHERE player_id = $1;

-- name: GetContactPlayerByPhone :one
SELECT player_id FROM player_private_contacts WHERE phone_e164 = $1;

-- name: GetContactPlayerByEmail :one
SELECT player_id FROM player_private_contacts WHERE email = $1;

-- name: ListPendingContactRequests :many
-- findMany without an order in the TypeScript; the oldest request comes first, then the lower ID.
SELECT id FROM player_contact_change_requests
WHERE player_id = $1 AND field = $2 AND status = 'pending'
ORDER BY requested_at, id;

-- name: SupersedeContactRequest :exec
-- A pending request that an Admin edit of the same contact overtakes.
UPDATE player_contact_change_requests
SET status = 'rejected', reviewed_by_admin_id = @admin_id, reviewed_at = @now, rejected_at = @now, superseded_at = @now,
    resolution_note = 'Superseded by an Admin edit', revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: SetContactPhone :one
UPDATE player_private_contacts
SET phone_e164 = @phone, phone_verified_at = NULL, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id
RETURNING revision;

-- name: SyncAccountContactVersion :exec
-- tx.playerAccount.updateMany({ where: { playerId, contactSyncStatus: 'in_sync' } }): an account being applied or failed stays.
UPDATE player_accounts
SET contact_sync_version = @version, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id AND contact_sync_status = 'in_sync';

-- name: UpdatePlayerFromEdit :one
-- The profile columns of an Admin edit. Each group is written only when its flag is set (the spread of the TypeScript's
-- update data); the name, the nickname and the revision always are.
UPDATE players
SET full_name = @full_name, nickname = @nickname,
    avatar_ref = CASE WHEN @set_avatar::bool THEN sqlc.narg('avatar_ref')::text ELSE avatar_ref END,
    avatar_previous_ref = CASE WHEN @set_avatar::bool THEN sqlc.narg('avatar_previous_ref')::text ELSE avatar_previous_ref END,
    -- mergeDetails: the playing style laid over the stored details (an object; anything else reads as empty), so the getting-to-know
    -- answers kept beside it survive.
    personal_details = CASE WHEN @set_style::bool THEN (CASE WHEN jsonb_typeof(personal_details) = 'object' THEN personal_details ELSE '{}'::jsonb END) || @personal_details::jsonb ELSE personal_details END,
    details_version = CASE WHEN @set_style::bool THEN 1 ELSE details_version END,
    experience_months = CASE WHEN @set_experience::bool THEN sqlc.narg('experience_months')::int ELSE experience_months END,
    experience_recorded_at = CASE WHEN @set_experience::bool THEN sqlc.narg('experience_recorded_at')::timestamptz ELSE experience_recorded_at END,
    profile_visibility = CASE WHEN @set_visibility::bool THEN @visibility::profile_visibility ELSE profile_visibility END,
    hide_phone_from_clubs = CASE WHEN @set_phone_privacy::bool THEN @hide_phone::bool ELSE hide_phone_from_clubs END,
    revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING revision;

-- name: BumpPlayerRevision :one
-- tx.player.update({ data: { revision: { increment: 1 } } }): the name and nickname it answers are the ones the audit names.
UPDATE players SET revision = revision + 1, updated_at = @now WHERE id = @id RETURNING full_name, nickname, revision;

-- ---- Edit player: the RTR ID (player-rtr-id.ts, shared-entry.ts replaceRtrId) ----

-- name: RtrIDIsHeld :one
-- refuseTakenRtrId: a shared entry or an allocation already has this RTR ID.
SELECT EXISTS (SELECT 1 FROM shared_player_entries e WHERE e.rtr_id = $1) OR EXISTS (SELECT 1 FROM player_id_allocations al WHERE al.rtr_id = $1) AS held;

-- name: GetPlayerAllocationRtrID :one
SELECT rtr_id FROM player_id_allocations WHERE player_id = $1;

-- name: GetLocationByCodes :one
SELECT id, country_code, city_code FROM location_codes WHERE country_code = $1 AND city_code = $2;

-- name: RtrIDIsTakenElsewhere :one
-- replaceRtrId: the new RTR ID, or the same number at the place and day, belongs to another record than the ones that hold
-- the old string.
SELECT EXISTS (
  SELECT 1 FROM shared_player_entries e
  WHERE (e.rtr_id = @rtr_id OR (e.location_code_id = @location_id AND e.sync_date = @sync_date AND e.sequence = @sequence)) AND e.rtr_id <> @from_rtr_id
) OR EXISTS (
  SELECT 1 FROM player_id_allocations al
  WHERE (al.rtr_id = @rtr_id OR (al.location_code_id = @location_id AND al.sync_date = @sync_date AND al.sequence = @sequence)) AND al.rtr_id <> @from_rtr_id
) AS taken;

-- name: RaiseRtrCounter :exec
-- The counter of the place and day is raised to at least this number, so it never hands the number out again.
INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence)
VALUES (@location_id, @sync_date, @sequence)
ON CONFLICT (location_code_id, sync_date) DO UPDATE SET last_sequence = GREATEST(player_id_counters.last_sequence, EXCLUDED.last_sequence);

-- name: MoveSharedEntriesRtrID :execrows
UPDATE shared_player_entries
SET rtr_id = @rtr_id, location_code_id = @location_id, country_code = @country_code, city_code = @city_code,
    sync_date = @sync_date, revision = revision + 1, updated_at = @now
WHERE rtr_id = @from_rtr_id;

-- name: AllowRtrIDChange :exec
-- player_id_allocations is append-only except this change, allowed by its trigger only while this transaction-local
-- setting is on (migration 20261118000500_shared_player_entries).
SELECT set_config('rotra.rtr_id_change', @state::text, true);

-- name: MoveAllocationsRtrID :execrows
UPDATE player_id_allocations
SET rtr_id = @rtr_id, location_code_id = @location_id, country_code = @country_code, city_code = @city_code, sync_date = @sync_date
WHERE rtr_id = @from_rtr_id;

-- ---- Edit player: the email of a registered player (player-edit-email.ts) ----

-- name: LockPlayerRevision :one
SELECT revision FROM players WHERE id = $1 FOR UPDATE;

-- name: GetPlayerAccountForEdit :one
SELECT auth_subject, contact_sync_status FROM player_accounts WHERE player_id = $1;

-- name: GetPendingEmailEdit :one
SELECT id, original_email, proposed_email FROM admin_player_email_edits
WHERE player_id = $1 AND state = 'pending'
ORDER BY created_at, id
LIMIT 1;

-- name: InsertEmailEdit :one
INSERT INTO admin_player_email_edits (id, player_id, admin_id, original_email, proposed_email, contact_revision, state, created_at, updated_at)
VALUES (@id, @player_id, @admin_id, @original_email, @proposed_email, @contact_revision, 'pending', @now, @now)
RETURNING id, original_email, proposed_email;

-- name: SetAccountSyncStatus :exec
-- The account's contact sync state with one revision more (applying while an email change is staged, in sync when it ends).
UPDATE player_accounts
SET contact_sync_status = @status::player_contact_sync_status, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id;

-- name: MarkEmailEditFailed :exec
UPDATE admin_player_email_edits SET state = 'failed', updated_at = @now WHERE id = @id AND state = 'pending';

-- name: SetContactEmail :one
UPDATE player_private_contacts
SET email = @email, email_verified_at = NULL, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id
RETURNING revision;

-- name: SetAccountSynced :exec
UPDATE player_accounts
SET contact_sync_status = 'in_sync', contact_sync_version = @version, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id;

-- name: MarkEmailEditApplied :exec
UPDATE admin_player_email_edits SET state = 'applied', updated_at = @now WHERE id = @id;

-- ---- Edit player: an unclaimed person's shared entry (saveAdminSharedEntry) ----

-- name: LockOpenSharedEntry :one
SELECT id FROM shared_player_entries WHERE id = $1 AND claimed_player_id IS NULL AND retired_at IS NULL FOR UPDATE;

-- name: GetSharedEntryRevision :one
SELECT revision FROM shared_player_entries WHERE id = $1;

-- name: LockEmailAddress :exec
-- lockEmail: serializes everything that reads and then writes one email (entry creation, claims, Admin edits). The key is
-- the TypeScript's, so a Go and a Next.js write of one email queue.
SELECT pg_advisory_xact_lock(hashtext('email:' || @email::text));

-- name: EmailIsTakenForEntry :one
-- A registered player's ROTRA or Google email, another entry's email or any private contact's email.
SELECT EXISTS (SELECT 1 FROM player_private_contacts c JOIN players p ON p.id = c.player_id WHERE c.email = @email AND p.profile_state = 'claimed')
    OR EXISTS (SELECT 1 FROM player_accounts a JOIN players p ON p.id = a.player_id WHERE a.google_email = @email AND p.profile_state = 'claimed')
    OR EXISTS (SELECT 1 FROM shared_player_entries e WHERE e.email = @email AND e.id <> @entry_id)
    OR EXISTS (SELECT 1 FROM player_private_contacts c2 WHERE c2.email = @email) AS taken;

-- name: SetSharedEntryEmail :exec
UPDATE shared_player_entries SET email = @email, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: BumpSharedEntryRevision :exec
UPDATE shared_player_entries SET revision = revision + 1, updated_at = @now WHERE id = @id;
