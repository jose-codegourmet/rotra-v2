-- Fictional players and stored rank rows for the leaderboard characterization (P-LEADERBOARD).
-- Applied on top of the Prisma migrations, which already seed skill_levels, the six profile banners
-- (court is the default) and one ranking policy version. Used by the Go tests and by
-- apps/api/testdata/tools/capture-leaderboard.test.mjs, so both read the same rows.

-- A deleted, hidden upload that a player keeps (the library hides it from new picks only).
INSERT INTO profile_banners (id, image, shown, uploaded_at, number, deleted_at)
VALUES ('b0000000-0000-4000-8000-000000000001', 'https://example.test/banner-one.png', false,
        TIMESTAMPTZ '2026-11-12 00:00:00+00', 7, TIMESTAMPTZ '2026-11-13 00:00:00+00');

INSERT INTO players (id, full_name, nickname, avatar_ref, profile_visibility, banner_id, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Alice Reyes',        'Ace',    'https://example.test/alice.png', 'public',         'night', now()),
  ('a0000000-0000-4000-8000-000000000002', 'Bob Santos',         NULL,     NULL,                             'private',        NULL,    now()),
  ('a0000000-0000-4000-8000-000000000003', 'Carla Dizon',        'CD',     NULL,                             'public',         'sun',   now()),
  ('a0000000-0000-4000-8000-000000000004', 'Élodie Ñandú',       'Ellie',  'https://example.test/elodie.png','always_private', 'ember', now()),
  ('a0000000-0000-4000-8000-000000000005', '  😀 Smile   Lee ',  'Smiley', NULL,                             'always_private', NULL,    now()),
  ('a0000000-0000-4000-8000-000000000006', 'Eve Alcala',         'Ali',    NULL,                             'public',         'b0000000-0000-4000-8000-000000000001', now()),
  ('a0000000-0000-4000-8000-000000000007', 'Frank Uy',           'Ace',    NULL,                             'private',        NULL,    now()),
  ('a0000000-0000-4000-8000-000000000008', 'Gina Not Eligible',  NULL,     NULL,                             'public',         NULL,    now()),
  ('a0000000-0000-4000-8000-000000000009', 'Hal Unranked',       NULL,     NULL,                             'public',         NULL,    now()),
  ('a0000000-0000-4000-8000-00000000000a', 'Ida Other Version',  NULL,     NULL,                             'public',         NULL,    now()),
  ('a0000000-0000-4000-8000-00000000000b', 'Jon No Level',       NULL,     NULL,                             'public',         NULL,    now()),
  ('a0000000-0000-4000-8000-00000000000c', 'Percent 100% Real',  'a_c',    NULL,                             'public',         NULL,    now()),
  ('a0000000-0000-4000-8000-00000000000d', 'Zoë Ångström',       NULL,     NULL,                             'public',         NULL,    now());

-- Listed (approved version, eligible, rank and level stored): 01..07, 0c and 0d. 02 and 03 tie on 80.
-- Not listed: 08 (not eligible), 09 (no rank), 0a (another algorithm version), 0b (no level).
INSERT INTO player_rank_current (player_id, skill_level_id, numeric_rank, state, input_counts, policy_version_id,
  algorithm_version, window_start, window_end, calculated_at, input_watermark, next_recheck_at,
  recent_standard_match_count, leaderboard_eligible, updated_at)
SELECT v.player_id::uuid, v.skill_level_id, v.numeric_rank, 'established', '{}'::jsonb,
       (SELECT id FROM ranking_policy_versions ORDER BY version LIMIT 1),
       v.algorithm_version, TIMESTAMPTZ '2026-01-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00',
       TIMESTAMPTZ '2026-11-01 00:00:00+00', 1, TIMESTAMPTZ '2026-12-01 00:00:00+00', 12, v.eligible, now()
FROM (VALUES
  ('a0000000-0000-4000-8000-000000000001', 8::smallint, 90.5::numeric,  'rank-test-v1', true),
  ('a0000000-0000-4000-8000-000000000002', 7::smallint, 80::numeric,    'rank-test-v1', true),
  ('a0000000-0000-4000-8000-000000000003', 6::smallint, 80.000000::numeric, 'rank-test-v1', true),
  ('a0000000-0000-4000-8000-000000000004', 5::smallint, 75.25::numeric, 'rank-test-v1', true),
  ('a0000000-0000-4000-8000-000000000005', 4::smallint, 60::numeric,    'rank-test-v1', true),
  ('a0000000-0000-4000-8000-000000000006', 3::smallint, 50::numeric,    'rank-test-v1', true),
  ('a0000000-0000-4000-8000-000000000007', 0::smallint, 40::numeric,    'rank-test-v1', true),
  ('a0000000-0000-4000-8000-000000000008', 2::smallint, 99::numeric,    'rank-test-v1', false),
  ('a0000000-0000-4000-8000-000000000009', NULL::smallint, NULL::numeric, 'rank-test-v1', false),
  ('a0000000-0000-4000-8000-00000000000a', 8::smallint, 95::numeric,    'other-v0',     true),
  ('a0000000-0000-4000-8000-00000000000b', NULL::smallint, 70::numeric, 'rank-test-v1', true),
  ('a0000000-0000-4000-8000-00000000000c', 1::smallint, 30::numeric,    'rank-test-v1', true),
  ('a0000000-0000-4000-8000-00000000000d', 0::smallint, 20::numeric,    'rank-test-v1', true)
) AS v(player_id, skill_level_id, numeric_rank, algorithm_version, eligible);
