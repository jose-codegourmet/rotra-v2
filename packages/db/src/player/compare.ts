import 'server-only'
import type {
  ComparePlayer,
  PlayerCompare,
  PlayerCompareFilter,
  PlayerCompareOptions,
  PlayerCompareStats,
  SharedPlayerGame,
} from '@rotra/data/player-compare/types'
import type { PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { ServiceError } from '../service/errors'
import { readMyLeaderboardPosition } from './leaderboard'
import { readPublicProfile } from './profile'
import { readPlayerMatchHistory, readPlayerRank } from './projections'

const PAGE_SIZE = 3
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ComparePageRow = {
  all_count: number
  h2h_count: number
  together_count: number
  all_my_wins: number
  h2h_my_wins: number
  together_my_wins: number
  page: number
  total: number
  games: SharedPlayerGame[]
}

const percentage = (wins: number, games: number) => (games ? Math.round((wins / games) * 100) : null)

function stats(games: number, myWins: number, otherWins: number): PlayerCompareStats {
  return {
    games,
    myWins,
    otherWins,
    myWinRate: percentage(myWins, games),
    otherWinRate: percentage(otherWins, games),
  }
}

async function comparePlayer(playerId: string): Promise<ComparePlayer> {
  const [profile, rank, position, history] = await Promise.all([
    readPublicProfile(playerId),
    readPlayerRank(playerId),
    readMyLeaderboardPosition(playerId),
    readPlayerMatchHistory(playerId),
  ])
  const games = history
    .flatMap((session) => session.games)
    .filter(
      (game) =>
        game.counting === 'counted' && (game.format === 'singles' || game.format === 'doubles'),
    )
  return {
    profile: {
      playerId: profile.playerId,
      fullName: profile.fullName,
      nickname: profile.nickname,
      picture: profile.picture,
    },
    rank: rank ? { ...rank, position } : null,
    overallWinRate: percentage(games.filter((game) => game.result === 'won').length, games.length),
  }
}

/**
 * Signed-in P-COMPARE. The caller supplies only the other player; the verified account identifies
 * the viewer. Rank readers are reused unchanged, with their existing provisional/null behavior.
 * One SQL function reads shared final matches; this wrapper aggregates the full record while
 * returning only three game rows. No projection job, cron or finalization side effect is involved.
 */
export async function readPlayerCompare(
  context: PlayerContext,
  otherId: string,
  options: PlayerCompareOptions = {},
): Promise<PlayerCompare | null> {
  if (!UUID.test(otherId)) throw new ServiceError('not_found')
  if (context.playerId === otherId) return null
  const filter: PlayerCompareFilter = options.filter ?? 'all'
  const requested = options.page ?? 0
  if (
    !['all', 'h2h', 'together'].includes(filter) ||
    !Number.isSafeInteger(requested) ||
    requested < 0
  )
    throw new ServiceError('invalid')
  const [viewer, other, rows] = await Promise.all([
    comparePlayer(context.playerId),
    comparePlayer(otherId),
    prisma.$queryRaw<ComparePageRow[]>`
      WITH shared AS MATERIALIZED (
        SELECT * FROM public.rotra_player_compare(${context.playerId}::uuid, ${otherId}::uuid)
      ), totals AS (
        SELECT count(*)::integer AS all_count,
          (count(*) FILTER (WHERE NOT together))::integer AS h2h_count,
          (count(*) FILTER (WHERE together))::integer AS together_count,
          (count(*) FILTER (WHERE me_won))::integer AS all_my_wins,
          (count(*) FILTER (WHERE NOT together AND me_won))::integer AS h2h_my_wins,
          (count(*) FILTER (WHERE together AND me_won))::integer AS together_my_wins
        FROM shared
      ), filtered AS (
        SELECT * FROM shared
        WHERE ${filter} = 'all' OR (${filter} = 'h2h' AND NOT together)
          OR (${filter} = 'together' AND together)
      ), paging AS (
        SELECT count(*)::integer AS total,
          least(${requested}::bigint, greatest(0, (count(*) - 1) / ${PAGE_SIZE}))::integer AS page
        FROM filtered
      ), page_rows AS (
        SELECT * FROM filtered
        ORDER BY finished_at DESC, match_id
        LIMIT ${PAGE_SIZE} OFFSET (SELECT page::bigint * ${PAGE_SIZE} FROM paging)
      )
      SELECT totals.*, paging.page, paging.total,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', match_id,
            'format', format,
            'mine', mine,
            'theirs', theirs,
            'meWon', me_won,
            'together', together,
            'score', CASE WHEN team_a_score IS NULL OR team_b_score IS NULL THEN NULL
              WHEN viewer_team = 'A' THEN team_a_score::text || '–' || team_b_score::text
              ELSE team_b_score::text || '–' || team_a_score::text END,
            'finishedAt', finished_at,
            'sessionId', session_id,
            'sessionTitle', session_title,
            'clubId', club_id,
            'clubName', club_name
          ) ORDER BY finished_at DESC, match_id) FROM page_rows
        ), '[]'::jsonb) AS games
      FROM totals CROSS JOIN paging
    `,
  ])
  const row = rows[0]
  if (!row) throw new ServiceError('unavailable')
  return {
    viewer,
    other,
    counts: { all: row.all_count, h2h: row.h2h_count, together: row.together_count },
    stats: {
      all: stats(
        row.all_count,
        row.all_my_wins,
        row.h2h_count - row.h2h_my_wins + row.together_my_wins,
      ),
      h2h: stats(row.h2h_count, row.h2h_my_wins, row.h2h_count - row.h2h_my_wins),
      together: stats(row.together_count, row.together_my_wins, row.together_my_wins),
    },
    filter,
    page: row.page,
    pageSize: PAGE_SIZE,
    total: row.total,
    games: row.games,
  }
}
