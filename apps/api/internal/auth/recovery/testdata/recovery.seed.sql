-- Fictional players, accounts and issued reset links for the recovery characterization (P-FORGOT and the refused
-- P-RESET). Applied on top of the Prisma migrations. Every link's token is the text in the sha256() call, so the
-- cases refer to links by those words. Foreign key checks are off for this load (replica role): rows only exist
-- to give the routes something to read. The accounts are 'supabase' provider ones, as the TypeScript knows them;
-- every link here is one that BOTH implementations refuse before any sign-in provider would be called, so the
-- Go answer is compared with the real Route Handler's.
-- Hand written; rerun apps/api/testdata/tools/capture-recovery.test.mjs after any change.
BEGIN;
SET LOCAL session_replication_role = replica;

INSERT INTO players (id, full_name, profile_state, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Ana Reyes', 'claimed', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000004', 'Dan Uy', 'claimed', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000005', 'Eve Tan', 'claimed', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000006', 'Fay Go', 'claimed', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000007', 'Gus Ong', 'claimed', TIMESTAMPTZ '2026-10-01 00:00:00+00');

INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', '+639175550101', 'ana@club.test', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000004', '+639175550104', 'dan@club.test', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000005', '+639175550105', 'eve@club.test', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000006', '+639175550106', 'fay-new@club.test', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000007', '+639175550107', 'gus@club.test', TIMESTAMPTZ '2026-10-01 00:00:00+00');

INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, contact_sync_status, disabled_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'supabase', 'e0000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'in_sync', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000004', 'supabase', 'e0000000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'in_sync', TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000005', 'supabase', 'e0000000-0000-4000-8000-000000000005', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'failed', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000006', 'supabase', 'e0000000-0000-4000-8000-000000000006', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'in_sync', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('a0000000-0000-4000-8000-000000000007', 'supabase', 'e0000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'in_sync', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00');

INSERT INTO admin_accounts (id, auth_provider, auth_subject, display_name, updated_at) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'supabase', 'f1000000-0000-4000-8000-000000000001', 'Owner Olive', TIMESTAMPTZ '2026-10-01 00:00:00+00');

-- Issued links. The request asked for the email the account had; each one fails a check of consumeReviewedResetToken.
INSERT INTO player_password_reset_requests (id, email, player_id, status, requested_at, reviewed_by_admin_id, reviewed_at, auth_subject, token_digest, updated_at) VALUES
  ('b0000000-0000-4000-8000-000000000004', 'dan@club.test', 'a0000000-0000-4000-8000-000000000004', 'issued', TIMESTAMPTZ '2026-11-17 08:00:00+00', 'f0000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-17 09:00:00+00', 'e0000000-0000-4000-8000-000000000004', sha256('tok-disabled'::bytea), TIMESTAMPTZ '2026-11-17 09:00:00+00'),
  ('b0000000-0000-4000-8000-000000000005', 'eve@club.test', 'a0000000-0000-4000-8000-000000000005', 'issued', TIMESTAMPTZ '2026-11-17 08:00:00+00', 'f0000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-17 09:00:00+00', 'e0000000-0000-4000-8000-000000000005', sha256('tok-sync'::bytea), TIMESTAMPTZ '2026-11-17 09:00:00+00'),
  ('b0000000-0000-4000-8000-000000000006', 'fay@club.test', 'a0000000-0000-4000-8000-000000000006', 'issued', TIMESTAMPTZ '2026-11-17 08:00:00+00', 'f0000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-17 09:00:00+00', 'e0000000-0000-4000-8000-000000000006', sha256('tok-moved'::bytea), TIMESTAMPTZ '2026-11-17 09:00:00+00'),
  ('b0000000-0000-4000-8000-000000000007', 'gus@club.test', 'a0000000-0000-4000-8000-000000000007', 'issued', TIMESTAMPTZ '2026-11-17 08:00:00+00', 'f0000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-17 09:00:00+00', 'e0000000-0000-4000-8000-0000000000ff', sha256('tok-mismatch'::bytea), TIMESTAMPTZ '2026-11-17 09:00:00+00');

COMMIT;
