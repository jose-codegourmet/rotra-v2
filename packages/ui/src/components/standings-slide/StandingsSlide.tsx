import { cn } from '@rotra/ui/cn'
import { ResultSlideFrame, type ResultSlideFrameProps } from '@rotra/ui/result-slide-frame'
import { formatStandingsGames, StandingsFaces, tiedNames } from '@rotra/ui/standings-faces'

export type StandingsSlideRow = {
  /** Stable row id; only needed to be matched by `highlightRowId` */
  id?: string
  /** Standings position, 1-based; players with the same wins and losses share it (1, 1, 2) */
  position: number
  name: string
  wins: number
  losses: number
  games: number
  /** The player's picture; initials show without it */
  pictureUrl?: string | null
}

export type StandingsSlideProps = Omit<ResultSlideFrameProps, 'title' | 'children'> & {
  /** Players with at least one counted game, already ordered (Q08.4 computes this) */
  rows: StandingsSlideRow[]
  /** The viewer's own row on the public page: accent-subtle background, bold, aria-current */
  highlightRowId?: string
  /** One downloaded image of several: the title reads "Standings · 1 of 3" */
  page?: { n: number; of: number }
}

const TH = 'px-1.5 py-1 text-left text-[11px] tracking-[0.6px] text-fg2 uppercase'
const TD = 'border-b border-border px-1.5 py-[7px] align-middle'
const NUM = 'w-[42px] text-right'

/** One row per position: consecutive rows that share a position, in order. */
function byPosition(rows: StandingsSlideRow[]) {
  const groups: StandingsSlideRow[][] = []
  for (const row of rows) {
    const last = groups.at(-1)
    if (last && last[0]?.position === row.position) last.push(row)
    else groups.push([row])
  }
  return groups
}

/**
 * Slide 1 — Standings: the prototype's .st-table (#, Player, W, L, G) inside the result slide
 * frame, with tabular numbers and the leader in accent. One row per position (owner, November 25,
 * 2026): a shared position stacks its players' faces (at most four; more show three and "+N") and
 * lists their names, "A & B" or "A, B, C"; G shows a range when counted games differ inside it.
 * `highlightRowId` marks the viewer's own position on the public page. Read-only; shows the empty
 * copy when no counted games were recorded. The same slide is each downloaded standings image.
 */
export function StandingsSlide({ rows, highlightRowId, page, ...frame }: StandingsSlideProps) {
  const title = page && page.of > 1 ? `Standings · ${page.n} of ${page.of}` : 'Standings'
  return (
    <ResultSlideFrame {...frame} title={title}>
      {rows.length ? (
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border-strong">
              <th scope="col" className={TH}>
                #
              </th>
              <th scope="col" className={TH}>
                Player
              </th>
              <th scope="col" className={cn(TH, NUM)}>
                W
              </th>
              <th scope="col" className={cn(TH, NUM)}>
                L
              </th>
              <th scope="col" className={cn(TH, NUM)}>
                G
              </th>
            </tr>
          </thead>
          <tbody>
            {byPosition(rows).map((group) => {
              const first = group[0] as StandingsSlideRow
              const own = highlightRowId !== undefined && group.some((r) => r.id === highlightRowId)
              const games = group.map((r) => r.games)
              return (
                <tr
                  key={`${first.position}-${first.name}`}
                  aria-current={own ? 'true' : undefined}
                  className={cn(
                    first.position === 1 && 'font-bold text-accent',
                    own && 'bg-accent-subtle font-bold',
                  )}
                >
                  <td className={TD}>{first.position}</td>
                  <td className={TD}>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <StandingsFaces
                        size={28}
                        limit={4}
                        faces={group.map((r, index) => ({
                          id: r.id ?? `${r.position}-${index}`,
                          name: r.name,
                          pictureUrl: r.pictureUrl,
                        }))}
                      />
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {tiedNames(group.map((r) => r.name))}
                      </span>
                    </span>
                  </td>
                  <td className={cn(TD, NUM)}>{first.wins}</td>
                  <td className={cn(TD, NUM)}>{first.losses}</td>
                  <td className={cn(TD, NUM)}>
                    {formatStandingsGames({
                      min: Math.min(...games),
                      max: Math.max(...games),
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="px-3 py-6 text-center text-sm text-fg2">
          No counted games were recorded in this session.
        </p>
      )}
    </ResultSlideFrame>
  )
}
