-- D-2026-11-08-02 / #541: request-time comparison of two players' final counted matches.
-- SQL-only draft: no schema models change, no pair table, worker, cron or extra finalization work.
-- The Route Handler supplies the verified viewer ID. This function is server-only, never an RPC
-- grant to a Supabase client role. Invoker privileges and existing RLS remain in effect.
CREATE FUNCTION public.rotra_player_compare(p_viewer_id uuid, p_other_id uuid)
RETURNS TABLE (
  match_id uuid,
  format public.match_format,
  together boolean,
  me_won boolean,
  viewer_team public.team_side,
  team_a_score integer,
  team_b_score integer,
  finished_at timestamptz,
  session_id uuid,
  session_title text,
  club_id uuid,
  club_name text,
  mine jsonb,
  theirs jsonb
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH identified_facts AS (
    -- Same identity rule as readPlayerMatchHistory: original identity OR an active reviewed
    -- guest-history attribution. UNION deduplicates a fact found by both paths.
    SELECT f.player_id_at_finalization AS identity_id, f.*
    FROM public.player_match_facts f
    WHERE f.player_id_at_finalization IN (p_viewer_id, p_other_id)
    UNION
    SELECT a.player_id AS identity_id, f.*
    FROM public.player_history_attributions a
    JOIN public.player_match_facts f
      ON f.club_id = a.club_id AND f.club_player_id = a.club_player_id
    WHERE a.player_id IN (p_viewer_id, p_other_id) AND a.revoked_at IS NULL
  ), pairs AS (
    -- One row per match even when reviewed identity paths find more than one entry.
    SELECT DISTINCT ON (me.match_id) me.*, other.session_player_id AS other_entry_id,
      other.team AS other_team
    FROM identified_facts me
    JOIN identified_facts other
      ON other.club_id = me.club_id AND other.session_id = me.session_id
      AND other.match_id = me.match_id AND other.session_player_id <> me.session_player_id
    WHERE p_viewer_id <> p_other_id
      AND me.identity_id = p_viewer_id AND other.identity_id = p_other_id
      AND me.full_participation AND other.full_participation
      AND me.standard_match AND other.standard_match
      AND me.format IN ('singles', 'doubles') AND other.format = me.format
    ORDER BY me.match_id, me.session_player_id, other.session_player_id
  )
  SELECT me.match_id, me.format, me.team = me.other_team, me.team = me.winning_team,
    me.team, me.team_a_score, me.team_b_score,
    COALESCE(m.ended_at, d.confirmed_at), s.id, s.title, c.id, c.name,
    sides.mine, sides.theirs
  FROM pairs me
  JOIN public.queue_sessions s ON s.club_id = me.club_id AND s.id = me.session_id
  JOIN public.session_finalizations z ON z.club_id = s.club_id AND z.session_id = s.id
  JOIN public.matches m
    ON m.club_id = me.club_id AND m.session_id = me.session_id AND m.id = me.match_id
  JOIN public.match_decisions d
    ON d.club_id = me.club_id AND d.session_id = me.session_id AND d.match_id = me.match_id
  JOIN public.clubs c ON c.id = s.club_id
  CROSS JOIN LATERAL (
    SELECT
      jsonb_agg(person.dto ORDER BY person.entry_id <> me.session_player_id, person.entry_id)
        FILTER (WHERE person.team = me.team) AS mine,
      jsonb_agg(person.dto ORDER BY person.entry_id <> me.other_entry_id, person.entry_id)
        FILTER (WHERE person.team <> me.team) AS theirs
    FROM (
      SELECT f.session_player_id AS entry_id, f.team,
        jsonb_build_object(
          'id', f.session_player_id,
          'playerId', COALESCE(f.player_id_at_finalization, attribution.player_id),
          'name', COALESCE(NULLIF(p.nickname, ''), p.full_name, e.name_snapshot),
          'pictureName', COALESCE(p.full_name, e.name_snapshot),
          'pictureUrl', p.avatar_ref,
          'level', level.code,
          'games', summary.full_games
        ) AS dto
      FROM public.player_match_facts f
      JOIN public.session_players e
        ON e.club_id = f.club_id AND e.session_id = f.session_id AND e.id = f.session_player_id
      JOIN public.skill_levels level ON level.id = f.skill_level_snapshot_id
      -- Session summaries are committed atomically with facts; full_games already applies
      -- the existing substitution-credit rule and includes fun games in the session badge.
      JOIN public.club_session_player_summaries summary
        ON summary.club_id = f.club_id AND summary.session_id = f.session_id
        AND summary.session_player_id = f.session_player_id
      LEFT JOIN LATERAL (
        SELECT a.player_id
        FROM public.player_history_attributions a
        WHERE a.club_id = f.club_id AND a.club_player_id = f.club_player_id
          AND a.revoked_at IS NULL
        ORDER BY a.confirmed_at DESC, a.id
        LIMIT 1
      ) attribution ON true
      LEFT JOIN public.players p ON p.id = COALESCE(f.player_id_at_finalization, attribution.player_id)
      WHERE f.club_id = me.club_id AND f.session_id = me.session_id AND f.match_id = me.match_id
        AND f.session_player_id = ANY (
          ARRAY[me.session_player_id] || me.partner_entry_ids || me.opponent_entry_ids
        )
    ) person
  ) sides
  WHERE s.state = 'completed' AND s.finalized_at IS NOT NULL AND z.committed_at IS NOT NULL
    AND m.state = 'completed' AND m.format = me.format
    AND d.kind = 'completed' AND d.winning_team = me.winning_team
    AND jsonb_array_length(sides.mine) = CASE WHEN me.format = 'singles' THEN 1 ELSE 2 END
    AND jsonb_array_length(sides.theirs) = CASE WHEN me.format = 'singles' THEN 1 ELSE 2 END
  ORDER BY COALESCE(m.ended_at, d.confirmed_at) DESC, me.match_id;
$function$;

REVOKE ALL ON FUNCTION public.rotra_player_compare(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Deployment sign-off must identify the actual DATABASE_URL runtime role and grant only that
-- role EXECUTE, as for rotra_next_player_sequence. Do not guess a role or expose this via RPC.
-- GRANT EXECUTE ON FUNCTION public.rotra_player_compare(uuid, uuid) TO "<runtime_role>";
